<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUsersTable extends Migration
{
    /**
     * Run the migrations to create the users table.
     * 
     * This migration establishes the core user authentication table with support for
     * email verification, MFA, account status tracking, and login activity monitoring.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id(); // Auto-incrementing unsigned big integer primary key
            $table->string('email')->unique();
            $table->string('password');
            $table->string('remember_token', 100)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps(); // created_at and updated_at columns
            $table->timestamp('last_login_at')->nullable();
            $table->string('mfa_secret')->nullable();
            
            // Create additional index for filtering by active status
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations by dropping the users table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users');
    }
}