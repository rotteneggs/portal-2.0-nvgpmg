<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Database\Eloquent\Model; // Laravel ^10.0

class UserProfile extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_profiles';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'date_of_birth',
        'phone_number',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'postal_code',
        'country',
        'notification_preferences',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'date_of_birth' => 'date',
        'notification_preferences' => 'json',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'full_name',
        'formatted_address',
    ];

    /**
     * Define the inverse of the one-to-one relationship with User.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    /**
     * Get the user's full name by combining first and last name.
     *
     * @return string
     */
    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Get the user's formatted address as a single string.
     *
     * @return string
     */
    public function getFormattedAddressAttribute()
    {
        $addressParts = [];
        
        if (!empty($this->address_line1)) {
            $addressParts[] = $this->address_line1;
        }
        
        if (!empty($this->address_line2)) {
            $addressParts[] = $this->address_line2;
        }
        
        $cityStateZip = [];
        if (!empty($this->city)) {
            $cityStateZip[] = $this->city;
        }
        
        if (!empty($this->state)) {
            $cityStateZip[] = $this->state;
        }
        
        if (!empty($this->postal_code)) {
            $cityStateZip[] = $this->postal_code;
        }
        
        if (!empty($cityStateZip)) {
            $addressParts[] = implode(', ', $cityStateZip);
        }
        
        if (!empty($this->country)) {
            $addressParts[] = $this->country;
        }
        
        return implode("\n", $addressParts);
    }

    /**
     * Scope query to search for profiles by name.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $searchTerm
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSearch($query, $searchTerm)
    {
        return $query->where(function ($query) use ($searchTerm) {
            $term = '%' . $searchTerm . '%';
            $query->where('first_name', 'LIKE', $term)
                  ->orWhere('last_name', 'LIKE', $term);
        });
    }
}