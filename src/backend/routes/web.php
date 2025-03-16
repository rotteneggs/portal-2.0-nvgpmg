<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. These routes serve the
| SPA frontend and handle specific web functionality like document
| downloads and payment callbacks.
|
*/

Route::middleware('web')->group(function () {
    // Health check endpoint for monitoring systems
    Route::get('health-check', function () {
        return response()->json(['status' => 'ok']);
    })->name('health-check');

    // Secure document download using a signed URL token
    Route::get('documents/download/{token}', 'App\Http\Controllers\DocumentController@downloadByToken')
        ->name('documents.download-by-token');

    // Handle payment gateway callbacks after payment processing
    Route::get('payments/callback/{provider}', 'App\Http\Controllers\PaymentController@handleCallback')
        ->name('payments.callback');

    // Redirect password reset links to the SPA with the token
    Route::get('auth/password/reset/{token}', function () {
        return redirect('/reset-password?token=' . request('token'));
    })->name('password.reset');

    // Redirect email verification links to the SPA with parameters
    Route::get('auth/email/verify/{id}/{hash}', function () {
        return redirect('/verify-email?id=' . request('id') . '&hash=' . request('hash'));
    })->name('verification.verify');

    // Catch-all route that serves the SPA for any unmatched routes
    Route::get('{path?}', function () {
        return view('app');
    })->where('path', '.*')->name('spa');
});

// Cache routes in production for better performance
if (app()->environment('production')) {
    Artisan::call('route:cache');
}