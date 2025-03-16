<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations to create the messages table.
     * Note: The partitioning strategy requires MySQL 8.0+ with InnoDB support for table partitioning.
     *
     * @return void
     */
    public function up()
    {
        // Create the table with primary key that will support partitioning
        Schema::create('messages', function (Blueprint $table) {
            // Define primary key that includes created_at for partitioning
            $table->bigInteger('id')->unsigned();
            $table->timestamp('created_at')->nullable();
            $table->primary(['id', 'created_at']);
            
            // Regular columns
            $table->unsignedBigInteger('sender_user_id');
            $table->unsignedBigInteger('recipient_user_id');
            $table->unsignedBigInteger('application_id')->nullable();
            $table->string('subject');
            $table->text('message_body');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            
            // Foreign key constraints
            $table->foreign('sender_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('recipient_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('set null');
            
            // Indexes
            $table->index('sender_user_id');
            $table->index('recipient_user_id');
            $table->index('application_id');
            $table->index('is_read');
            $table->fullText(['subject', 'message_body']);
        });
        
        // Add auto_increment to id column
        DB::statement('ALTER TABLE messages MODIFY id BIGINT UNSIGNED AUTO_INCREMENT');
        
        // Add partitioning - requires MySQL 8.0+ with InnoDB support for table partitioning
        DB::statement('ALTER TABLE messages PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
            PARTITION p0 VALUES LESS THAN (UNIX_TIMESTAMP("2023-01-01")),
            PARTITION p1 VALUES LESS THAN (UNIX_TIMESTAMP("2023-04-01")),
            PARTITION p2 VALUES LESS THAN (UNIX_TIMESTAMP("2023-07-01")),
            PARTITION p3 VALUES LESS THAN (UNIX_TIMESTAMP("2023-10-01")),
            PARTITION p4 VALUES LESS THAN (UNIX_TIMESTAMP("2024-01-01")),
            PARTITION p_future VALUES LESS THAN MAXVALUE
        )');
    }

    /**
     * Reverse the migrations by dropping the messages table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('messages');
    }
};