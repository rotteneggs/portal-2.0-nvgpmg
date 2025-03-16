<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the notifications table which stores system notifications
     * that can be sent through multiple channels (in-app, email, SMS) to users.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
            $table->string('type', 50); // e.g., 'application_status', 'document_verified'
            $table->string('channel', 50); // e.g., 'email', 'sms', 'in-app'
            $table->string('subject', 255);
            $table->text('content');
            $table->json('data')->nullable(); // Additional structured data related to the notification
            $table->timestamp('created_at')->useCurrent();
            
            // Indexes for efficient filtering and sorting
            $table->index('type');
            $table->index('channel');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('notifications');
    }
};