<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationUITest extends TestCase
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
    public function organizations_index_page_renders_with_proper_layout()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create([
                'name' => 'Test Organization',
                'description' => 'Test Description',
                'logo_url' => 'https://example.com/logo.png',
            ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.index'));

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Index')
                ->has('organizations.data', 1)
                ->where('organizations.data.0.name', 'Test Organization')
                ->where('organizations.data.0.description', 'Test Description')
                ->where('organizations.data.0.logo_url', 'https://example.com/logo.png')
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_index_shows_member_count()
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

        $response = $this->actingAs($this->user)
            ->get(route('organizations.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('organizations.data.0.users_count', 2)
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_index_shows_creation_date()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('organizations.data.0.created_at')
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_show_page_displays_all_members()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        $admin = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $member = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.show', $organization));

        $response->assertInertia(fn ($page) => $page
            ->component('Organizations/Show')
            ->has('members', 2)
            ->where('members.0.role', 'admin')
            ->where('members.1.role', 'member')
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_show_page_indicates_admin_status()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.show', $organization));

        $response->assertInertia(fn ($page) => $page
            ->where('isAdmin', true)
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_show_page_indicates_member_status()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $response = $this->actingAs($this->otherUser)
            ->get(route('organizations.show', $organization));

        $response->assertInertia(fn ($page) => $page
            ->where('isAdmin', false)
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_settings_page_shows_organization_details()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create([
                'name' => 'Test Org',
                'description' => 'Test Description',
                'logo_url' => 'https://example.com/logo.png',
            ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.settings', $organization));

        $response->assertInertia(fn ($page) => $page
            ->component('Organizations/Settings')
            ->where('organization.name', 'Test Org')
            ->where('organization.description', 'Test Description')
            ->where('organization.logo_url', 'https://example.com/logo.png')
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_settings_page_shows_creator_info()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.settings', $organization));

        $response->assertInertia(fn ($page) => $page
            ->has('organization.creator')
            ->where('organization.creator.id', $this->user->id)
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_settings_page_shows_all_members_with_roles()
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

        $response = $this->actingAs($this->user)
            ->get(route('organizations.settings', $organization));

        $response->assertInertia(fn ($page) => $page
            ->has('members', 2)
            ->where('members.0.user.id', $this->user->id)
            ->where('members.0.role', 'admin')
            ->where('members.1.user.id', $this->otherUser->id)
            ->where('members.1.role', 'member')
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_create_page_renders()
    {
        $response = $this->actingAs($this->user)
            ->get(route('organizations.create'));

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Create')
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_edit_page_renders_for_admin()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.edit', $organization));

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Edit')
                ->where('organization.id', $organization->id)
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_edit_page_forbidden_for_non_admin()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create();

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);

        $response = $this->actingAs($this->otherUser)
            ->get(route('organizations.edit', $organization));

        $response->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organizations_index_empty_state_renders()
    {
        $response = $this->actingAs($this->user)
            ->get(route('organizations.index'));

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Organizations/Index')
                ->where('organizations.data', [])
            );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organization_logo_url_is_nullable()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create([
                'logo_url' => null,
            ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('organizations.data.0.logo_url', null)
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function organization_description_is_nullable()
    {
        $organization = Organization::factory()
            ->for($this->user, 'creator')
            ->create([
                'description' => null,
            ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('organizations.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('organizations.data.0.description', null)
        );
    }
}
