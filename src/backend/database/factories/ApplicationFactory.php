<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory; // illuminate/database ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use App\Models\Application;
use App\Models\User;
use App\Models\ApplicationStatus;

/**
 * Factory class for generating test Application instances with realistic data for testing and development purposes.
 * This factory creates sample application records with randomized but realistic values for
 * application types, academic terms, and application data.
 */
class ApplicationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Application::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'user_id' => User::factory(),
            'application_type' => $this->faker->randomElement(['undergraduate', 'graduate', 'transfer']),
            'academic_term' => $this->faker->randomElement(['Fall', 'Spring', 'Summer']),
            'academic_year' => $this->faker->randomElement(['2023-2024', '2024-2025', '2025-2026']),
            'current_status_id' => null,
            'application_data' => [
                'personal' => [
                    'first_name' => $this->faker->firstName(),
                    'last_name' => $this->faker->lastName(),
                    'dob' => $this->faker->date('Y-m-d', '-18 years'),
                    'gender' => $this->faker->randomElement(['male', 'female', 'non-binary', 'prefer not to say']),
                    'nationality' => $this->faker->country(),
                ],
                'contact' => [
                    'email' => $this->faker->email(),
                    'phone' => $this->faker->phoneNumber(),
                    'address' => [
                        'street' => $this->faker->streetAddress(),
                        'city' => $this->faker->city(),
                        'state' => $this->faker->state(),
                        'zip' => $this->faker->postcode(),
                        'country' => $this->faker->country(),
                    ],
                ],
                'academic' => [
                    'previous_institution' => $this->faker->company() . ' University',
                    'gpa' => $this->faker->randomFloat(2, 2.0, 4.0),
                    'major' => $this->faker->randomElement(['Computer Science', 'Business', 'Engineering', 'Biology', 'Psychology', 'English']),
                    'degree' => $this->faker->randomElement(['Bachelor of Science', 'Bachelor of Arts', 'Associate Degree', 'High School Diploma']),
                    'graduation_date' => $this->faker->date('Y-m-d', '-1 year'),
                ],
                'program' => [
                    'desired_major' => $this->faker->randomElement(['Computer Science', 'Business Administration', 'Electrical Engineering', 'Biology', 'Psychology', 'English Literature']),
                    'start_date' => $this->faker->date('Y-m-d', '+6 months'),
                    'study_preference' => $this->faker->randomElement(['full-time', 'part-time']),
                ],
                'additional' => [
                    'how_did_you_hear' => $this->faker->randomElement(['website', 'friend', 'advertisement', 'school counselor', 'alumni']),
                    'questions_comments' => $this->faker->optional(0.3)->paragraph(),
                ],
            ],
            'is_submitted' => false,
            'submitted_at' => null,
            'created_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'updated_at' => function (array $attributes) {
                return $this->faker->dateTimeBetween($attributes['created_at'], 'now');
            },
        ];
    }

    /**
     * State modifier to mark the application as submitted.
     *
     * @return self
     */
    public function submitted()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_submitted' => true,
                'submitted_at' => $this->faker->dateTimeBetween($attributes['created_at'], 'now'),
            ];
        });
    }

    /**
     * State modifier to ensure the application is in draft state.
     *
     * @return self
     */
    public function draft()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_submitted' => false,
                'submitted_at' => null,
            ];
        });
    }

    /**
     * State modifier to associate the application with a specific user.
     *
     * @param int|User $userId
     * @return self
     */
    public function forUser($userId)
    {
        if ($userId instanceof User) {
            $userId = $userId->id;
        }

        return $this->state(function (array $attributes) use ($userId) {
            return [
                'user_id' => $userId,
            ];
        });
    }

    /**
     * State modifier to associate the application with a status.
     *
     * @param string $status
     * @return self
     */
    public function withStatus($status)
    {
        return $this->state(function (array $attributes) use ($status) {
            return [
                'is_submitted' => $status !== 'draft',
                'submitted_at' => $status === 'draft' ? null : $this->faker->dateTimeBetween($attributes['created_at'], 'now'),
            ];
        })->afterCreating(function (Application $application) use ($status) {
            // Create a status record for this application
            $applicationStatus = ApplicationStatus::factory()->create([
                'application_id' => $application->id,
                'status' => $status,
                'created_by_user_id' => User::factory(),
            ]);
            
            // Update the application to reference this status
            $application->update([
                'current_status_id' => $applicationStatus->id,
            ]);
        });
    }

    /**
     * State modifier to create an undergraduate application.
     *
     * @return self
     */
    public function undergraduate()
    {
        return $this->state(function (array $attributes) {
            $applicationData = $attributes['application_data'];
            
            // Add undergraduate-specific fields
            $applicationData['academic']['sat_score'] = $this->faker->numberBetween(1000, 1600);
            $applicationData['academic']['act_score'] = $this->faker->numberBetween(18, 36);
            $applicationData['academic']['high_school'] = $this->faker->company() . ' High School';
            
            return [
                'application_type' => 'undergraduate',
                'application_data' => $applicationData,
            ];
        });
    }

    /**
     * State modifier to create a graduate application.
     *
     * @return self
     */
    public function graduate()
    {
        return $this->state(function (array $attributes) {
            $applicationData = $attributes['application_data'];
            
            // Add graduate-specific fields
            $applicationData['academic']['graduate_program'] = $this->faker->randomElement(['Masters', 'PhD', 'MBA', 'JD']);
            $applicationData['academic']['research_interests'] = $this->faker->paragraph();
            $applicationData['academic']['publications'] = $this->faker->optional(0.4)->sentences(3, true);
            $applicationData['academic']['gre_score'] = $this->faker->numberBetween(280, 340);
            
            return [
                'application_type' => 'graduate',
                'application_data' => $applicationData,
            ];
        });
    }

    /**
     * State modifier to create a transfer application.
     *
     * @return self
     */
    public function transfer()
    {
        return $this->state(function (array $attributes) {
            $applicationData = $attributes['application_data'];
            
            // Add transfer-specific fields
            $applicationData['academic']['transfer_credits'] = $this->faker->numberBetween(15, 90);
            $applicationData['academic']['current_institution'] = $this->faker->company() . ' University';
            $applicationData['academic']['reason_for_transfer'] = $this->faker->paragraph();
            
            return [
                'application_type' => 'transfer',
                'application_data' => $applicationData,
            ];
        });
    }

    /**
     * State modifier to create associated documents for the application.
     *
     * @param int $count
     * @return self
     */
    public function withDocuments($count = 3)
    {
        return $this->afterCreating(function (Application $application) use ($count) {
            $documentTypes = ['transcript', 'personal_statement', 'recommendation_letter', 'resume', 'test_scores'];
            $selectedTypes = array_slice($documentTypes, 0, min($count, count($documentTypes)));
            
            foreach ($selectedTypes as $type) {
                \App\Models\Document::factory()->create([
                    'user_id' => $application->user_id,
                    'application_id' => $application->id,
                    'document_type' => $type,
                ]);
            }
        });
    }

    /**
     * Configure the model factory using the given closure.
     *
     * @param \Closure $callback
     * @return self
     */
    public function configure($callback = null)
    {
        if ($callback) {
            return $this->afterMaking($callback);
        }
        
        return $this;
    }
}