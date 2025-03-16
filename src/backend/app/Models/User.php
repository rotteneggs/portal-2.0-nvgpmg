<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Foundation\Auth\User as Authenticatable; // Laravel ^10.0
use Laravel\Sanctum\HasApiTokens; // Laravel Sanctum ^3.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Notifications\Notifiable; // Laravel ^10.0
use Illuminate\Support\Facades\Hash; // Laravel ^10.0
use App\Models\UserProfile;
use App\Models\Role;
use App\Models\Permission;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'password',
        'is_active',
        'email_verified_at',
        'mfa_secret',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'full_name',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'profile',
    ];

    /**
     * Define the one-to-one relationship with UserProfile.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * Define the many-to-many relationship with Role.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id')
            ->withTimestamps();
    }

    /**
     * Define the one-to-many relationship with Application.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function applications()
    {
        return $this->hasMany('App\Models\Application');
    }

    /**
     * Define the one-to-many relationship with Document.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function documents()
    {
        return $this->hasMany('App\Models\Document');
    }

    /**
     * Define the one-to-many relationship with Message for sent messages.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function sentMessages()
    {
        return $this->hasMany('App\Models\Message', 'sender_user_id');
    }

    /**
     * Define the one-to-many relationship with Message for received messages.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function receivedMessages()
    {
        return $this->hasMany('App\Models\Message', 'recipient_user_id');
    }

    /**
     * Define the one-to-many relationship with Document for documents verified by this user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function verifiedDocuments()
    {
        return $this->hasMany('App\Models\Document', 'verified_by_user_id');
    }

    /**
     * Define the one-to-many relationship with NotificationRecipient.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function notifications()
    {
        return $this->hasMany('App\Models\NotificationRecipient');
    }

    /**
     * Check if the user has a specific role.
     *
     * @param string|Role $role
     * @return bool
     */
    public function hasRole($role)
    {
        if (!$this->relationLoaded('roles')) {
            $this->load('roles');
        }

        if (is_string($role)) {
            $role = Role::findByName($role);
            if (!$role) {
                return false;
            }
        }

        return $this->roles->contains($role);
    }

    /**
     * Assign a role to the user.
     *
     * @param string|Role $role
     * @return $this
     */
    public function assignRole($role)
    {
        if (is_string($role)) {
            $role = Role::findByName($role);
            if (!$role) {
                return $this;
            }
        }

        $this->roles()->syncWithoutDetaching([$role->id]);

        return $this;
    }

    /**
     * Remove a role from the user.
     *
     * @param string|Role $role
     * @return $this
     */
    public function removeRole($role)
    {
        if (is_string($role)) {
            $role = Role::findByName($role);
            if (!$role) {
                return $this;
            }
        }

        $this->roles()->detach($role->id);

        return $this;
    }

    /**
     * Sync the user's roles with the given roles.
     *
     * @param array $roles
     * @return $this
     */
    public function syncRoles(array $roles)
    {
        $roleIds = [];

        foreach ($roles as $role) {
            if (is_string($role)) {
                $role = Role::findByName($role);
                if ($role) {
                    $roleIds[] = $role->id;
                }
            } elseif (is_numeric($role)) {
                $roleIds[] = $role;
            } elseif ($role instanceof Role) {
                $roleIds[] = $role->id;
            }
        }

        $this->roles()->sync($roleIds);

        return $this;
    }

    /**
     * Check if the user has permission to perform an action on a resource.
     *
     * @param string $action
     * @param string $resource
     * @return bool
     */
    public function hasPermissionTo($action, $resource)
    {
        if (!$this->relationLoaded('roles')) {
            $this->load('roles');
        }

        foreach ($this->roles as $role) {
            if ($role->hasPermissionTo($action, $resource)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all permissions assigned to the user through their roles.
     *
     * @return \Illuminate\Support\Collection
     */
    public function getAllPermissions()
    {
        if (!$this->relationLoaded('roles')) {
            $this->load('roles');
        }

        $permissions = collect();

        foreach ($this->roles as $role) {
            $permissions = $permissions->merge($role->getAllPermissions());
        }

        return $permissions->unique('id');
    }

    /**
     * Check if the user account is active.
     *
     * @return bool
     */
    public function isActive()
    {
        return $this->is_active;
    }

    /**
     * Activate the user account.
     *
     * @return bool
     */
    public function activate()
    {
        $this->is_active = true;
        return $this->save();
    }

    /**
     * Deactivate the user account.
     *
     * @return bool
     */
    public function deactivate()
    {
        $this->is_active = false;
        return $this->save();
    }

    /**
     * Update the last login timestamp.
     *
     * @return bool
     */
    public function updateLastLogin()
    {
        $this->last_login_at = now();
        return $this->save();
    }

    /**
     * Check if multi-factor authentication is enabled for the user.
     *
     * @return bool
     */
    public function hasMfaEnabled()
    {
        return !is_null($this->mfa_secret);
    }

    /**
     * Enable multi-factor authentication for the user.
     *
     * @param string $secret
     * @return bool
     */
    public function enableMfa($secret)
    {
        $this->mfa_secret = $secret;
        return $this->save();
    }

    /**
     * Disable multi-factor authentication for the user.
     *
     * @return bool
     */
    public function disableMfa()
    {
        $this->mfa_secret = null;
        return $this->save();
    }

    /**
     * Get the user's full name from their profile.
     *
     * @return string
     */
    public function getFullNameAttribute()
    {
        if ($this->relationLoaded('profile') && $this->profile) {
            return $this->profile->full_name;
        }

        return $this->email;
    }

    /**
     * Scope query to only include active users.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query to only include inactive users.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Scope query to only include users with a specific role.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|Role $role
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeWithRole($query, $role)
    {
        if (is_string($role)) {
            $role = Role::findByName($role);
            if (!$role) {
                return $query;
            }
        }

        return $query->whereHas('roles', function ($query) use ($role) {
            $query->where('roles.id', $role->id);
        });
    }

    /**
     * Scope query to only include users with verified email.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeVerified($query)
    {
        return $query->whereNotNull('email_verified_at');
    }

    /**
     * Scope query to only include users with unverified email.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnverified($query)
    {
        return $query->whereNull('email_verified_at');
    }

    /**
     * Scope query to search for users by email or name.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $searchTerm
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSearch($query, $searchTerm)
    {
        return $query->where(function ($query) use ($searchTerm) {
            $term = '%' . $searchTerm . '%';
            $query->where('email', 'LIKE', $term)
                  ->orWhereHas('profile', function ($query) use ($term) {
                      $query->where('first_name', 'LIKE', $term)
                            ->orWhere('last_name', 'LIKE', $term);
                  });
        });
    }
}