<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel Eloquent ORM base model class, ^10.0
use Illuminate\Support\Collection; // Laravel collection class for handling arrays of data, ^10.0
use App\Models\Permission;

class Role extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'description',
        'is_system_role',
    ];

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'roles';

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'is_system_role' => 'boolean',
    ];

    /**
     * Define many-to-many relationship with User model.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_roles', 'role_id', 'user_id')
            ->withTimestamps();
    }

    /**
     * Define many-to-many relationship with Permission model.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_permissions', 'role_id', 'permission_id')
            ->withTimestamps();
    }

    /**
     * Check if the role has permission to perform an action on a resource.
     *
     * @param string $action
     * @param string $resource
     * @return bool
     */
    public function hasPermissionTo($action, $resource)
    {
        if (!$this->relationLoaded('permissions')) {
            $this->load('permissions');
        }

        return $this->permissions->contains(function ($permission) use ($action, $resource) {
            return $permission->resource === $resource && $permission->action === $action;
        });
    }

    /**
     * Assign a permission to the role.
     *
     * @param string|int|Permission $permission
     * @return $this
     */
    public function givePermissionTo($permission)
    {
        // If permission is a string in format 'action:resource'
        if (is_string($permission) && strpos($permission, ':') !== false) {
            list($action, $resource) = explode(':', $permission, 2);
            $permission = Permission::getByResourceAndAction($resource, $action);
            
            if (!$permission) {
                return $this;
            }
        }
        // If permission is an ID
        else if (is_numeric($permission)) {
            $permission = Permission::find($permission);
            
            if (!$permission) {
                return $this;
            }
        }
        
        // At this point, $permission should be an instance of Permission
        if (!$permission instanceof Permission) {
            return $this;
        }
        
        $this->permissions()->syncWithoutDetaching([$permission->id]);
        
        return $this;
    }

    /**
     * Remove a permission from the role.
     *
     * @param string|int|Permission $permission
     * @return $this
     */
    public function revokePermissionTo($permission)
    {
        // If permission is a string in format 'action:resource'
        if (is_string($permission) && strpos($permission, ':') !== false) {
            list($action, $resource) = explode(':', $permission, 2);
            $permission = Permission::getByResourceAndAction($resource, $action);
            
            if (!$permission) {
                return $this;
            }
        }
        // If permission is an ID
        else if (is_numeric($permission)) {
            $permission = Permission::find($permission);
            
            if (!$permission) {
                return $this;
            }
        }
        
        // At this point, $permission should be an instance of Permission
        if (!$permission instanceof Permission) {
            return $this;
        }
        
        $this->permissions()->detach($permission->id);
        
        return $this;
    }

    /**
     * Sync the role's permissions with the given permissions.
     *
     * @param array $permissions
     * @return $this
     */
    public function syncPermissions(array $permissions)
    {
        $permissionIds = [];
        
        foreach ($permissions as $permission) {
            // If permission is a string in format 'action:resource'
            if (is_string($permission) && strpos($permission, ':') !== false) {
                list($action, $resource) = explode(':', $permission, 2);
                $foundPermission = Permission::getByResourceAndAction($resource, $action);
                
                if ($foundPermission) {
                    $permissionIds[] = $foundPermission->id;
                }
            }
            // If permission is an ID
            else if (is_numeric($permission)) {
                $permissionIds[] = $permission;
            }
            // If permission is a Permission instance
            else if ($permission instanceof Permission) {
                $permissionIds[] = $permission->id;
            }
        }
        
        $this->permissions()->sync($permissionIds);
        
        return $this;
    }

    /**
     * Get all permissions assigned to the role.
     *
     * @return \Illuminate\Support\Collection
     */
    public function getAllPermissions()
    {
        if (!$this->relationLoaded('permissions')) {
            $this->load('permissions');
        }
        
        return $this->permissions;
    }

    /**
     * Find a role by its name.
     *
     * @param string $name
     * @return ?Role
     */
    public static function findByName($name)
    {
        return static::where('name', $name)->first();
    }

    /**
     * Find or create a role with the given attributes.
     *
     * @param string $name
     * @param string|null $description
     * @param bool $isSystemRole
     * @return Role
     */
    public static function findOrCreate($name, $description = null, $isSystemRole = false)
    {
        $attributes = [];
        
        if ($description) {
            $attributes['description'] = $description;
        }
        
        $attributes['is_system_role'] = $isSystemRole;
        
        return static::firstOrCreate(
            ['name' => $name],
            $attributes
        );
    }

    /**
     * Scope query to only include system roles.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSystemRoles($query)
    {
        return $query->where('is_system_role', true);
    }

    /**
     * Scope query to only include custom (non-system) roles.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCustomRoles($query)
    {
        return $query->where('is_system_role', false);
    }
}