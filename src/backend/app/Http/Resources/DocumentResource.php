<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource; // Laravel ^10.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Models\Document;
use App\Models\DocumentVerification;

class DocumentResource extends JsonResource
{
    /**
     * Optional custom expiration time for download URLs in minutes
     */
    protected ?int $downloadUrlExpiration = null;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @return void
     */
    public function __construct($resource)
    {
        parent::__construct($resource);
        $this->downloadUrlExpiration = null;
    }

    /**
     * Transform the Document model into an array for API response.
     *
     * @param \Illuminate\Http\Request $request
     * @return array
     */
    public function toArray($request)
    {
        /** @var Document $document */
        $document = $this->resource;

        $data = [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'file_name' => $document->file_name,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'file_size_formatted' => $document->getFileSizeFormatted(),
            'file_extension' => pathinfo($document->file_name, PATHINFO_EXTENSION),
            'is_image' => strpos($document->mime_type, 'image/') === 0,
            'is_pdf' => $document->mime_type === 'application/pdf',
            'is_verified' => (bool) $document->is_verified,
            'download_url' => $document->getDownloadUrl($this->downloadUrlExpiration ?? 60),
            'verified_at' => $document->verified_at ? $document->verified_at->toIso8601String() : null,
            'created_at' => $document->created_at->toIso8601String(),
            'updated_at' => $document->updated_at->toIso8601String(),
        ];
        
        // Include user if relationship is loaded
        if ($document->relationLoaded('user') && $document->user) {
            $data['user'] = [
                'id' => $document->user->id,
                'email' => $document->user->email,
                'full_name' => $document->user->full_name,
            ];
        }
        
        // Include application if relationship is loaded
        if ($document->relationLoaded('application') && $document->application) {
            $data['application'] = [
                'id' => $document->application->id,
                'application_type' => $document->application->application_type,
                'academic_term' => $document->application->academic_term,
                'academic_year' => $document->application->academic_year,
            ];
        }
        
        // Include verifier if relationship is loaded and document is verified
        if ($document->is_verified && $document->relationLoaded('verifier') && $document->verifier) {
            $data['verifier'] = [
                'id' => $document->verifier->id,
                'email' => $document->verifier->email,
                'full_name' => $document->verifier->full_name,
            ];
        }
        
        // Include latest verification if relationship is loaded
        if ($document->relationLoaded('latestVerification') && $document->latestVerification) {
            $verification = $document->latestVerification;
            $data['verification'] = [
                'id' => $verification->id,
                'method' => $verification->verification_method,
                'status' => $verification->verification_status,
                'is_verified' => $verification->verification_status === DocumentVerification::STATUS_VERIFIED,
                'is_rejected' => $verification->verification_status === DocumentVerification::STATUS_REJECTED,
                'is_pending' => $verification->verification_status === DocumentVerification::STATUS_PENDING,
                'confidence_score' => $verification->confidence_score,
                'confidence_percentage' => $verification->getConfidencePercentage(),
                'notes' => $verification->notes,
                'created_at' => $verification->created_at->toIso8601String(),
            ];
            
            if (!empty($verification->verification_data)) {
                $data['verification']['data'] = $verification->verification_data;
            }
            
            if ($verification->relationLoaded('verifier') && $verification->verifier) {
                $data['verification']['verifier'] = [
                    'id' => $verification->verifier->id,
                    'email' => $verification->verifier->email,
                    'full_name' => $verification->verifier->full_name,
                ];
            }
        }
        
        // Include verification history if relationship is loaded
        if ($document->relationLoaded('verifications') && $document->verifications->count() > 0) {
            $data['verification_history'] = $document->verifications->map(function ($verification) {
                $verificationData = [
                    'id' => $verification->id,
                    'method' => $verification->verification_method,
                    'status' => $verification->verification_status,
                    'is_verified' => $verification->verification_status === DocumentVerification::STATUS_VERIFIED,
                    'is_rejected' => $verification->verification_status === DocumentVerification::STATUS_REJECTED,
                    'is_pending' => $verification->verification_status === DocumentVerification::STATUS_PENDING,
                    'confidence_score' => $verification->confidence_score,
                    'confidence_percentage' => $verification->getConfidencePercentage(),
                    'notes' => $verification->notes,
                    'created_at' => $verification->created_at->toIso8601String(),
                ];
                
                if (!empty($verification->verification_data)) {
                    $verificationData['data'] = $verification->verification_data;
                }
                
                if ($verification->relationLoaded('verifier') && $verification->verifier) {
                    $verificationData['verifier'] = [
                        'id' => $verification->verifier->id,
                        'email' => $verification->verifier->email,
                        'full_name' => $verification->verifier->full_name,
                    ];
                }
                
                return $verificationData;
            })->toArray();
        }
        
        return $data;
    }

    /**
     * Add a method to include user in the resource response.
     *
     * @return DocumentResource
     */
    public function withUser()
    {
        /** @var Document $document */
        $document = $this->resource;
        
        if (!$document->relationLoaded('user')) {
            $document->load('user');
        }
        
        return $this;
    }

    /**
     * Add a method to include application in the resource response.
     *
     * @return DocumentResource
     */
    public function withApplication()
    {
        /** @var Document $document */
        $document = $this->resource;
        
        if (!$document->relationLoaded('application')) {
            $document->load('application');
        }
        
        return $this;
    }

    /**
     * Add a method to include verification details in the resource response.
     *
     * @return DocumentResource
     */
    public function withVerification()
    {
        /** @var Document $document */
        $document = $this->resource;
        
        if (!$document->relationLoaded('latestVerification')) {
            $document->load('latestVerification.verifier');
        }
        
        return $this;
    }

    /**
     * Add a method to include full verification history in the resource response.
     *
     * @return DocumentResource
     */
    public function withVerificationHistory()
    {
        /** @var Document $document */
        $document = $this->resource;
        
        if (!$document->relationLoaded('verifications')) {
            $document->load('verifications.verifier');
        }
        
        return $this;
    }

    /**
     * Add a method to include a download URL with custom expiration.
     *
     * @param int $expirationMinutes
     * @return DocumentResource
     */
    public function withDownloadUrl(int $expirationMinutes)
    {
        $this->downloadUrlExpiration = $expirationMinutes;
        
        return $this;
    }
}