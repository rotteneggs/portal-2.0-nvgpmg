<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to create the integrations table.
     *
     * This table stores configuration and connection details for external systems
     * such as Student Information Systems (SIS), Learning Management Systems (LMS),
     * payment gateways, and other third-party services.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('integrations', function (Blueprint $table) {
            // Primary key
            $table->id();
            
            // Store the name of the external system (e.g., "Banner SIS", "Canvas LMS")
            $table->string('system_name', 100);
            
            // Type of integration (e.g., "sis", "lms", "payment", "email")
            $table->string('integration_type', 50);
            
            // JSON field to store connection details, API keys, endpoints, and settings
            $table->json('configuration');
            
            // Flag to indicate whether the integration is currently active
            $table->boolean('is_active')->default(true);
            
            // Track when the integration was last synchronized with the external system
            $table->timestamp('last_sync_at')->nullable();
            
            // Standard Laravel timestamps
            $table->timestamps();
            
            // Add indexes for efficient lookups and filtering
            $table->index('system_name');
            $table->index('integration_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations by dropping the integrations table.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('integrations');
    }
};