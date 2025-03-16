<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDocumentsTable extends Migration
{
    /**
     * Run the migrations to create the documents table.
     *
     * This table stores metadata for uploaded documents in the Student Admissions Enrollment Platform.
     * It tracks document information such as file paths, types, verification status, and relationships
     * to users and applications.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('documents', function (Blueprint $table) {
            // Primary key
            $table->id();
            
            // Foreign keys to related tables
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('application_id');
            
            // Document metadata
            $table->string('document_type', 50); // transcript, ID, recommendation, etc.
            $table->string('file_name', 255);     // Original file name
            $table->string('file_path', 255);     // Storage path to the file
            $table->string('mime_type', 100);     // File MIME type
            $table->unsignedBigInteger('file_size'); // File size in bytes
            
            // Verification metadata
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by_user_id')->nullable();
            
            // Timestamps for record-keeping
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
            $table->foreign('verified_by_user_id')->references('id')->on('users')->onDelete('set null');

            // Indexes for performance optimization
            $table->index('user_id');
            $table->index('application_id');
            $table->index('document_type');
            $table->index('is_verified');
        });
    }

    /**
     * Reverse the migrations by dropping the documents table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('documents');
    }
}