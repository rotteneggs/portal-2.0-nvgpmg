<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

/**
 * Factory class for creating test User instances with associated UserProfile data
 */
class UserFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = User::class;

    /**
     * Define the default state of the User model
     *
     * @return array
     */
    public function definition()
    {
        return [
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
            'is_active' => true,
            'last_login_at' => null,
            'mfa_secret' => null,
        ];
    }

    /**
     * Indicate that the user's email address is unverified
     *
     * @return static
     */
    public function unverified()
    {
        return $this->state([
            'email_verified_at' => null,
        ]);
    }

    /**
     * Set the user account as inactive
     *
     * @return static
     */
    public function inactive()
    {
        return $this->state([
            'is_active' => false,
        ]);
    }

    /**
     * Set up multi-factor authentication for the user
     *
     * @return static
     */
    public function withMfa()
    {
        return $this->state([
            'mfa_secret' => Str::random(32),
        ]);
    }

    /**
     * Configure the model to create an associated UserProfile
     *
     * @param array $attributes
     * @return static
     */
    public function withProfile(array $attributes = [])
    {
        return $this->afterCreating(function (User $user) use ($attributes) {
            UserProfile::factory()->create(array_merge([
                'user_id' => $user->id,
                'first_name' => $this->faker->firstName(),
                'last_name' => $this->faker->lastName(),
                'date_of_birth' => $this->faker->date('Y-m-d', '-18 years'),
                'phone_number' => $this->faker->phoneNumber(),
                'address_line1' => $this->faker->streetAddress(),
                'address_line2' => $this->faker->optional(0.3)->secondaryAddress(),
                'city' => $this->faker->city(),
                'state' => $this->faker->state(),
                'postal_code' => $this->faker->postcode(),
                'country' => $this->faker->country(),
                'notification_preferences' => [
                    'email' => true,
                    'sms' => false,
                    'push' => false,
                ],
            ], $attributes));
        });
    }

    /**
     * Configure the factory to always create an associated UserProfile
     *
     * @return static
     */
    public function configure()
    {
        return $this->withProfile();
    }
}