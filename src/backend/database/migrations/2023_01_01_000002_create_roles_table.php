<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRolesTable extends Migration
{
    /**
     * Run the migrations to create the roles table.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_system_role')->default(false);
            $table->timestamps();
            
            $table->index('is_system_role');
        });
    }

    /**
     * Reverse the migrations by dropping the roles table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('roles');
    }
}