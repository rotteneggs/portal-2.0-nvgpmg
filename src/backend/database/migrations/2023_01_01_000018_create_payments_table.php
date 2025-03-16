<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentsTable extends Migration
{
    /**
     * Run the migrations to create the payments table.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('application_id')->nullable()->constrained()->onDelete('set null');
            $table->string('payment_type');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('payment_method');
            $table->string('transaction_id')->nullable();
            $table->string('status');
            $table->json('payment_data')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('application_id');
            $table->index('payment_type');
            $table->index('status');
            $table->index('paid_at');
        });
    }

    /**
     * Reverse the migrations by dropping the payments table.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('payments');
    }
}