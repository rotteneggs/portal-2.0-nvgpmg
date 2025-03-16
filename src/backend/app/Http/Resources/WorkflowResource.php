<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource; // Laravel ^10.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Models\Workflow;
use App\Http\Resources\UserResource;

class WorkflowResource extends JsonResource
{
    /**
     * Flag to determine if stages data should be included
     *
     * @var bool
     */
    protected bool $includeStages = false;

    /**
     * Flag to determine if creator data should be included
     *
     * @var bool
     */
    protected bool $includeCreator = false;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource)
    {
        parent::__construct($resource);
        $this->includeStages = false;
        $this->includeCreator = false;
    }

    /**
     * Transform the Workflow model into an array for API response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        // Ensure we're working with a Workflow model
        /** @var Workflow $workflow */
        $workflow = $this->resource;

        $data = [
            'id' => $workflow->id,
            'name' => $workflow->name,
            'description' => $workflow->description,
            'application_type' => $workflow->application_type,
            'is_active' => $workflow->is_active,
            'created_at' => $workflow->created_at->toIso8601String(),
            'updated_at' => $workflow->updated_at->toIso8601String(),
        ];

        // Include stages data if requested
        if ($this->includeStages) {
            if (!$workflow->relationLoaded('stages')) {
                $workflow->load('stages.assignedRole', 'stages.outgoingTransitions');
            }
            
            $data['stages'] = $workflow->stages->map(function ($stage) {
                return [
                    'id' => $stage->id,
                    'name' => $stage->name,
                    'description' => $stage->description,
                    'sequence' => $stage->sequence,
                    'required_documents' => $stage->required_documents,
                    'required_actions' => $stage->required_actions,
                    'notification_triggers' => $stage->notification_triggers,
                    'assigned_role_id' => $stage->assigned_role_id,
                    'assigned_role' => $stage->assignedRole ? [
                        'id' => $stage->assignedRole->id,
                        'name' => $stage->assignedRole->name,
                    ] : null,
                    'outgoing_transitions' => $stage->outgoingTransitions->map(function ($transition) {
                        return [
                            'id' => $transition->id,
                            'name' => $transition->name,
                            'description' => $transition->description,
                            'source_stage_id' => $transition->source_stage_id,
                            'target_stage_id' => $transition->target_stage_id,
                            'transition_conditions' => $transition->transition_conditions,
                            'required_permissions' => $transition->required_permissions,
                            'is_automatic' => $transition->is_automatic,
                        ];
                    }),
                ];
            });
        }

        // Include creator data if requested
        if ($this->includeCreator) {
            if (!$workflow->relationLoaded('createdBy')) {
                $workflow->load('createdBy');
            }
            
            $data['created_by'] = $workflow->createdBy ? new UserResource($workflow->createdBy) : null;
        }

        return $data;
    }

    /**
     * Add a method to include stages data in the resource response.
     *
     * @return $this
     */
    public function withStages()
    {
        $this->includeStages = true;
        return $this;
    }

    /**
     * Add a method to include creator data in the resource response.
     *
     * @return $this
     */
    public function withCreator()
    {
        $this->includeCreator = true;
        return $this;
    }
}