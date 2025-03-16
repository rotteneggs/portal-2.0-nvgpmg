<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel Eloquent ORM base model class, ^10.0
use Illuminate\Support\Collection; // Laravel collection class for handling arrays of data, ^10.0

class Permission extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'description',
        'resource',
        'action',
    ];

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'permissions';

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Define many-to-many relationship with Role model.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_permissions', 'permission_id', 'role_id')
            ->withTimestamps();
    }

    /**
     * Scope query to permissions for a specific resource.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $resource
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForResource($query, $resource)
    {
        return $query->where('resource', $resource);
    }

    /**
     * Scope query to permissions for a specific action.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $action
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope query to permissions for a specific resource and action.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $resource
     * @param string $action
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForResourceAndAction($query, $resource, $action)
    {
        return $query->where('resource', $resource)->where('action', $action);
    }

    /**
     * Get a permission by resource and action.
     *
     * @param string $resource
     * @param string $action
     * @return ?Permission
     */
    public static function getByResourceAndAction($resource, $action)
    {
        return static::query()->forResourceAndAction($resource, $action)->first();
    }

    /**
     * Find or create a permission by resource and action.
     *
     * @param string $resource
     * @param string $action
     * @param string|null $description
     * @return Permission
     */
    public static function findOrCreateByResourceAndAction($resource, $action, $description = null)
    {
        $attributes = [
            'name' => $resource . '.' . $action,
        ];

        if ($description) {
            $attributes['description'] = $description;
        }

        return static::firstOrCreate(
            ['resource' => $resource, 'action' => $action],
            $attributes
        );
    }
}