<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function user_can_view_organizations_index()
    {
        $this->actingAs($this->user)
            ->get(route('organizations.index'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Index')
                ->has('organizations')
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function user_can_create_organization()
    {
        $response = $this->actingAs($this->user)
            ->post(route('organizations.store'), [
                'name' => 'Test Organization',
                'description' => 'A test organization',
                'logo_url' => 'https://example.com/logo.png',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('organizations', [
            'name' => 'Test Organization',
            'description' => 'A test organization',
            'created_by' => $this->user->id,
        ]);

        // Verify creator is added as admin
        $organization = Organization::where('name', 'Test Organization')->first();
        $this->assertTrue(
            $organization->members()
                ->where('user_id', $this->user->id)
                ->where('role', 'admin')
                ->exists()
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function creator_is_automatically_admin()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $member = $organization->members()
            ->where('user_id', $this->user->id)
            ->first();

        $this->assertNotNull($member);
        $this->assertEquals('admin', $member->role);
        $this->assertTrue($member->isAdmin());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organization_name_is_required()
    {
        $this->actingAs($this->user)
            ->post(route('organizations.store'), [
                'name' => '',
                'description' => 'A test organization',
            ])
            ->assertSessionHasErrors('name');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function user_can_view_organization()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->get(route('organizations.show', $organization))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Show')
                ->where('organization.id', $organization->id)
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function non_member_cannot_view_organization()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $this->actingAs($this->otherUser)
            ->get(route('organizations.show', $organization))
            ->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_can_invite_user()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->post(route('organizations.invite', $organization), [
                'email' => $this->otherUser->email,
            ])
            ->assertRedirect();

        $this->assertTrue(
            $organization->users()
                ->where('user_id', $this->otherUser->id)
                ->exists()
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function non_admin_cannot_invite_user()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $anotherUser = User::factory()->create();

        $this->actingAs($this->otherUser)
            ->post(route('organizations.invite', $organization), [
                'email' => $anotherUser->email,
            ])
            ->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function cannot_invite_user_already_member()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $this->actingAs($this->user)
            ->post(route('organizations.invite', $organization), [
                'email' => $this->otherUser->email,
            ])
            ->assertSessionHas('error');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_can_remove_member()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $adminMember = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $memberToRemove = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $this->actingAs($this->user)
            ->delete(route('organizations.remove-member', [$organization, $memberToRemove]))
            ->assertRedirect();

        $this->assertDatabaseMissing('organization_members', [
            'id' => $memberToRemove->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function cannot_remove_last_admin()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $adminMember = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->delete(route('organizations.remove-member', [$organization, $adminMember]))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('organization_members', [
            'id' => $adminMember->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function user_can_leave_organization()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $member = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $this->actingAs($this->otherUser)
            ->post(route('organizations.leave', $organization))
            ->assertRedirect(route('organizations.index'));

        $this->assertDatabaseMissing('organization_members', [
            'id' => $member->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_cannot_leave_if_last_admin()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $adminMember = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->post(route('organizations.leave', $organization))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('organization_members', [
            'id' => $adminMember->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_can_update_organization()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->patch(route('organizations.update', $organization), [
                'name' => 'Updated Name',
                'description' => 'Updated description',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Updated Name',
            'description' => 'Updated description',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_can_delete_organization()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->delete(route('organizations.destroy', $organization))
            ->assertRedirect(route('organizations.index'));

        $this->assertSoftDeleted('organizations', [
            'id' => $organization->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_can_view_organization_settings()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $this->actingAs($this->user)
            ->get(route('organizations.settings', $organization))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Settings')
                ->where('organization.id', $organization->id)
                ->where('isAdmin', true)
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function non_admin_cannot_view_organization_settings()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $this->actingAs($this->otherUser)
            ->get(route('organizations.settings', $organization))
            ->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function admin_can_update_member_role()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $adminMember = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $memberToPromote = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $this->actingAs($this->user)
            ->patch(route('organizations.update-member-role', [$organization, $memberToPromote]), [
                'role' => 'admin',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('organization_members', [
            'id' => $memberToPromote->id,
            'role' => 'admin',
        ]);
    }
}
