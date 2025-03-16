<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use App\Http\Resources\UserResource;
use App\Http\Resources\DocumentResource;
use App\Models\Application;

class ApplicationResource extends JsonResource
{
    /**
     * Flag to determine if user data should be included
     *
     * @var bool
     */
    protected bool $includeUser = false;

    /**
     * Flag to determine if documents should be included
     *
     * @var bool
     */
    protected bool $includeDocuments = false;

    /**
     * Flag to determine if status history should be included
     *
     * @var bool
     */
    protected bool $includeStatuses = false;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource)
    {
        parent::__construct($resource);
        $this->includeUser = false;
        $this->includeDocuments = false;
        $this->includeStatuses = false;
    }

    /**
     * Transform the Application model into an array for API response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        /** @var Application $application */
        $application = $this->resource;

        $data = [
            'id' => $application->id,
            'application_type' => $application->application_type,
            'academic_term' => $application->academic_term,
            'academic_year' => $application->academic_year,
            'is_submitted' => $application->is_submitted,
            'submitted_at' => $application->submitted_at ? $application->submitted_at->toIso8601String() : null,
            'status_id' => $application->current_status_id,
            'status_label' => $application->getStatusLabel(),
            'is_complete' => $application->isComplete(),
            'created_at' => $application->created_at->toIso8601String(),
            'updated_at' => $application->updated_at->toIso8601String(),
        ];
        
        // Include application data if present
        if (!empty($application->application_data)) {
            $data['application_data'] = $application->application_data;
        }

        // Add missing documents if not complete
        if (!$data['is_complete']) {
            $data['missing_documents'] = $application->getMissingDocuments();
        }

        // Include user data if requested
        if ($this->includeUser) {
            $user = $application->relationLoaded('user') 
                ? $application->user 
                : $application->user()->first();
                
            if ($user) {
                $data['user'] = (new UserResource($user))->withProfile();
            }
        }

        // Include documents if requested
        if ($this->includeDocuments) {
            $documents = $application->relationLoaded('documents')
                ? $application->documents
                : $application->documents()->get();
            
            $data['documents'] = DocumentResource::collection($documents);
        }

        // Include status history if requested
        if ($this->includeStatuses) {
            $statuses = $application->relationLoaded('statuses')
                ? $application->statuses
                : $application->statuses()->with('workflowStage')->orderBy('created_at', 'desc')->get();
            
            $data['statuses'] = $statuses->map(function ($status) {
                $statusData = [
                    'id' => $status->id,
                    'status' => $status->status,
                    'notes' => $status->notes,
                    'created_by_user_id' => $status->created_by_user_id,
                    'created_at' => $status->created_at->toIso8601String(),
                ];
                
                if ($status->workflow_stage_id && $status->relationLoaded('workflowStage') && $status->workflowStage) {
                    $statusData['workflow_stage'] = [
                        'id' => $status->workflowStage->id,
                        'name' => $status->workflowStage->name,
                    ];
                }
                
                return $statusData;
            });
        }

        return $data;
    }

    /**
     * Add a method to include user data in the resource response.
     *
     * @return $this
     */
    public function withUser()
    {
        $this->includeUser = true;
        return $this;
    }

    /**
     * Add a method to include documents in the resource response.
     *
     * @return $this
     */
    public function withDocuments()
    {
        $this->includeDocuments = true;
        return $this;
    }

    /**
     * Add a method to include status history in the resource response.
     *
     * @return $this
     */
    public function withStatuses()
    {
        $this->includeStatuses = true;
        return $this;
    }
}