<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePermissionsTable extends Migration
{
    /**
     * Run the migrations to create the permissions table.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->string('resource', 100);
            $table->string('action', 100);
            $table->timestamps();
            
            // Create a composite index on resource and action columns for query optimization
            $table->index(['resource', 'action']);
        });
    }

    /**
     * Reverse the migrations by dropping the permissions table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('permissions');
    }
}