<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationRecipientsTable extends Migration
{
    /**
     * Run the migrations to create the notification_recipients table.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('notification_recipients', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('notification_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('is_sent')->default(false);
            $table->boolean('is_read')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            
            // Foreign key constraints
            $table->foreign('notification_id')->references('id')->on('notifications')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Indexes
            $table->index(['notification_id', 'user_id']);
            $table->index('user_id');
            $table->index('is_sent');
            $table->index('is_read');
        });
    }

    /**
     * Reverse the migrations by dropping the notification_recipients table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('notification_recipients');
    }
}