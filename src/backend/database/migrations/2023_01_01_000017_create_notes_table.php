<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotesTable extends Migration
{
    /**
     * Run the migrations to create the notes table
     *
     * @return void
     */
    public function up()
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('user_id');
            $table->text('content');
            $table->boolean('is_internal')->default(true);
            $table->timestamps();

            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users');
            
            $table->index('application_id');
            $table->index('user_id');
            $table->index('is_internal');
        });
    }

    /**
     * Reverse the migrations by dropping the notes table
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('notes');
    }
}