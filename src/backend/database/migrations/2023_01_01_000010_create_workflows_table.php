<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to create the workflows table.
     * This table stores workflow definitions for the admissions process,
     * supporting the WYSIWYG workflow editor feature.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('workflows', function (Blueprint $table) {
            // Primary key
            $table->bigIncrements('id');
            
            // Workflow details
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('application_type', 50);
            $table->boolean('is_active')->default(false);
            
            // Creator reference
            $table->unsignedBigInteger('created_by_user_id');
            
            // Timestamps
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('created_by_user_id')->references('id')->on('users');
            
            // Indexes
            $table->index('application_type');
            $table->index('is_active');
            $table->index(['application_type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations by dropping the workflows table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('workflows');
    }
};