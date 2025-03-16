<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUserRolesTable extends Migration
{
    /**
     * Run the migrations to create the user_roles table.
     * This junction table establishes a many-to-many relationship between users and roles,
     * allowing users to be assigned multiple roles for the RBAC system.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('role_id');
            $table->timestamps();
            
            // Set composite primary key
            $table->primary(['user_id', 'role_id']);
            
            // Add foreign key constraints with cascade on delete
            // This ensures that when a user or role is deleted, all associated records are automatically removed
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            
            // Add index for faster lookups when querying by user_id
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations by dropping the user_roles table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('user_roles');
    }
}