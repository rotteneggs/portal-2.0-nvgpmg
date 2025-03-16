<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\User;
use App\Models\Application;
use Illuminate\Database\Eloquent\Factories\Factory; // illuminate/database ^10.0
use Illuminate\Support\Str; // illuminate/support ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0

/**
 * Factory class for generating test Document model instances with realistic data
 */
class DocumentFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Document::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $documentTypes = ['transcript', 'identification', 'recommendation', 'personal_statement', 'resume', 'test_score'];
        $documentType = $this->faker->randomElement($documentTypes);
        
        // Generate file name based on document type
        $fileName = $this->generateFileName($documentType);
        
        // Determine mime type based on document type
        $mimeType = $this->getMimeType($documentType);
        
        // Generate a realistic file size (100KB to 10MB)
        $fileSize = $this->faker->numberBetween(100 * 1024, 10 * 1024 * 1024);
        
        return [
            'user_id' => User::factory(),
            'application_id' => Application::factory(),
            'document_type' => $documentType,
            'file_name' => $fileName,
            'file_path' => 'documents/' . $documentType . '/' . $fileName,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'is_verified' => false,
            'verified_at' => null,
            'verified_by_user_id' => null,
            'created_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'updated_at' => function (array $attributes) {
                return $this->faker->dateTimeBetween($attributes['created_at'], 'now');
            },
        ];
    }
    
    /**
     * Generate a realistic file name based on document type.
     *
     * @param string $documentType
     * @return string
     */
    private function generateFileName($documentType)
    {
        $year = date('Y');
        
        switch ($documentType) {
            case 'transcript':
                return 'transcript_' . $year . '.pdf';
            case 'identification':
                return 'id_' . Str::random(8) . '.jpg';
            case 'recommendation':
                return 'recommendation_letter_' . Str::random(6) . '.pdf';
            case 'personal_statement':
                return 'personal_statement_' . $year . '.pdf';
            case 'resume':
                return 'resume_' . $year . '.pdf';
            case 'test_score':
                return 'test_score_report_' . $year . '.pdf';
            default:
                return 'document_' . Str::random(8) . '.pdf';
        }
    }
    
    /**
     * Determine mime type based on document type.
     *
     * @param string $documentType
     * @return string
     */
    private function getMimeType($documentType)
    {
        switch ($documentType) {
            case 'identification':
                return $this->faker->randomElement(['image/jpeg', 'image/png']);
            case 'personal_statement':
                return $this->faker->randomElement([
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ]);
            default:
                return 'application/pdf';
        }
    }
    
    /**
     * State modifier to mark the document as verified
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function verified()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_verified' => true,
                'verified_at' => $this->faker->dateTimeBetween($attributes['created_at'], 'now'),
                'verified_by_user_id' => User::factory(),
            ];
        });
    }
    
    /**
     * State modifier to ensure the document is unverified
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function unverified()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_verified' => false,
                'verified_at' => null,
                'verified_by_user_id' => null,
            ];
        });
    }
    
    /**
     * State modifier to associate the document with a specific user
     *
     * @param int|User $userId
     * @return \Illuminate\Database\Eloquent\Factories\Factory
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
     * State modifier to associate the document with a specific application
     *
     * @param int|Application $applicationId
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function forApplication($applicationId)
    {
        if ($applicationId instanceof Application) {
            $applicationId = $applicationId->id;
        }
        
        return $this->state(function (array $attributes) use ($applicationId) {
            return [
                'application_id' => $applicationId,
            ];
        });
    }
    
    /**
     * State modifier to set the document type
     *
     * @param string $type
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function ofType($type)
    {
        return $this->state(function (array $attributes) use ($type) {
            $fileName = $this->generateFileName($type);
            $mimeType = $this->getMimeType($type);
            
            return [
                'document_type' => $type,
                'file_name' => $fileName,
                'file_path' => 'documents/' . $type . '/' . $fileName,
                'mime_type' => $mimeType,
            ];
        });
    }
    
    /**
     * State modifier to create a transcript document
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function transcript()
    {
        return $this->ofType('transcript');
    }
    
    /**
     * State modifier to create an identification document
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function identification()
    {
        return $this->ofType('identification');
    }
    
    /**
     * State modifier to create a recommendation letter document
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function recommendation()
    {
        return $this->ofType('recommendation');
    }
    
    /**
     * State modifier to create a personal statement document
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function personalStatement()
    {
        return $this->ofType('personal_statement');
    }
    
    /**
     * State modifier to create associated verification records for the document
     *
     * @param int $count
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function withVerification($count = 1)
    {
        return $this->has(
            \App\Models\DocumentVerification::factory()->count($count),
            'verifications'
        );
    }
    
    /**
     * Configure the model factory using the given closure
     *
     * @param \Closure $callback
     * @return $this
     */
    public function configure($callback = null)
    {
        if ($callback) {
            return parent::configure($callback);
        }
        
        return $this;
    }
}