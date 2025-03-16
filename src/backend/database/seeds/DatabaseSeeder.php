<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Execute the database seeds.
     *
     * This method orchestrates the execution of all other seeders in the
     * correct order to properly initialize the database with required data.
     * Roles and permissions must be seeded first, as they are required by
     * the workflow templates and other data that depends on them.
     *
     * @return void
     */
    public function run()
    {
        // Wrap all seeding operations in a transaction to ensure database integrity
        DB::transaction(function () {
            // First seed roles and permissions since they are required by workflow templates
            $this->call(RolesPermissionsSeeder::class);
            
            // Then seed workflow templates that use the roles for assigned permissions
            $this->call(WorkflowTemplatesSeeder::class);
            
            // Log the completion of the seeding process
            $this->command->info('Database seeded successfully!');
        });
    }
}