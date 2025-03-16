<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\User;

class UserResource extends JsonResource
{
    /**
     * Flag to determine if profile data should be included
     *
     * @var bool
     */
    protected bool $includeProfile = false;

    /**
     * Flag to determine if roles should be included
     *
     * @var bool
     */
    protected bool $includeRoles = false;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource)
    {
        parent::__construct($resource);
        $this->includeProfile = false;
        $this->includeRoles = false;
    }

    /**
     * Transform the User model into an array for API response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        // Ensure we're working with a User model
        /** @var User $user */
        $user = $this->resource;

        $data = [
            'id' => $user->id,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->toIso8601String() : null,
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            'has_mfa_enabled' => $user->hasMfaEnabled(),
            'full_name' => $user->full_name,
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
        ];

        // Include profile data if requested
        if ($this->includeProfile && $user->profile) {
            $data['profile'] = [
                'first_name' => $user->profile->first_name,
                'last_name' => $user->profile->last_name,
                'date_of_birth' => $user->profile->date_of_birth ? $user->profile->date_of_birth->toIso8601String() : null,
                'phone_number' => $user->profile->phone_number,
                'address_line1' => $user->profile->address_line1,
                'address_line2' => $user->profile->address_line2,
                'city' => $user->profile->city,
                'state' => $user->profile->state,
                'postal_code' => $user->profile->postal_code,
                'country' => $user->profile->country,
                'formatted_address' => $user->profile->formatted_address,
                'notification_preferences' => $user->profile->notification_preferences,
            ];
        }

        // Include roles data if requested
        if ($this->includeRoles) {
            if ($user->relationLoaded('roles')) {
                $data['roles'] = $user->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'description' => $role->description,
                        'is_system_role' => $role->is_system_role,
                    ];
                });
            } else {
                // Load roles if not already loaded
                $data['roles'] = $user->roles()->get()->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'description' => $role->description,
                        'is_system_role' => $role->is_system_role,
                    ];
                });
            }
        }

        return $data;
    }

    /**
     * Add a method to include profile data in the resource response.
     *
     * @return $this
     */
    public function withProfile()
    {
        $this->includeProfile = true;
        return $this;
    }

    /**
     * Add a method to include roles in the resource response.
     *
     * @return $this
     */
    public function withRoles()
    {
        $this->includeRoles = true;
        return $this;
    }
}