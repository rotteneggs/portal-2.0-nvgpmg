<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| This file defines all API routes for the Student Admissions Enrollment Platform.
| Routes are organized into logical groups and protected by appropriate middleware
| for authentication, authorization, and rate limiting.
|
| All API endpoints are versioned with the /api/v1 prefix to support
| future API versions without breaking backward compatibility.
|
*/

/*
|--------------------------------------------------------------------------
| Public API Routes (No Authentication Required)
|--------------------------------------------------------------------------
|
| These routes don't require authentication and are primarily for
| user registration, login, and account management functions
| that must be accessible before a user is authenticated.
|
*/
Route::prefix('api/v1')->middleware(['api'])->group(function () {
    // Authentication routes
    Route::post('auth/register', 'AuthController@register')->name('auth.register');
    Route::post('auth/login', 'AuthController@login')->name('auth.login');
    Route::post('auth/verify-mfa', 'AuthController@verifyMfa')->name('auth.verify-mfa');
    Route::post('auth/recovery-code', 'AuthController@useRecoveryCode')->name('auth.recovery-code');
    Route::post('auth/refresh', 'AuthController@refreshToken')->name('auth.refresh');
    Route::get('auth/verify-email/{id}/{hash}', 'AuthController@verifyEmail')->name('auth.verify-email');
    Route::post('auth/resend-verification', 'AuthController@resendVerificationEmail')->name('auth.resend-verification');
    Route::post('auth/forgot-password', 'AuthController@forgotPassword')->name('auth.forgot-password');
    Route::post('auth/reset-password', 'AuthController@resetPassword')->name('auth.reset-password');
});

/*
|--------------------------------------------------------------------------
| Authenticated API Routes
|--------------------------------------------------------------------------
|
| These routes require a valid authentication token (using Sanctum)
| and are accessible to any authenticated user regardless of role.
| They handle the core functionality of the application.
|
*/
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function () {
    // Authentication routes that require being logged in
    Route::post('auth/logout', 'AuthController@logout')->name('auth.logout');
    Route::get('auth/me', 'AuthController@me')->name('auth.me');
    Route::post('auth/change-password', 'AuthController@changePassword')->name('auth.change-password');
    Route::post('auth/setup-mfa', 'AuthController@setupMfa')->name('auth.setup-mfa');
    Route::post('auth/verify-mfa-setup', 'AuthController@verifyMfaSetup')->name('auth.verify-mfa-setup');
    Route::post('auth/disable-mfa', 'AuthController@disableMfa')->name('auth.disable-mfa');
    Route::get('auth/recovery-codes', 'AuthController@getRecoveryCodes')->name('auth.recovery-codes');
    
    // Application management routes
    Route::get('applications', 'ApplicationController@index')->name('applications.index');
    Route::post('applications', 'ApplicationController@store')->name('applications.store');
    Route::get('applications/{id}', 'ApplicationController@show')->name('applications.show');
    Route::put('applications/{id}', 'ApplicationController@update')->name('applications.update');
    Route::post('applications/{id}/submit', 'ApplicationController@submit')->name('applications.submit');
    Route::delete('applications/{id}', 'ApplicationController@destroy')->name('applications.destroy');
    Route::get('applications/{id}/required-documents', 'ApplicationController@requiredDocuments')->name('applications.required-documents');
    Route::get('applications/{id}/missing-documents', 'ApplicationController@missingDocuments')->name('applications.missing-documents');
    Route::get('applications/{id}/check-complete', 'ApplicationController@checkComplete')->name('applications.check-complete');
    Route::get('applications/{id}/timeline', 'ApplicationController@timeline')->name('applications.timeline');
    
    // Document management routes
    Route::get('documents', 'DocumentController@index')->name('documents.index');
    Route::post('documents', 'DocumentController@store')->name('documents.store');
    Route::get('documents/{id}', 'DocumentController@show')->name('documents.show');
    Route::put('documents/{id}', 'DocumentController@update')->name('documents.update');
    Route::delete('documents/{id}', 'DocumentController@destroy')->name('documents.destroy');
    Route::get('documents/{id}/download', 'DocumentController@download')->name('documents.download');
    Route::get('documents/types', 'DocumentController@types')->name('documents.types');
    Route::get('documents/status/{applicationId}', 'DocumentController@status')->name('documents.status');
    
    // Workflow routes
    Route::get('workflows/active', 'WorkflowController@getActiveWorkflow')->name('workflows.active');
    Route::get('workflows/application/{applicationId}', 'WorkflowController@getApplicationWorkflow')->name('workflows.application');
    Route::get('workflows/{workflowId}/stages', 'WorkflowController@getWorkflowStages')->name('workflows.stages');
    Route::get('workflows/{workflowId}/transitions', 'WorkflowController@getWorkflowTransitions')->name('workflows.transitions');
    Route::get('applications/{applicationId}/status', 'WorkflowController@getApplicationStatus')->name('applications.status');
    
    // Messaging routes
    Route::get('messages', 'MessageController@index')->name('messages.index');
    Route::post('messages', 'MessageController@store')->name('messages.store');
    Route::get('messages/{id}', 'MessageController@show')->name('messages.show');
    Route::post('messages/{id}/reply', 'MessageController@reply')->name('messages.reply');
    Route::post('messages/{id}/read', 'MessageController@markAsRead')->name('messages.read');
    Route::post('messages/{id}/unread', 'MessageController@markAsUnread')->name('messages.unread');
    Route::get('messages/unread-count', 'MessageController@unreadCount')->name('messages.unread-count');
    Route::get('messages/application/{applicationId}', 'MessageController@applicationMessages')->name('messages.application');
    Route::delete('messages/{id}', 'MessageController@destroy')->name('messages.destroy');
    Route::get('messages/attachments/{id}', 'MessageController@getAttachment')->name('messages.attachments.show');
    Route::get('messages/attachments/{id}/download', 'MessageController@downloadAttachment')->name('messages.attachments.download');
    Route::get('messages/search', 'MessageController@search')->name('messages.search');
    
    // Notification routes
    Route::get('notifications', 'NotificationController@index')->name('notifications.index');
    Route::get('notifications/{id}', 'NotificationController@show')->name('notifications.show');
    Route::get('notifications/unread-count', 'NotificationController@unreadCount')->name('notifications.unread-count');
    Route::post('notifications/{id}/read', 'NotificationController@markAsRead')->name('notifications.read');
    Route::post('notifications/read-all', 'NotificationController@markAllAsRead')->name('notifications.read-all');
    Route::delete('notifications/{id}', 'NotificationController@delete')->name('notifications.delete');
    Route::delete('notifications/delete-all', 'NotificationController@deleteAll')->name('notifications.delete-all');
    Route::get('notifications/preferences', 'NotificationController@getPreferences')->name('notifications.preferences');
    Route::put('notifications/preferences', 'NotificationController@updatePreferences')->name('notifications.update-preferences');
    
    // Payment routes
    Route::get('payments', 'PaymentController@index')->name('payments.index');
    Route::get('payments/{id}', 'PaymentController@show')->name('payments.show');
    Route::get('payments/application/{applicationId}', 'PaymentController@getApplicationPayments')->name('payments.application');
    Route::get('payments/types', 'PaymentController@getPaymentTypes')->name('payments.types');
    Route::get('payments/methods/{paymentType}', 'PaymentController@getPaymentMethods')->name('payments.methods');
    Route::post('payments/initialize', 'PaymentController@initializePayment')->name('payments.initialize');
    Route::post('payments/{id}/process', 'PaymentController@processPayment')->name('payments.process');
    Route::get('payments/{id}/receipt', 'PaymentController@generateReceipt')->name('payments.receipt');
    
    // Financial aid routes
    Route::get('financial-aid', 'FinancialAidController@index')->name('financial-aid.index');
    Route::post('financial-aid', 'FinancialAidController@store')->name('financial-aid.store');
    Route::get('financial-aid/{id}', 'FinancialAidController@show')->name('financial-aid.show');
    Route::get('financial-aid/application/{applicationId}', 'FinancialAidController@showByApplication')->name('financial-aid.show-by-application');
    Route::put('financial-aid/{id}', 'FinancialAidController@update')->name('financial-aid.update');
    Route::post('financial-aid/{id}/submit', 'FinancialAidController@submit')->name('financial-aid.submit');
    Route::delete('financial-aid/{id}', 'FinancialAidController@destroy')->name('financial-aid.destroy');
    Route::post('financial-aid/{id}/documents', 'FinancialAidController@uploadDocument')->name('financial-aid.upload-document');
    Route::get('financial-aid/{id}/documents', 'FinancialAidController@getDocuments')->name('financial-aid.documents');
    Route::get('financial-aid/{applicationId}/documents/{documentId}/download', 'FinancialAidController@downloadDocument')->name('financial-aid.download-document');
    Route::delete('financial-aid/{applicationId}/documents/{documentId}', 'FinancialAidController@deleteDocument')->name('financial-aid.delete-document');
    Route::get('financial-aid/{id}/required-documents', 'FinancialAidController@requiredDocuments')->name('financial-aid.required-documents');
    Route::get('financial-aid/{id}/missing-documents', 'FinancialAidController@missingDocuments')->name('financial-aid.missing-documents');
    Route::get('financial-aid/{id}/check-complete', 'FinancialAidController@checkComplete')->name('financial-aid.check-complete');
    Route::get('financial-aid/aid-types', 'FinancialAidController@aidTypes')->name('financial-aid.aid-types');
    
    // AI-related routes
    Route::post('ai/chatbot', 'AIController@chatbotResponse')->name('ai.chatbot');
});

/*
|--------------------------------------------------------------------------
| Admin Routes (Staff & Administrators)
|--------------------------------------------------------------------------
|
| These routes require authentication and the role of either
| administrator or staff. They provide access to user management,
| application review, and reporting functionality.
|
*/
Route::prefix('api/v1/admin')->middleware(['api', 'auth:sanctum', 'role:administrator,staff'])->group(function () {
    // User management routes
    Route::get('users', 'Admin\UserManagementController@index')->name('admin.users.index');
    Route::get('users/{id}', 'Admin\UserManagementController@show')->name('admin.users.show');
    Route::put('users/{id}', 'Admin\UserManagementController@update')->name('admin.users.update');
    
    // Application review routes
    Route::get('applications', 'Admin\ApplicationReviewController@index')->name('admin.applications.index');
    Route::get('applications/{id}', 'Admin\ApplicationReviewController@show')->name('admin.applications.show');
    Route::put('applications/{id}/status', 'Admin\ApplicationReviewController@updateStatus')->name('admin.applications.update-status');
    Route::post('applications/{id}/notes', 'Admin\ApplicationReviewController@addNote')->name('admin.applications.add-note');
    Route::get('applications/{id}/notes', 'Admin\ApplicationReviewController@getNotes')->name('admin.applications.get-notes');
    
    // Document verification routes
    Route::post('documents/{id}/verify', 'DocumentController@verify')->name('documents.verify');
    Route::post('documents/{id}/reject', 'DocumentController@reject')->name('documents.reject');
    
    // Payment management routes
    Route::post('payments/{id}/refund', 'PaymentController@refundPayment')->name('payments.refund');
    
    // Reporting routes
    Route::get('reports/applications', 'Admin\ReportingController@applicationReports')->name('admin.reports.applications');
    Route::get('reports/users', 'Admin\ReportingController@userReports')->name('admin.reports.users');
    Route::get('reports/financial', 'Admin\ReportingController@financialReports')->name('admin.reports.financial');
    Route::get('reports/custom', 'Admin\ReportingController@customReports')->name('admin.reports.custom');
});

/*
|--------------------------------------------------------------------------
| Admin Routes (Administrators Only)
|--------------------------------------------------------------------------
|
| These routes require authentication and the role of administrator.
| They provide access to system configuration, role management,
| and other sensitive administrative functions.
|
*/
Route::prefix('api/v1/admin')->middleware(['api', 'auth:sanctum', 'role:administrator'])->group(function () {
    // Role and permission management
    Route::get('roles', 'Admin\RolePermissionController@getRoles')->name('admin.roles.index');
    Route::post('roles', 'Admin\RolePermissionController@createRole')->name('admin.roles.store');
    Route::put('roles/{id}', 'Admin\RolePermissionController@updateRole')->name('admin.roles.update');
    Route::delete('roles/{id}', 'Admin\RolePermissionController@deleteRole')->name('admin.roles.destroy');
    Route::get('permissions', 'Admin\RolePermissionController@getPermissions')->name('admin.permissions.index');
    
    // User-role assignment
    Route::post('users/{id}/roles', 'Admin\UserManagementController@assignRole')->name('admin.users.assign-role');
    Route::delete('users/{id}/roles/{roleId}', 'Admin\UserManagementController@removeRole')->name('admin.users.remove-role');
    
    // System settings
    Route::get('settings', 'Admin\SystemSettingsController@getSettings')->name('admin.settings.index');
    Route::put('settings', 'Admin\SystemSettingsController@updateSettings')->name('admin.settings.update');
    
    // Audit logs
    Route::get('audit-logs', 'Admin\SystemSettingsController@getAuditLogs')->name('admin.audit-logs');
});

/*
|--------------------------------------------------------------------------
| Workflow Editor Routes (Administrators Only)
|--------------------------------------------------------------------------
|
| These routes provide the API backend for the WYSIWYG workflow editor,
| allowing administrators to create and manage admission workflows.
| They are separated into their own group for clarity.
|
*/
Route::prefix('api/v1/admin/workflows')->middleware(['api', 'auth:sanctum', 'role:administrator'])->group(function () {
    // Workflow management
    Route::get('', 'Admin\WorkflowEditorController@index')->name('admin.workflows.index');
    Route::get('{id}', 'Admin\WorkflowEditorController@show')->name('admin.workflows.show');
    Route::post('', 'Admin\WorkflowEditorController@store')->name('admin.workflows.store');
    Route::put('{id}', 'Admin\WorkflowEditorController@update')->name('admin.workflows.update');
    Route::delete('{id}', 'Admin\WorkflowEditorController@destroy')->name('admin.workflows.destroy');
    Route::post('{id}/activate', 'Admin\WorkflowEditorController@activate')->name('admin.workflows.activate');
    Route::post('{id}/deactivate', 'Admin\WorkflowEditorController@deactivate')->name('admin.workflows.deactivate');
    Route::post('{id}/duplicate', 'Admin\WorkflowEditorController@duplicate')->name('admin.workflows.duplicate');
    Route::get('{id}/validate', 'Admin\WorkflowEditorController@validate')->name('admin.workflows.validate');
    
    // Workflow stages
    Route::get('{id}/stages', 'Admin\WorkflowEditorController@stages')->name('admin.workflows.stages');
    Route::post('{id}/stages', 'Admin\WorkflowEditorController@storeStage')->name('admin.workflows.stages.store');
    Route::put('{id}/stages/{stageId}', 'Admin\WorkflowEditorController@updateStage')->name('admin.workflows.stages.update');
    Route::delete('{id}/stages/{stageId}', 'Admin\WorkflowEditorController@destroyStage')->name('admin.workflows.stages.destroy');
    Route::post('{id}/stages/reorder', 'Admin\WorkflowEditorController@reorderStages')->name('admin.workflows.stages.reorder');
    
    // Workflow transitions
    Route::get('{id}/transitions', 'Admin\WorkflowEditorController@transitions')->name('admin.workflows.transitions');
    Route::post('{id}/transitions', 'Admin\WorkflowEditorController@storeTransition')->name('admin.workflows.transitions.store');
    Route::put('{id}/transitions/{transitionId}', 'Admin\WorkflowEditorController@updateTransition')->name('admin.workflows.transitions.update');
    Route::delete('{id}/transitions/{transitionId}', 'Admin\WorkflowEditorController@destroyTransition')->name('admin.workflows.transitions.destroy');
});

/*
|--------------------------------------------------------------------------
| Webhook Routes
|--------------------------------------------------------------------------
|
| These routes handle incoming webhooks from third-party services
| like payment processors. They typically don't require standard
| authentication but may use other verification mechanisms.
|
*/
Route::prefix('api/v1/webhooks')->middleware(['api'])->group(function () {
    // Payment webhook handlers
    Route::post('payments/{provider}', 'PaymentController@handleWebhook')->name('webhooks.payments');
});