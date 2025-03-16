<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFinancialAidDocumentsTable extends Migration
{
    /**
     * Run the migrations to create the financial_aid_documents table.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('financial_aid_documents', function (Blueprint $table) {
            // Primary key
            $table->id();
            
            // Foreign key and relationship columns
            $table->unsignedBigInteger('financial_aid_application_id');
            
            // Document metadata columns
            $table->string('document_type', 50);
            $table->string('file_name', 255);
            $table->string('file_path', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            
            // Timestamps for record keeping
            $table->timestamps();
            
            // Foreign key constraint
            $table->foreign('financial_aid_application_id')
                  ->references('id')
                  ->on('financial_aid_applications')
                  ->onDelete('cascade');
            
            // Indexes for improved query performance
            $table->index('financial_aid_application_id');
            $table->index('document_type');
            $table->index('is_verified');
        });
    }

    /**
     * Reverse the migrations by dropping the financial_aid_documents table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('financial_aid_documents');
    }
}