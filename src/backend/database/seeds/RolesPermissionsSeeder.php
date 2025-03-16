<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder; // Laravel 10.0
use Illuminate\Support\Facades\DB; // Laravel 10.0
use App\Models\Role;
use App\Models\Permission;

class RolesPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        DB::transaction(function () {
            $this->createPermissions();
            $this->createRoles();
            $this->assignPermissionsToRoles();
            
            $this->command->info('Roles and permissions seeded successfully!');
        });
    }

    /**
     * Create all the permissions needed for the system.
     *
     * @return void
     */
    private function createPermissions()
    {
        // Define all permissions
        $permissions = [
            // Applications permissions
            ['name' => 'applications.view', 'resource' => 'applications', 'action' => 'view', 'description' => 'View applications'],
            ['name' => 'applications.create', 'resource' => 'applications', 'action' => 'create', 'description' => 'Create applications'],
            ['name' => 'applications.update', 'resource' => 'applications', 'action' => 'update', 'description' => 'Update applications'],
            ['name' => 'applications.delete', 'resource' => 'applications', 'action' => 'delete', 'description' => 'Delete applications'],
            ['name' => 'applications.submit', 'resource' => 'applications', 'action' => 'submit', 'description' => 'Submit applications'],
            ['name' => 'applications.approve', 'resource' => 'applications', 'action' => 'approve', 'description' => 'Approve applications'],
            ['name' => 'applications.reject', 'resource' => 'applications', 'action' => 'reject', 'description' => 'Reject applications'],

            // Documents permissions
            ['name' => 'documents.view', 'resource' => 'documents', 'action' => 'view', 'description' => 'View documents'],
            ['name' => 'documents.upload', 'resource' => 'documents', 'action' => 'upload', 'description' => 'Upload documents'],
            ['name' => 'documents.verify', 'resource' => 'documents', 'action' => 'verify', 'description' => 'Verify documents'],
            ['name' => 'documents.delete', 'resource' => 'documents', 'action' => 'delete', 'description' => 'Delete documents'],

            // Users permissions
            ['name' => 'users.view', 'resource' => 'users', 'action' => 'view', 'description' => 'View users'],
            ['name' => 'users.create', 'resource' => 'users', 'action' => 'create', 'description' => 'Create users'],
            ['name' => 'users.update', 'resource' => 'users', 'action' => 'update', 'description' => 'Update users'],
            ['name' => 'users.delete', 'resource' => 'users', 'action' => 'delete', 'description' => 'Delete users'],

            // Roles permissions
            ['name' => 'roles.view', 'resource' => 'roles', 'action' => 'view', 'description' => 'View roles'],
            ['name' => 'roles.create', 'resource' => 'roles', 'action' => 'create', 'description' => 'Create roles'],
            ['name' => 'roles.update', 'resource' => 'roles', 'action' => 'update', 'description' => 'Update roles'],
            ['name' => 'roles.delete', 'resource' => 'roles', 'action' => 'delete', 'description' => 'Delete roles'],

            // Workflows permissions
            ['name' => 'workflows.view', 'resource' => 'workflows', 'action' => 'view', 'description' => 'View workflows'],
            ['name' => 'workflows.create', 'resource' => 'workflows', 'action' => 'create', 'description' => 'Create workflows'],
            ['name' => 'workflows.update', 'resource' => 'workflows', 'action' => 'update', 'description' => 'Update workflows'],
            ['name' => 'workflows.delete', 'resource' => 'workflows', 'action' => 'delete', 'description' => 'Delete workflows'],

            // Messages permissions
            ['name' => 'messages.view', 'resource' => 'messages', 'action' => 'view', 'description' => 'View messages'],
            ['name' => 'messages.send', 'resource' => 'messages', 'action' => 'send', 'description' => 'Send messages'],
            ['name' => 'messages.reply', 'resource' => 'messages', 'action' => 'reply', 'description' => 'Reply to messages'],

            // Payments permissions
            ['name' => 'payments.view', 'resource' => 'payments', 'action' => 'view', 'description' => 'View payments'],
            ['name' => 'payments.process', 'resource' => 'payments', 'action' => 'process', 'description' => 'Process payments'],
            ['name' => 'payments.refund', 'resource' => 'payments', 'action' => 'refund', 'description' => 'Refund payments'],

            // Reports permissions
            ['name' => 'reports.view', 'resource' => 'reports', 'action' => 'view', 'description' => 'View reports'],
            ['name' => 'reports.generate', 'resource' => 'reports', 'action' => 'generate', 'description' => 'Generate reports'],
            ['name' => 'reports.export', 'resource' => 'reports', 'action' => 'export', 'description' => 'Export reports'],

            // Settings permissions
            ['name' => 'settings.view', 'resource' => 'settings', 'action' => 'view', 'description' => 'View settings'],
            ['name' => 'settings.update', 'resource' => 'settings', 'action' => 'update', 'description' => 'Update settings'],

            // Financial aid permissions
            ['name' => 'financial_aid.view', 'resource' => 'financial_aid', 'action' => 'view', 'description' => 'View financial aid'],
            ['name' => 'financial_aid.apply', 'resource' => 'financial_aid', 'action' => 'apply', 'description' => 'Apply for financial aid'],
            ['name' => 'financial_aid.approve', 'resource' => 'financial_aid', 'action' => 'approve', 'description' => 'Approve financial aid'],
            ['name' => 'financial_aid.reject', 'resource' => 'financial_aid', 'action' => 'reject', 'description' => 'Reject financial aid'],
        ];

        // Create all permissions
        foreach ($permissions as $permission) {
            Permission::create($permission);
        }
    }

    /**
     * Create the system roles with appropriate descriptions.
     *
     * @return void
     */
    private function createRoles()
    {
        // Define all roles
        $roles = [
            [
                'name' => 'Administrator',
                'description' => 'Full system access including configuration',
                'is_system_role' => true
            ],
            [
                'name' => 'Staff',
                'description' => 'Manage applications, workflows, and communications',
                'is_system_role' => true
            ],
            [
                'name' => 'Reviewer',
                'description' => 'View and evaluate assigned applications',
                'is_system_role' => true
            ],
            [
                'name' => 'Student',
                'description' => 'Access personal records and student services',
                'is_system_role' => true
            ],
            [
                'name' => 'Applicant',
                'description' => 'Manage applications and communications',
                'is_system_role' => true
            ],
            [
                'name' => 'Public',
                'description' => 'Access public information only',
                'is_system_role' => true
            ]
        ];

        // Create all roles
        foreach ($roles as $role) {
            Role::create($role);
        }
    }

    /**
     * Assign the appropriate permissions to each role.
     *
     * @return void
     */
    private function assignPermissionsToRoles()
    {
        // Administrator role gets all permissions
        $administratorRole = Role::where('name', 'Administrator')->first();
        $allPermissions = Permission::pluck('id')->toArray();
        $administratorRole->syncPermissions($allPermissions);

        // Staff role permissions
        $staffRole = Role::where('name', 'Staff')->first();
        $staffPermissions = Permission::whereIn('name', [
            'applications.view', 'applications.update', 'applications.approve', 'applications.reject',
            'documents.view', 'documents.verify',
            'users.view',
            'messages.view', 'messages.send', 'messages.reply',
            'payments.view', 'payments.process',
            'reports.view', 'reports.generate',
            'financial_aid.view', 'financial_aid.approve', 'financial_aid.reject'
        ])->pluck('id')->toArray();
        $staffRole->syncPermissions($staffPermissions);

        // Reviewer role permissions
        $reviewerRole = Role::where('name', 'Reviewer')->first();
        $reviewerPermissions = Permission::whereIn('name', [
            'applications.view',
            'documents.view',
            'messages.view', 'messages.send', 'messages.reply'
        ])->pluck('id')->toArray();
        $reviewerRole->syncPermissions($reviewerPermissions);

        // Student role permissions
        $studentRole = Role::where('name', 'Student')->first();
        $studentPermissions = Permission::whereIn('name', [
            'applications.view',
            'documents.view', 'documents.upload',
            'messages.view', 'messages.send', 'messages.reply',
            'payments.view', 'payments.process',
            'financial_aid.view', 'financial_aid.apply'
        ])->pluck('id')->toArray();
        $studentRole->syncPermissions($studentPermissions);

        // Applicant role permissions
        $applicantRole = Role::where('name', 'Applicant')->first();
        $applicantPermissions = Permission::whereIn('name', [
            'applications.view', 'applications.create', 'applications.update', 'applications.submit',
            'documents.view', 'documents.upload',
            'messages.view', 'messages.send', 'messages.reply',
            'payments.view', 'payments.process',
            'financial_aid.view', 'financial_aid.apply'
        ])->pluck('id')->toArray();
        $applicantRole->syncPermissions($applicantPermissions);

        // Public role permissions
        $publicRole = Role::where('name', 'Public')->first();
        $publicPermissions = Permission::whereIn('name', [
            'applications.view' // Public can only view public application information
        ])->pluck('id')->toArray();
        $publicRole->syncPermissions($publicPermissions);
    }
}