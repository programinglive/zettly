<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserSerializationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_two_factor_seed_and_recovery_codes_never_reach_the_client(): void
    {
        // HandleInertiaRequests shares the whole User model with every page, and
        // GET /api/user returns it too. two_factor_secret therefore shipped to the
        // browser; it was harmless only because nobody had enabled 2FA yet.
        $user = User::factory()->create();
        $user->forceFill([
            'two_factor_secret' => 'TOTP-SEED-VALUE',
            'two_factor_recovery_codes' => 'RECOVERY-CODES-VALUE',
        ])->save();

        $array = $user->fresh()->toArray();
        $this->assertArrayNotHasKey('two_factor_secret', $array);
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $array);

        $this->actingAs($user)
            ->get('/journal')
            ->assertOk()
            ->assertDontSee('TOTP-SEED-VALUE', false)
            ->assertDontSee('RECOVERY-CODES-VALUE', false);
    }

    public function test_role_cannot_be_mass_assigned(): void
    {
        // `role` is the super-admin flag. It was fillable even though the only
        // writer is User::assignRole(), which uses forceFill.
        $user = User::create([
            'name' => 'Mallory',
            'email' => 'mallory@example.com',
            'password' => 'secret-password',
            'role' => UserRole::SUPER_ADMIN->value,
        ]);

        $this->assertSame(UserRole::USER, $user->fresh()->role);
    }

    public function test_assign_role_still_works_after_removing_it_from_fillable(): void
    {
        $user = User::factory()->create();

        $user->assignRole(UserRole::SUPER_ADMIN);

        $this->assertSame(UserRole::SUPER_ADMIN, $user->fresh()->role);
    }

    public function test_the_signed_in_user_props_still_carry_role_for_the_ui(): void
    {
        // Hiding is not the same as removing: the layout reads auth.user.role.
        $admin = User::factory()->create(['role' => UserRole::SUPER_ADMIN->value]);

        $this->actingAs($admin)
            ->get('/journal')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user.role', UserRole::SUPER_ADMIN->value)
                ->missing('auth.user.two_factor_secret')
                ->missing('auth.user.two_factor_recovery_codes')
            );
    }
}
