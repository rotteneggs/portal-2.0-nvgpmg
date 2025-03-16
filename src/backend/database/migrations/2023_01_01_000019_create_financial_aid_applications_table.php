<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to create the financial_aid_applications table.
     *
     * This table stores information about financial aid requests submitted by applicants,
     * including aid types, financial data, submission and review status.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('financial_aid_applications', function (Blueprint $table) {
            // Primary key
            $table->id();
            
            // Foreign keys
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('reviewed_by_user_id')->nullable();
            
            // Data fields
            $table->string('aid_type', 50);
            $table->json('financial_data');
            $table->string('status', 50)->default('submitted');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
            $table->foreign('reviewed_by_user_id')->references('id')->on('users');
            
            // Indexes for faster lookups
            $table->index('user_id');
            $table->index('application_id');
            $table->index('aid_type');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations by dropping the financial_aid_applications table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('financial_aid_applications');
    }
};