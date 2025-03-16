<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // Laravel ^10.0
use Illuminate\Support\Facades\Auth; // Laravel ^10.0
use Illuminate\Validation\Rule; // Laravel ^10.0
use App\Models\Workflow;
use App\Models\User;

class WorkflowUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        // Get the authenticated user
        $user = Auth::user();
        
        // Check if the user has the 'workflows.update' permission
        return $user && $user->hasPermissionTo('update', 'workflows');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        // Get the workflow ID from the route parameters
        $workflowId = $this->route('workflow');
        
        return [
            // Define validation rules for name (required, string, max:100, unique in workflows table except for the current workflow)
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('workflows')->ignore($workflowId),
            ],
            
            // Define validation rules for description (nullable, string)
            'description' => 'nullable|string',
            
            // Define validation rules for application_type (required, string, in list of valid types)
            'application_type' => [
                'required',
                'string',
                Rule::in(['undergraduate', 'graduate', 'transfer', 'international']),
            ],
            
            // Define validation rules for is_active (boolean)
            'is_active' => 'boolean',
            
            // Define validation rules for stages (array)
            'stages' => 'required|array',
            
            // Define nested validation rules for stages.*.id (nullable, exists:workflow_stages,id)
            'stages.*.id' => 'nullable|exists:workflow_stages,id',
            
            // Define nested validation rules for stages.*.name (required, string, max:100)
            'stages.*.name' => 'required|string|max:100',
            
            // Define nested validation rules for stages.*.description (nullable, string)
            'stages.*.description' => 'nullable|string',
            
            // Define nested validation rules for stages.*.sequence (required, integer, min:1)
            'stages.*.sequence' => 'required|integer|min:1',
            
            // Define nested validation rules for stages.*.required_documents (nullable, array)
            'stages.*.required_documents' => 'nullable|array',
            
            // Define nested validation rules for stages.*.required_actions (nullable, array)
            'stages.*.required_actions' => 'nullable|array',
            
            // Define nested validation rules for stages.*.notification_triggers (nullable, array)
            'stages.*.notification_triggers' => 'nullable|array',
            
            // Define nested validation rules for stages.*.assigned_role_id (nullable, exists:roles,id)
            'stages.*.assigned_role_id' => 'nullable|exists:roles,id',
            
            // Define validation rules for transitions (array)
            'transitions' => 'required|array',
            
            // Define nested validation rules for transitions.*.id (nullable, exists:workflow_transitions,id)
            'transitions.*.id' => 'nullable|exists:workflow_transitions,id',
            
            // Define nested validation rules for transitions.*.source_stage_id (required, integer)
            'transitions.*.source_stage_id' => 'required|integer',
            
            // Define nested validation rules for transitions.*.target_stage_id (required, integer, different from source_stage_id)
            'transitions.*.target_stage_id' => 'required|integer|different:transitions.*.source_stage_id',
            
            // Define nested validation rules for transitions.*.name (required, string, max:100)
            'transitions.*.name' => 'required|string|max:100',
            
            // Define nested validation rules for transitions.*.description (nullable, string)
            'transitions.*.description' => 'nullable|string',
            
            // Define nested validation rules for transitions.*.transition_conditions (nullable, array)
            'transitions.*.transition_conditions' => 'nullable|array',
            
            // Define nested validation rules for transitions.*.required_permissions (nullable, array)
            'transitions.*.required_permissions' => 'nullable|array',
            
            // Define nested validation rules for transitions.*.is_automatic (boolean)
            'transitions.*.is_automatic' => 'boolean',
        ];
    }

    /**
     * Get custom validation error messages.
     *
     * @return array
     */
    public function messages()
    {
        return [
            // Define custom error message for name.required
            'name.required' => 'A workflow name is required.',
            
            // Define custom error message for name.unique
            'name.unique' => 'This workflow name is already in use.',
            
            // Define custom error message for application_type.required
            'application_type.required' => 'The application type is required.',
            
            // Define custom error message for application_type.in
            'application_type.in' => 'The selected application type is invalid.',
            
            // Define custom error message for stages.required
            'stages.required' => 'At least one workflow stage is required.',
            
            // Define custom error message for stages.array
            'stages.array' => 'Stages must be provided as an array.',
            
            // Define custom error message for stages.*.name.required
            'stages.*.name.required' => 'Each stage must have a name.',
            
            // Define custom error message for stages.*.sequence.required
            'stages.*.sequence.required' => 'Each stage must have a sequence number.',
            
            // Define custom error message for stages.*.sequence.min
            'stages.*.sequence.min' => 'Sequence numbers must be at least 1.',
            
            // Define custom error message for stages.*.assigned_role_id.exists
            'stages.*.assigned_role_id.exists' => 'The assigned role does not exist.',
            
            // Define custom error message for transitions.*.source_stage_id.required
            'transitions.*.source_stage_id.required' => 'Each transition must have a source stage.',
            
            // Define custom error message for transitions.*.target_stage_id.required
            'transitions.*.target_stage_id.required' => 'Each transition must have a target stage.',
            
            // Define custom error message for transitions.*.target_stage_id.different
            'transitions.*.target_stage_id.different' => 'Source and target stages must be different.',
            
            // Define custom error message for transitions.*.name.required
            'transitions.*.name.required' => 'Each transition must have a name.',
        ];
    }

    /**
     * Add additional validation logic after the main validation rules are applied.
     *
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Add a custom validator to check if transitions reference valid stages within the workflow
            // Add a custom validator to ensure stage sequences are unique
            // Add a custom validator to ensure there are no circular transitions
            // Add a custom validator to ensure at least one initial stage exists
            // Add a custom validator to ensure existing stages and transitions belong to the workflow being updated
            // Add any other workflow-specific validation logic
        });
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    public function prepareForValidation()
    {
        $data = $this->all();
        
        // Ensure stages array is present even if empty
        if (!isset($data['stages'])) {
            $data['stages'] = [];
        }
        
        // Ensure transitions array is present even if empty
        if (!isset($data['transitions'])) {
            $data['transitions'] = [];
        }
        
        // Convert JSON strings to arrays if needed
        foreach (['stages', 'transitions'] as $key) {
            if (isset($data[$key]) && is_string($data[$key])) {
                $data[$key] = json_decode($data[$key], true) ?? [];
            }
        }
        
        // Set default values for nullable fields
        if (isset($data['is_active']) && is_null($data['is_active'])) {
            $data['is_active'] = false;
        }
        
        $this->replace($data);
    }
}