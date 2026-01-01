<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get or create test users
        $john = User::firstOrCreate(
            ['email' => 'john@example.com'],
            [
                'name' => 'John Doe',
                'password' => bcrypt('password'),
            ]
        );

        $jane = User::firstOrCreate(
            ['email' => 'jane@example.com'],
            [
                'name' => 'Jane Smith',
                'password' => bcrypt('password'),
            ]
        );

        $bob = User::firstOrCreate(
            ['email' => 'bob@example.com'],
            [
                'name' => 'Bob Johnson',
                'password' => bcrypt('password'),
            ]
        );

        // Create organizations
        $acmeOrg = Organization::firstOrCreate(
            ['slug' => 'acme-corp-demo'],
            [
                'created_by' => $john->id,
                'name' => 'Acme Corp',
                'description' => 'A sample organization for team collaboration',
                'logo_url' => 'https://via.placeholder.com/100?text=Acme',
            ]
        );

        $techOrg = Organization::firstOrCreate(
            ['slug' => 'tech-startup-demo'],
            [
                'created_by' => $jane->id,
                'name' => 'Tech Startup',
                'description' => 'Building the future of technology',
                'logo_url' => 'https://via.placeholder.com/100?text=Tech',
            ]
        );

        // Add members to Acme Corp
        OrganizationMember::firstOrCreate(
            ['organization_id' => $acmeOrg->id, 'user_id' => $john->id],
            ['role' => 'admin']
        );

        OrganizationMember::firstOrCreate(
            ['organization_id' => $acmeOrg->id, 'user_id' => $jane->id],
            ['role' => 'member']
        );

        OrganizationMember::firstOrCreate(
            ['organization_id' => $acmeOrg->id, 'user_id' => $bob->id],
            ['role' => 'member']
        );

        // Add members to Tech Startup
        OrganizationMember::firstOrCreate(
            ['organization_id' => $techOrg->id, 'user_id' => $jane->id],
            ['role' => 'admin']
        );

        OrganizationMember::firstOrCreate(
            ['organization_id' => $techOrg->id, 'user_id' => $john->id],
            ['role' => 'member']
        );

        $this->command->info('Organizations seeded successfully!');
    }
}
