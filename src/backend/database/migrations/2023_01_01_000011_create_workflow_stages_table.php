<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWorkflowStagesTable extends Migration
{
    /**
     * Run the migrations to create the workflow_stages table.
     * This table stores the individual stages within an admissions workflow,
     * representing distinct phases in the application process with specific
     * requirements, actions, and role assignments.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('workflow_stages', function (Blueprint $table) {
            // Primary key
            $table->id();
            
            // Foreign key to workflows table - identifies which workflow this stage belongs to
            $table->unsignedBigInteger('workflow_id');
            
            // Stage details
            $table->string('name', 100); // Name of the stage (e.g., "Document Verification", "Review")
            $table->text('description')->nullable(); // Detailed description of the stage
            $table->integer('sequence'); // Order of the stage within the workflow
            
            // JSON fields for stage requirements and actions
            $table->json('required_documents')->nullable(); // List of document types required in this stage
            $table->json('required_actions')->nullable(); // Actions that must be completed in this stage
            $table->json('notification_triggers')->nullable(); // Events that trigger notifications
            
            // Role assignment (optional) - identifies which role is responsible for this stage
            $table->unsignedBigInteger('assigned_role_id')->nullable();
            
            // Timestamps for record keeping
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('workflow_id')
                  ->references('id')
                  ->on('workflows')
                  ->onDelete('cascade'); // When a workflow is deleted, also delete its stages
                  
            $table->foreign('assigned_role_id')
                  ->references('id')
                  ->on('roles')
                  ->onDelete('set null'); // When a role is deleted, set to null in stages
            
            // Indexes for performance
            $table->index('workflow_id'); // Speed up queries filtering by workflow
            $table->index(['workflow_id', 'sequence']); // Speed up queries ordering stages by sequence within a workflow
            $table->index('assigned_role_id'); // Speed up queries filtering by assigned role
        });
    }

    /**
     * Reverse the migrations by dropping the workflow_stages table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('workflow_stages');
    }
}