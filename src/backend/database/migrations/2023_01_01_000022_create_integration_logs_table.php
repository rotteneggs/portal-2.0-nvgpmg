<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to create the integration_logs table.
     * 
     * This table records detailed information about integration activities with external systems
     * such as SIS, LMS, payment gateways, and other third-party services. It stores operation
     * details, request/response data, status, and error messages for monitoring, troubleshooting,
     * and auditing purposes.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('integration_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_id')->constrained()->onDelete('cascade');
            $table->string('operation', 100);
            $table->string('status', 50);
            $table->json('request_data')->nullable();
            $table->json('response_data')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();
            
            // Indexes for improved query performance
            $table->index('operation');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations by dropping the integration_logs table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('integration_logs');
    }
};