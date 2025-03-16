<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateApplicationsTable extends Migration
{
    /**
     * Run the migrations to create the applications table.
     * This table stores essential information about student applications.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('applications', function (Blueprint $table) {
            // Primary key
            $table->bigIncrements('id');
            
            // Foreign key to the users table, identifying the applicant
            $table->unsignedBigInteger('user_id');
            
            // Application details
            $table->string('application_type', 50); // undergraduate, graduate, transfer, etc.
            $table->string('academic_term', 50);    // Fall, Spring, Summer
            $table->string('academic_year', 9);     // e.g., 2023-2024
            
            // Current status - nullable as it might be set after initial creation
            $table->unsignedBigInteger('current_status_id')->nullable();
            
            // JSON field to store flexible application form data
            $table->json('application_data');
            
            // Submission tracking
            $table->boolean('is_submitted')->default(false);
            $table->timestamp('submitted_at')->nullable();
            
            // Standard timestamps for creation and updates
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            $table->foreign('current_status_id')
                  ->references('id')
                  ->on('application_statuses')
                  ->onDelete('set null');

            // Indexes for optimizing common queries
            $table->index('user_id');
            $table->index(['application_type', 'academic_term', 'academic_year']);
            $table->index('current_status_id');
            $table->index(['is_submitted', 'submitted_at']);
        });
    }

    /**
     * Reverse the migrations by dropping the applications table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('applications');
    }
}