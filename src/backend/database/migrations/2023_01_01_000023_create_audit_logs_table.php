<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAuditLogsTable extends Migration
{
    /**
     * Run the migrations to create the audit_logs table.
     * 
     * This table provides comprehensive tracking of system actions, data changes,
     * and security events for compliance, monitoring, and troubleshooting purposes.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 100);
            $table->string('resource_type', 100);
            $table->unsignedBigInteger('resource_id');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at');
            
            // Foreign keys
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            
            // Indexes for faster querying
            $table->index('user_id');
            $table->index(['resource_type', 'resource_id']);
            $table->index('action');
            $table->index('created_at');
        });
        
        // Note: In a production environment, table partitioning would be implemented
        // using raw SQL statements for efficient querying and data retention management:
        // 
        // DB::statement('ALTER TABLE audit_logs PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
        //     PARTITION p0 VALUES LESS THAN (UNIX_TIMESTAMP("2023-01-01")),
        //     PARTITION p1 VALUES LESS THAN (UNIX_TIMESTAMP("2023-04-01")),
        //     PARTITION p2 VALUES LESS THAN (UNIX_TIMESTAMP("2023-07-01")),
        //     PARTITION p3 VALUES LESS THAN (UNIX_TIMESTAMP("2023-10-01")),
        //     PARTITION p4 VALUES LESS THAN (UNIX_TIMESTAMP("2024-01-01")),
        //     PARTITION p_future VALUES LESS THAN MAXVALUE
        // )');
    }

    /**
     * Reverse the migrations by dropping the audit_logs table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('audit_logs');
    }
}