<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFailedJobsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the failed_jobs table to store information about queue jobs
     * that have failed during execution. This is essential for monitoring
     * and debugging background processes in the application.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('failed_jobs', function (Blueprint $table) {
            // Auto-incrementing ID column as primary key
            $table->id();
            
            // UUID column for unique job identification
            $table->string('uuid')->unique();
            
            // Store the queue connection name
            $table->text('connection');
            
            // Store the queue name where the job was dispatched
            $table->text('queue');
            
            // Store the serialized job data
            $table->longText('payload');
            
            // Store the exception information that caused the job to fail
            $table->longText('exception');
            
            // Record when the job failed (defaults to current timestamp)
            $table->timestamp('failed_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops the failed_jobs table from the database.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('failed_jobs');
    }
}