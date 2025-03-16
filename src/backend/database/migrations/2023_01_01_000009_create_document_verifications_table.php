<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDocumentVerificationsTable extends Migration
{
    /**
     * Run the migrations to create the document_verifications table.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('document_verifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_id');
            $table->string('verification_method', 50);
            $table->string('verification_status', 50);
            $table->json('verification_data')->nullable();
            $table->float('confidence_score')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('verified_by_user_id')->nullable();
            $table->timestamp('created_at')->nullable();

            // Foreign keys
            $table->foreign('document_id')
                ->references('id')
                ->on('documents')
                ->onDelete('cascade');
            
            $table->foreign('verified_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            // Indexes
            $table->index('document_id');
            $table->index('verification_method');
            $table->index('verification_status');
        });
    }

    /**
     * Reverse the migrations by dropping the document_verifications table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('document_verifications');
    }
}