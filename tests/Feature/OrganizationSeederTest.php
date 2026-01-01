<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Database\Seeders\OrganizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_seeder_creates_organizations(): void
    {
        $this->seed(OrganizationSeeder::class);

        $this->assertDatabaseHas('organizations', [
            'slug' => 'acme-corp-demo',
            'name' => 'Acme Corp',
        ]);

        $this->assertDatabaseHas('organizations', [
            'slug' => 'tech-startup-demo', 
            'name' => 'Tech Startup',
        ]);
    }

    public function test_organization_seeder_creates_members(): void
    {
        $this->seed(OrganizationSeeder::class);

        $acmeOrg = Organization::where('slug', 'acme-corp-demo')->first();
        $techOrg = Organization::where('slug', 'tech-startup-demo')->first();

        // Test Acme Corp members
        $this->assertEquals(3, $acmeOrg->members()->count());
        
        $john = User::where('email', 'john@example.com')->first();
        $this->assertTrue(
            $acmeOrg->members()->where('user_id', $john->id)->where('role', 'admin')->exists()
        );

        // Test Tech Startup members  
        $this->assertEquals(2, $techOrg->members()->count());
        
        $jane = User::where('email', 'jane@example.com')->first();
        $this->assertTrue(
            $techOrg->members()->where('user_id', $jane->id)->where('role', 'admin')->exists()
        );
    }

    public function test_organization_seeder_is_idempotent(): void
    {
        // Run seeder twice
        $this->seed(OrganizationSeeder::class);
        $this->seed(OrganizationSeeder::class);

        // Should still only have 2 organizations
        $this->assertEquals(2, Organization::count());
        
        // Should still only have the expected members
        $acmeOrg = Organization::where('slug', 'acme-corp-demo')->first();
        $this->assertEquals(3, $acmeOrg->members()->count());
    }
}
