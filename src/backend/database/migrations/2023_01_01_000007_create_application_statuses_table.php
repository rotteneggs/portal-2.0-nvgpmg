<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateApplicationStatusesTable extends Migration
{
    /**
     * Run the migrations to create the application_statuses table.
     *
     * This table stores the history of status changes for applications throughout
     * the admissions process, enabling real-time tracking of application progress.
     * Each record represents a point-in-time status change with information about
     * who created it and which workflow stage it relates to.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('application_statuses', function (Blueprint $table) {
            // Define primary key
            $table->bigIncrements('id');
            
            // Define foreign keys and relationships
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('workflow_stage_id')->nullable();
            $table->string('status', 50);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by_user_id');
            $table->timestamp('created_at');
            
            // Define foreign key constraints
            $table->foreign('application_id')
                  ->references('id')
                  ->on('applications')
                  ->onDelete('cascade');
                  
            $table->foreign('workflow_stage_id')
                  ->references('id')
                  ->on('workflow_stages')
                  ->onDelete('set null');
                  
            $table->foreign('created_by_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('restrict');
                  
            // Define indexes for performance optimization
            $table->index('application_id');
            $table->index('workflow_stage_id');
            $table->index('created_at');
        });
        
        // Implement range partitioning by created_at timestamp
        // This optimizes historical status queries by splitting data across partitions
        DB::statement("ALTER TABLE application_statuses
            PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
                PARTITION p0 VALUES LESS THAN (UNIX_TIMESTAMP('2023-01-01')),
                PARTITION p1 VALUES LESS THAN (UNIX_TIMESTAMP('2023-07-01')),
                PARTITION p2 VALUES LESS THAN (UNIX_TIMESTAMP('2024-01-01')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )");
    }

    /**
     * Reverse the migrations by dropping the application_statuses table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('application_statuses');
    }
}