<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // Laravel ^10.0
use Illuminate\Support\Facades\Auth; // Laravel ^10.0
use Illuminate\Validation\Rule; // Laravel ^10.0
use App\Models\Workflow;
use App\Models\User;

class WorkflowStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return Auth::user() && Auth::user()->hasPermissionTo('create', 'workflows');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('workflows', 'name')
            ],
            'description' => 'nullable|string',
            'application_type' => [
                'required',
                'string',
                Rule::in(['undergraduate', 'graduate', 'transfer'])
            ],
            'is_active' => 'boolean',
            
            // Stages validation
            'stages' => 'required|array|min:1',
            'stages.*.name' => 'required|string|max:100',
            'stages.*.description' => 'nullable|string',
            'stages.*.sequence' => 'required|integer|min:1',
            'stages.*.required_documents' => 'nullable|array',
            'stages.*.required_actions' => 'nullable|array',
            'stages.*.notification_triggers' => 'nullable|array',
            'stages.*.assigned_role_id' => 'nullable|exists:roles,id',
            
            // Transitions validation
            'transitions' => 'present|array',
            'transitions.*.source_stage_id' => 'required',
            'transitions.*.target_stage_id' => 'required|different:transitions.*.source_stage_id',
            'transitions.*.name' => 'required|string|max:100',
            'transitions.*.description' => 'nullable|string',
            'transitions.*.transition_conditions' => 'nullable|array',
            'transitions.*.required_permissions' => 'nullable|array',
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
            'name.required' => 'A workflow name is required.',
            'name.unique' => 'This workflow name already exists.',
            'application_type.required' => 'Application type is required.',
            'application_type.in' => 'The selected application type is invalid.',
            'stages.required' => 'At least one stage is required for the workflow.',
            'stages.min' => 'At least one stage is required for the workflow.',
            'stages.*.name.required' => 'Each stage must have a name.',
            'stages.*.sequence.required' => 'Each stage must have a sequence number.',
            'stages.*.sequence.min' => 'Stage sequence must be 1 or greater.',
            'stages.*.assigned_role_id.exists' => 'The assigned role does not exist.',
            'transitions.*.source_stage_id.required' => 'Each transition must have a source stage.',
            'transitions.*.target_stage_id.required' => 'Each transition must have a target stage.',
            'transitions.*.target_stage_id.different' => 'Source and target stages must be different.',
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
            // Only perform these additional validations if the initial validation passes
            if (!$validator->errors()->isEmpty()) {
                return;
            }

            $stages = $this->input('stages', []);
            $transitions = $this->input('transitions', []);
            
            // Create stage ID map (supporting both numeric indices and temp_id if present)
            $stageMap = [];
            foreach ($stages as $index => $stage) {
                // Map the array index
                $stageMap[(string)$index] = $index;
                
                // If the stage has a temp_id, map that too
                if (isset($stage['temp_id'])) {
                    $stageMap[(string)$stage['temp_id']] = $index;
                }
            }
            
            // Check if transitions reference valid stages within the workflow
            foreach ($transitions as $index => $transition) {
                $sourceId = (string)$transition['source_stage_id'];
                $targetId = (string)$transition['target_stage_id'];
                
                if (!isset($stageMap[$sourceId])) {
                    $validator->errors()->add(
                        "transitions.{$index}.source_stage_id",
                        "The source stage '{$sourceId}' does not exist in the stages array."
                    );
                }
                
                if (!isset($stageMap[$targetId])) {
                    $validator->errors()->add(
                        "transitions.{$index}.target_stage_id",
                        "The target stage '{$targetId}' does not exist in the stages array."
                    );
                }
            }
            
            // Check if stage sequences are unique
            $sequences = collect($stages)->pluck('sequence')->toArray();
            if (count($sequences) !== count(array_unique($sequences))) {
                $validator->errors()->add(
                    'stages',
                    'Stage sequence numbers must be unique within the workflow.'
                );
            }
            
            // Check for circular transitions
            if (!empty($transitions)) {
                // Create an adjacency list representation of the transition graph
                $graph = [];
                foreach ($transitions as $transition) {
                    $source = (string)$transition['source_stage_id'];
                    $target = (string)$transition['target_stage_id'];
                    
                    // Map to array indices if using temp_ids
                    $source = isset($stageMap[$source]) ? $stageMap[$source] : $source;
                    $target = isset($stageMap[$target]) ? $stageMap[$target] : $target;
                    
                    if (!isset($graph[$source])) {
                        $graph[$source] = [];
                    }
                    
                    $graph[$source][] = $target;
                }
                
                // Function to detect cycles in the graph using DFS
                $detectCycle = function($node, &$visited, &$recStack) use (&$detectCycle, &$graph) {
                    // Mark the current node as visited and part of recursion stack
                    $visited[$node] = true;
                    $recStack[$node] = true;
                    
                    // Check all adjacent vertices
                    if (isset($graph[$node])) {
                        foreach ($graph[$node] as $adjacent) {
                            // If not visited, recursively check
                            if (!isset($visited[$adjacent]) && $detectCycle($adjacent, $visited, $recStack)) {
                                return true;
                            } 
                            // If the adjacent vertex is in the recursion stack, there's a cycle
                            else if (isset($recStack[$adjacent]) && $recStack[$adjacent]) {
                                return true;
                            }
                        }
                    }
                    
                    // Remove the vertex from recursion stack
                    $recStack[$node] = false;
                    return false;
                };
                
                // Check each node for cycles
                $visited = [];
                $recStack = [];
                
                foreach (array_keys($graph) as $node) {
                    if (!isset($visited[$node])) {
                        if ($detectCycle($node, $visited, $recStack)) {
                            $validator->errors()->add(
                                'transitions',
                                'Circular transitions detected in the workflow. Transitions cannot form loops.'
                            );
                            break;
                        }
                    }
                }
            }
            
            // Ensure at least one initial stage exists (no incoming transitions or sequence = 1)
            if (!empty($stages)) {
                $hasInitialStage = false;
                
                // First, gather all stages that have incoming transitions
                $stagesWithIncoming = [];
                foreach ($transitions as $transition) {
                    $targetId = (string)$transition['target_stage_id'];
                    
                    // Convert to array index if using temp_id
                    if (isset($stageMap[$targetId])) {
                        $targetIndex = $stageMap[$targetId];
                        $stagesWithIncoming[$targetIndex] = true;
                    }
                }
                
                // Check each stage to see if it's an initial stage
                foreach (array_keys($stages) as $index) {
                    // If the stage has no incoming transitions or has sequence 1
                    if (!isset($stagesWithIncoming[$index]) || $stages[$index]['sequence'] === 1) {
                        $hasInitialStage = true;
                        break;
                    }
                }
                
                if (!$hasInitialStage) {
                    $validator->errors()->add(
                        'stages',
                        'The workflow must have at least one initial stage with no incoming transitions or with sequence 1.'
                    );
                }
            }
        });
    }
}