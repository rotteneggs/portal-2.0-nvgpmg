<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

/**
 * Private user channel
 * Authorizes that the authenticated user can only access their own channel
 */
Broadcast::channel('private:user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Private application channel
 * Authorizes access to application-specific events based on ownership or permissions
 */
Broadcast::channel('private:application.{id}', function ($user, $id) {
    // Load the application with the given ID
    $application = app('App\Models\Application')->find($id);
    
    if (!$application) {
        return false;
    }
    
    // Authorize if user owns the application or has permission to view it
    return (int) $user->id === (int) $application->user_id || 
           $user->hasPermission('application.view');
});

/**
 * Private document channel
 * Authorizes access to document-specific events based on ownership or permissions
 */
Broadcast::channel('private:document.{id}', function ($user, $id) {
    // Load the document with the given ID
    $document = app('App\Models\Document')->find($id);
    
    if (!$document) {
        return false;
    }
    
    // Authorize if user owns the document or has permission to view it
    return (int) $user->id === (int) $document->user_id || 
           $user->hasPermission('document.view');
});

/**
 * Presence admissions channel
 * Authorizes staff members to join a presence channel to see who else is online
 * Returns user information for presence tracking
 */
Broadcast::channel('presence:admissions', function ($user) {
    // Check if the authenticated user has the 'staff' role
    if ($user->hasRole('staff')) {
        // Return user information for the presence channel
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => 'staff'
        ];
    }
    
    return false;
});

/**
 * Private workflow channel
 * Authorizes access to workflow-specific events based on permissions
 */
Broadcast::channel('private:workflow.{id}', function ($user, $id) {
    // Check if the authenticated user has permission to access the workflow
    return $user->hasPermission('workflow.view');
});