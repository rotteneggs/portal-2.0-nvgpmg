<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWorkflowTransitionsTable extends Migration
{
    /**
     * Run the migrations to create the workflow_transitions table.
     * This table stores the possible transitions between workflow stages
     * in the admissions process, supporting the WYSIWYG workflow editor.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('workflow_transitions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('source_stage_id');
            $table->unsignedBigInteger('target_stage_id');
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->json('transition_conditions')->nullable();
            $table->json('required_permissions')->nullable();
            $table->boolean('is_automatic')->default(false);
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('source_stage_id')
                  ->references('id')
                  ->on('workflow_stages')
                  ->onDelete('cascade');
            
            $table->foreign('target_stage_id')
                  ->references('id')
                  ->on('workflow_stages')
                  ->onDelete('cascade');
            
            // Indexes for optimized lookups
            $table->index('source_stage_id');
            $table->index('target_stage_id');
            $table->index('is_automatic');
        });
    }

    /**
     * Reverse the migrations by dropping the workflow_transitions table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('workflow_transitions');
    }
}