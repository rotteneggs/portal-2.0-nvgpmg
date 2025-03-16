<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Workflow;
use App\Models\WorkflowStage;
use App\Models\WorkflowTransition;
use App\Models\Role;

class WorkflowTemplatesSeeder extends Seeder
{
    /**
     * Execute the database seeds to create workflow templates.
     *
     * @return void
     */
    public function run()
    {
        DB::transaction(function () {
            $this->createUndergraduateWorkflow();
            $this->createGraduateWorkflow();
            $this->createTransferWorkflow();
            
            $this->command->info('Workflow templates seeded successfully!');
        });
    }

    /**
     * Create the default workflow template for undergraduate applications.
     *
     * @return \App\Models\Workflow
     */
    private function createUndergraduateWorkflow()
    {
        // Create the workflow
        $workflow = Workflow::create([
            'name' => 'Undergraduate Admissions',
            'description' => 'Standard workflow for undergraduate admissions process',
            'application_type' => 'undergraduate',
            'is_active' => true,
            'created_by_user_id' => 1, // Assuming admin user has ID 1
        ]);
        
        $this->command->info('Creating undergraduate workflow stages...');
        
        // Create workflow stages
        $submissionStage = $this->createWorkflowStage(
            $workflow->id,
            'Application Submission',
            'Initial application submission by the applicant',
            1,
            [], // No required documents yet
            [
                ['name' => 'complete_application', 'description' => 'Complete all required application fields']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_started'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'application_submitted']
            ],
            'Applicant'
        );
        
        $documentStage = $this->createWorkflowStage(
            $workflow->id,
            'Document Verification',
            'Verification of required documents',
            2,
            [
                ['name' => 'transcript', 'required' => true, 'description' => 'Academic transcript'],
                ['name' => 'id_document', 'required' => true, 'description' => 'Government-issued ID'],
                ['name' => 'personal_statement', 'required' => true, 'description' => 'Personal statement'],
                ['name' => 'recommendation_letters', 'required' => true, 'count' => 2, 'description' => 'Letters of recommendation']
            ],
            [
                ['name' => 'upload_documents', 'description' => 'Upload all required documents']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'documents_required'],
                ['event' => 'document_verified', 'channel' => 'in_app', 'template' => 'document_verified'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'documents_verified']
            ],
            'Document Verification Team'
        );
        
        $initialReviewStage = $this->createWorkflowStage(
            $workflow->id,
            'Initial Review',
            'Preliminary review of the application by admissions staff',
            3,
            [],
            [
                ['name' => 'review_application', 'description' => 'Review application details and documents']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_in_review'],
            ],
            'Admissions Staff'
        );
        
        $additionalInfoStage = $this->createWorkflowStage(
            $workflow->id,
            'Additional Information',
            'Request and review additional information from the applicant',
            4,
            [],
            [
                ['name' => 'request_information', 'description' => 'Request specific additional information'],
                ['name' => 'review_additional_info', 'description' => 'Review provided additional information']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'additional_info_required'],
                ['event' => 'info_received', 'channel' => 'in_app', 'template' => 'info_received']
            ],
            'Admissions Staff'
        );
        
        $committeeReviewStage = $this->createWorkflowStage(
            $workflow->id,
            'Committee Review',
            'Review of the application by the admissions committee',
            5,
            [],
            [
                ['name' => 'committee_review', 'description' => 'Conduct committee review of application']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'committee_review']
            ],
            'Admissions Committee'
        );
        
        $decisionStage = $this->createWorkflowStage(
            $workflow->id,
            'Decision',
            'Final decision on the application',
            6,
            [],
            [
                ['name' => 'make_decision', 'description' => 'Make final decision on application']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'decision_pending']
            ],
            'Admissions Director'
        );
        
        $acceptedStage = $this->createWorkflowStage(
            $workflow->id,
            'Accepted',
            'Application has been accepted',
            7,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_accepted']
            ],
            'Admissions Staff'
        );
        
        $rejectedStage = $this->createWorkflowStage(
            $workflow->id,
            'Rejected',
            'Application has been rejected',
            8,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_rejected']
            ],
            'Admissions Staff'
        );
        
        $waitlistedStage = $this->createWorkflowStage(
            $workflow->id,
            'Waitlisted',
            'Application has been placed on the waitlist',
            9,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_waitlisted']
            ],
            'Admissions Staff'
        );
        
        $enrollmentStage = $this->createWorkflowStage(
            $workflow->id,
            'Enrollment',
            'Student has confirmed enrollment',
            10,
            [],
            [
                ['name' => 'pay_deposit', 'description' => 'Pay enrollment deposit'],
                ['name' => 'complete_enrollment', 'description' => 'Complete enrollment forms']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'enrollment_steps'],
                ['event' => 'deposit_received', 'channel' => 'email', 'template' => 'deposit_confirmed'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'enrollment_completed']
            ],
            'Enrollment Team'
        );
        
        $this->command->info('Creating undergraduate workflow transitions...');
        
        // Create workflow transitions
        // From Submission to Document Verification
        $this->createWorkflowTransition(
            $submissionStage->id,
            $documentStage->id,
            'Submit Application',
            'Application is submitted for document verification',
            [
                ['field' => 'is_submitted', 'operator' => '=', 'value' => true]
            ],
            [],
            true // Automatic transition
        );
        
        // From Document Verification to Initial Review
        $this->createWorkflowTransition(
            $documentStage->id,
            $initialReviewStage->id,
            'Verify Documents',
            'Documents are verified and application moves to initial review',
            [
                ['field' => 'documents_verified', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'verify', 'resource' => 'documents']
            ],
            false // Manual transition
        );
        
        // From Initial Review to Additional Information
        $this->createWorkflowTransition(
            $initialReviewStage->id,
            $additionalInfoStage->id,
            'Request Additional Information',
            'Request additional information from the applicant',
            [],
            [
                ['action' => 'request', 'resource' => 'additional_information']
            ],
            false // Manual transition
        );
        
        // From Initial Review to Committee Review
        $this->createWorkflowTransition(
            $initialReviewStage->id,
            $committeeReviewStage->id,
            'Send to Committee',
            'Forward application to the admissions committee',
            [],
            [
                ['action' => 'forward', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Additional Information to Initial Review
        $this->createWorkflowTransition(
            $additionalInfoStage->id,
            $initialReviewStage->id,
            'Information Received',
            'Additional information has been received and reviewed',
            [
                ['field' => 'additional_info_provided', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'review', 'resource' => 'additional_information']
            ],
            false // Manual transition
        );
        
        // From Committee Review to Decision
        $this->createWorkflowTransition(
            $committeeReviewStage->id,
            $decisionStage->id,
            'Committee Recommendation',
            'Committee has made a recommendation',
            [
                ['field' => 'committee_review_completed', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'recommend', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Accepted
        $this->createWorkflowTransition(
            $decisionStage->id,
            $acceptedStage->id,
            'Accept Application',
            'Application is accepted',
            [],
            [
                ['action' => 'approve', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Rejected
        $this->createWorkflowTransition(
            $decisionStage->id,
            $rejectedStage->id,
            'Reject Application',
            'Application is rejected',
            [],
            [
                ['action' => 'reject', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Waitlisted
        $this->createWorkflowTransition(
            $decisionStage->id,
            $waitlistedStage->id,
            'Waitlist Application',
            'Application is placed on waitlist',
            [],
            [
                ['action' => 'waitlist', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Accepted to Enrollment
        $this->createWorkflowTransition(
            $acceptedStage->id,
            $enrollmentStage->id,
            'Begin Enrollment',
            'Student begins enrollment process',
            [
                ['field' => 'enrollment_started', 'operator' => '=', 'value' => true]
            ],
            [],
            true // Automatic transition
        );
        
        // From Waitlisted to Accepted
        $this->createWorkflowTransition(
            $waitlistedStage->id,
            $acceptedStage->id,
            'Admit from Waitlist',
            'Admit student from waitlist',
            [],
            [
                ['action' => 'approve', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Waitlisted to Rejected
        $this->createWorkflowTransition(
            $waitlistedStage->id,
            $rejectedStage->id,
            'Reject from Waitlist',
            'Reject student from waitlist',
            [],
            [
                ['action' => 'reject', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        $this->command->info('Undergraduate workflow created successfully');
        
        return $workflow;
    }

    /**
     * Create the default workflow template for graduate applications.
     *
     * @return \App\Models\Workflow
     */
    private function createGraduateWorkflow()
    {
        // Create the workflow
        $workflow = Workflow::create([
            'name' => 'Graduate Admissions',
            'description' => 'Standard workflow for graduate admissions process',
            'application_type' => 'graduate',
            'is_active' => true,
            'created_by_user_id' => 1, // Assuming admin user has ID 1
        ]);
        
        $this->command->info('Creating graduate workflow stages...');
        
        // Create workflow stages
        $submissionStage = $this->createWorkflowStage(
            $workflow->id,
            'Application Submission',
            'Initial application submission by the applicant',
            1,
            [], // No required documents yet
            [
                ['name' => 'complete_application', 'description' => 'Complete all required application fields']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_started'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'application_submitted']
            ],
            'Applicant'
        );
        
        $documentStage = $this->createWorkflowStage(
            $workflow->id,
            'Document Verification',
            'Verification of required documents',
            2,
            [
                ['name' => 'transcript', 'required' => true, 'description' => 'Academic transcript'],
                ['name' => 'id_document', 'required' => true, 'description' => 'Government-issued ID'],
                ['name' => 'statement_of_purpose', 'required' => true, 'description' => 'Statement of purpose'],
                ['name' => 'resume', 'required' => true, 'description' => 'Resume/CV'],
                ['name' => 'recommendation_letters', 'required' => true, 'count' => 3, 'description' => 'Letters of recommendation'],
                ['name' => 'gre_scores', 'required' => false, 'description' => 'GRE scores (if applicable)']
            ],
            [
                ['name' => 'upload_documents', 'description' => 'Upload all required documents']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'documents_required'],
                ['event' => 'document_verified', 'channel' => 'in_app', 'template' => 'document_verified'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'documents_verified']
            ],
            'Document Verification Team'
        );
        
        $departmentReviewStage = $this->createWorkflowStage(
            $workflow->id,
            'Department Review',
            'Review of the application by the academic department',
            3,
            [],
            [
                ['name' => 'review_application', 'description' => 'Review application details and documents']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'department_review']
            ],
            'Department Staff'
        );
        
        $interviewStage = $this->createWorkflowStage(
            $workflow->id,
            'Interview',
            'Interview with the applicant',
            4,
            [],
            [
                ['name' => 'schedule_interview', 'description' => 'Schedule interview with applicant'],
                ['name' => 'conduct_interview', 'description' => 'Conduct interview with applicant'],
                ['name' => 'record_interview_notes', 'description' => 'Record interview notes and evaluation']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'interview_required'],
                ['event' => 'interview_scheduled', 'channel' => 'email', 'template' => 'interview_scheduled']
            ],
            'Department Staff'
        );
        
        $facultyReviewStage = $this->createWorkflowStage(
            $workflow->id,
            'Faculty Review',
            'Review of the application by faculty members',
            5,
            [],
            [
                ['name' => 'faculty_review', 'description' => 'Faculty members review application']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'faculty_review']
            ],
            'Faculty'
        );
        
        $additionalInfoStage = $this->createWorkflowStage(
            $workflow->id,
            'Additional Information',
            'Request and review additional information from the applicant',
            6,
            [],
            [
                ['name' => 'request_information', 'description' => 'Request specific additional information'],
                ['name' => 'review_additional_info', 'description' => 'Review provided additional information']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'additional_info_required'],
                ['event' => 'info_received', 'channel' => 'in_app', 'template' => 'info_received']
            ],
            'Department Staff'
        );
        
        $decisionStage = $this->createWorkflowStage(
            $workflow->id,
            'Decision',
            'Final decision on the application',
            7,
            [],
            [
                ['name' => 'make_decision', 'description' => 'Make final decision on application']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'decision_pending']
            ],
            'Graduate Admissions Director'
        );
        
        $acceptedStage = $this->createWorkflowStage(
            $workflow->id,
            'Accepted',
            'Application has been accepted',
            8,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_accepted']
            ],
            'Graduate Admissions Staff'
        );
        
        $rejectedStage = $this->createWorkflowStage(
            $workflow->id,
            'Rejected',
            'Application has been rejected',
            9,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_rejected']
            ],
            'Graduate Admissions Staff'
        );
        
        $waitlistedStage = $this->createWorkflowStage(
            $workflow->id,
            'Waitlisted',
            'Application has been placed on the waitlist',
            10,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_waitlisted']
            ],
            'Graduate Admissions Staff'
        );
        
        $enrollmentStage = $this->createWorkflowStage(
            $workflow->id,
            'Enrollment',
            'Student has confirmed enrollment',
            11,
            [],
            [
                ['name' => 'pay_deposit', 'description' => 'Pay enrollment deposit'],
                ['name' => 'complete_enrollment', 'description' => 'Complete enrollment forms']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'enrollment_steps'],
                ['event' => 'deposit_received', 'channel' => 'email', 'template' => 'deposit_confirmed'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'enrollment_completed']
            ],
            'Enrollment Team'
        );
        
        $this->command->info('Creating graduate workflow transitions...');
        
        // Create workflow transitions
        // From Submission to Document Verification
        $this->createWorkflowTransition(
            $submissionStage->id,
            $documentStage->id,
            'Submit Application',
            'Application is submitted for document verification',
            [
                ['field' => 'is_submitted', 'operator' => '=', 'value' => true]
            ],
            [],
            true // Automatic transition
        );
        
        // From Document Verification to Department Review
        $this->createWorkflowTransition(
            $documentStage->id,
            $departmentReviewStage->id,
            'Verify Documents',
            'Documents are verified and application moves to department review',
            [
                ['field' => 'documents_verified', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'verify', 'resource' => 'documents']
            ],
            false // Manual transition
        );
        
        // From Department Review to Interview
        $this->createWorkflowTransition(
            $departmentReviewStage->id,
            $interviewStage->id,
            'Request Interview',
            'Department requests interview with applicant',
            [],
            [
                ['action' => 'request', 'resource' => 'interview']
            ],
            false // Manual transition
        );
        
        // From Department Review to Faculty Review
        $this->createWorkflowTransition(
            $departmentReviewStage->id,
            $facultyReviewStage->id,
            'Send to Faculty',
            'Forward application to faculty for review',
            [],
            [
                ['action' => 'forward', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Department Review to Additional Information
        $this->createWorkflowTransition(
            $departmentReviewStage->id,
            $additionalInfoStage->id,
            'Request Additional Information',
            'Request additional information from the applicant',
            [],
            [
                ['action' => 'request', 'resource' => 'additional_information']
            ],
            false // Manual transition
        );
        
        // From Interview to Faculty Review
        $this->createWorkflowTransition(
            $interviewStage->id,
            $facultyReviewStage->id,
            'Interview Complete',
            'Interview has been completed',
            [
                ['field' => 'interview_completed', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'complete', 'resource' => 'interview']
            ],
            false // Manual transition
        );
        
        // From Additional Information to Department Review
        $this->createWorkflowTransition(
            $additionalInfoStage->id,
            $departmentReviewStage->id,
            'Information Received',
            'Additional information has been received and reviewed',
            [
                ['field' => 'additional_info_provided', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'review', 'resource' => 'additional_information']
            ],
            false // Manual transition
        );
        
        // From Faculty Review to Decision
        $this->createWorkflowTransition(
            $facultyReviewStage->id,
            $decisionStage->id,
            'Faculty Recommendation',
            'Faculty has made a recommendation',
            [
                ['field' => 'faculty_review_completed', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'recommend', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Accepted
        $this->createWorkflowTransition(
            $decisionStage->id,
            $acceptedStage->id,
            'Accept Application',
            'Application is accepted',
            [],
            [
                ['action' => 'approve', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Rejected
        $this->createWorkflowTransition(
            $decisionStage->id,
            $rejectedStage->id,
            'Reject Application',
            'Application is rejected',
            [],
            [
                ['action' => 'reject', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Waitlisted
        $this->createWorkflowTransition(
            $decisionStage->id,
            $waitlistedStage->id,
            'Waitlist Application',
            'Application is placed on waitlist',
            [],
            [
                ['action' => 'waitlist', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Accepted to Enrollment
        $this->createWorkflowTransition(
            $acceptedStage->id,
            $enrollmentStage->id,
            'Begin Enrollment',
            'Student begins enrollment process',
            [
                ['field' => 'enrollment_started', 'operator' => '=', 'value' => true]
            ],
            [],
            true // Automatic transition
        );
        
        // From Waitlisted to Accepted
        $this->createWorkflowTransition(
            $waitlistedStage->id,
            $acceptedStage->id,
            'Admit from Waitlist',
            'Admit student from waitlist',
            [],
            [
                ['action' => 'approve', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Waitlisted to Rejected
        $this->createWorkflowTransition(
            $waitlistedStage->id,
            $rejectedStage->id,
            'Reject from Waitlist',
            'Reject student from waitlist',
            [],
            [
                ['action' => 'reject', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        $this->command->info('Graduate workflow created successfully');
        
        return $workflow;
    }

    /**
     * Create the default workflow template for transfer applications.
     *
     * @return \App\Models\Workflow
     */
    private function createTransferWorkflow()
    {
        // Create the workflow
        $workflow = Workflow::create([
            'name' => 'Transfer Admissions',
            'description' => 'Standard workflow for transfer admissions process',
            'application_type' => 'transfer',
            'is_active' => true,
            'created_by_user_id' => 1, // Assuming admin user has ID 1
        ]);
        
        $this->command->info('Creating transfer workflow stages...');
        
        // Create workflow stages
        $submissionStage = $this->createWorkflowStage(
            $workflow->id,
            'Application Submission',
            'Initial application submission by the applicant',
            1,
            [], // No required documents yet
            [
                ['name' => 'complete_application', 'description' => 'Complete all required application fields']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_started'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'application_submitted']
            ],
            'Applicant'
        );
        
        $documentStage = $this->createWorkflowStage(
            $workflow->id,
            'Document Verification',
            'Verification of required documents',
            2,
            [
                ['name' => 'transcript', 'required' => true, 'description' => 'Academic transcript from current institution'],
                ['name' => 'previous_transcripts', 'required' => false, 'description' => 'Transcripts from other institutions (if applicable)'],
                ['name' => 'id_document', 'required' => true, 'description' => 'Government-issued ID'],
                ['name' => 'personal_statement', 'required' => true, 'description' => 'Personal statement'],
                ['name' => 'course_descriptions', 'required' => true, 'description' => 'Course descriptions for credit evaluation']
            ],
            [
                ['name' => 'upload_documents', 'description' => 'Upload all required documents']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'documents_required'],
                ['event' => 'document_verified', 'channel' => 'in_app', 'template' => 'document_verified'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'documents_verified']
            ],
            'Document Verification Team'
        );
        
        $creditEvaluationStage = $this->createWorkflowStage(
            $workflow->id,
            'Credit Evaluation',
            'Evaluation of transfer credits',
            3,
            [],
            [
                ['name' => 'evaluate_credits', 'description' => 'Evaluate transfer credits']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'credit_evaluation'],
                ['event' => 'credit_evaluation_complete', 'channel' => 'email', 'template' => 'credit_evaluation_complete']
            ],
            'Credit Evaluation Team'
        );
        
        $departmentReviewStage = $this->createWorkflowStage(
            $workflow->id,
            'Department Review',
            'Review of the application by the academic department',
            4,
            [],
            [
                ['name' => 'review_application', 'description' => 'Review application and credit evaluation']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'department_review']
            ],
            'Department Staff'
        );
        
        $additionalInfoStage = $this->createWorkflowStage(
            $workflow->id,
            'Additional Information',
            'Request and review additional information from the applicant',
            5,
            [],
            [
                ['name' => 'request_information', 'description' => 'Request specific additional information'],
                ['name' => 'review_additional_info', 'description' => 'Review provided additional information']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'additional_info_required'],
                ['event' => 'info_received', 'channel' => 'in_app', 'template' => 'info_received']
            ],
            'Admissions Staff'
        );
        
        $decisionStage = $this->createWorkflowStage(
            $workflow->id,
            'Decision',
            'Final decision on the application',
            6,
            [],
            [
                ['name' => 'make_decision', 'description' => 'Make final decision on application']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'decision_pending']
            ],
            'Admissions Director'
        );
        
        $acceptedStage = $this->createWorkflowStage(
            $workflow->id,
            'Accepted',
            'Application has been accepted',
            7,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_accepted']
            ],
            'Admissions Staff'
        );
        
        $rejectedStage = $this->createWorkflowStage(
            $workflow->id,
            'Rejected',
            'Application has been rejected',
            8,
            [],
            [],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'application_rejected']
            ],
            'Admissions Staff'
        );
        
        $enrollmentStage = $this->createWorkflowStage(
            $workflow->id,
            'Enrollment',
            'Student has confirmed enrollment',
            9,
            [],
            [
                ['name' => 'pay_deposit', 'description' => 'Pay enrollment deposit'],
                ['name' => 'complete_enrollment', 'description' => 'Complete enrollment forms'],
                ['name' => 'course_registration', 'description' => 'Register for courses based on transfer credit evaluation']
            ],
            [
                ['event' => 'stage_entered', 'channel' => 'email', 'template' => 'enrollment_steps'],
                ['event' => 'deposit_received', 'channel' => 'email', 'template' => 'deposit_confirmed'],
                ['event' => 'stage_completed', 'channel' => 'email', 'template' => 'enrollment_completed']
            ],
            'Enrollment Team'
        );
        
        $this->command->info('Creating transfer workflow transitions...');
        
        // Create workflow transitions
        // From Submission to Document Verification
        $this->createWorkflowTransition(
            $submissionStage->id,
            $documentStage->id,
            'Submit Application',
            'Application is submitted for document verification',
            [
                ['field' => 'is_submitted', 'operator' => '=', 'value' => true]
            ],
            [],
            true // Automatic transition
        );
        
        // From Document Verification to Credit Evaluation
        $this->createWorkflowTransition(
            $documentStage->id,
            $creditEvaluationStage->id,
            'Verify Documents',
            'Documents are verified and application moves to credit evaluation',
            [
                ['field' => 'documents_verified', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'verify', 'resource' => 'documents']
            ],
            false // Manual transition
        );
        
        // From Credit Evaluation to Department Review
        $this->createWorkflowTransition(
            $creditEvaluationStage->id,
            $departmentReviewStage->id,
            'Credit Evaluation Complete',
            'Credit evaluation is complete and application moves to department review',
            [
                ['field' => 'credit_evaluation_completed', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'evaluate', 'resource' => 'credits']
            ],
            false // Manual transition
        );
        
        // From Department Review to Additional Information
        $this->createWorkflowTransition(
            $departmentReviewStage->id,
            $additionalInfoStage->id,
            'Request Additional Information',
            'Request additional information from the applicant',
            [],
            [
                ['action' => 'request', 'resource' => 'additional_information']
            ],
            false // Manual transition
        );
        
        // From Department Review to Decision
        $this->createWorkflowTransition(
            $departmentReviewStage->id,
            $decisionStage->id,
            'Department Recommendation',
            'Department has made a recommendation',
            [
                ['field' => 'department_review_completed', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'recommend', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Additional Information to Department Review
        $this->createWorkflowTransition(
            $additionalInfoStage->id,
            $departmentReviewStage->id,
            'Information Received',
            'Additional information has been received and reviewed',
            [
                ['field' => 'additional_info_provided', 'operator' => '=', 'value' => true]
            ],
            [
                ['action' => 'review', 'resource' => 'additional_information']
            ],
            false // Manual transition
        );
        
        // From Decision to Accepted
        $this->createWorkflowTransition(
            $decisionStage->id,
            $acceptedStage->id,
            'Accept Application',
            'Application is accepted',
            [],
            [
                ['action' => 'approve', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Decision to Rejected
        $this->createWorkflowTransition(
            $decisionStage->id,
            $rejectedStage->id,
            'Reject Application',
            'Application is rejected',
            [],
            [
                ['action' => 'reject', 'resource' => 'application']
            ],
            false // Manual transition
        );
        
        // From Accepted to Enrollment
        $this->createWorkflowTransition(
            $acceptedStage->id,
            $enrollmentStage->id,
            'Begin Enrollment',
            'Student begins enrollment process',
            [
                ['field' => 'enrollment_started', 'operator' => '=', 'value' => true]
            ],
            [],
            true // Automatic transition
        );
        
        $this->command->info('Transfer workflow created successfully');
        
        return $workflow;
    }

    /**
     * Helper method to create a workflow stage with the given parameters.
     *
     * @param int $workflowId
     * @param string $name
     * @param string $description
     * @param int $sequence
     * @param array $requiredDocuments
     * @param array $requiredActions
     * @param array $notificationTriggers
     * @param string $roleName
     * @return \App\Models\WorkflowStage
     */
    private function createWorkflowStage($workflowId, $name, $description, $sequence, $requiredDocuments, $requiredActions, $notificationTriggers, $roleName)
    {
        // Find the role ID based on the role name
        $role = Role::where('name', $roleName)->first();
        $roleId = $role ? $role->id : null;
        
        // Create the workflow stage
        return WorkflowStage::create([
            'workflow_id' => $workflowId,
            'name' => $name,
            'description' => $description,
            'sequence' => $sequence,
            'required_documents' => $requiredDocuments,
            'required_actions' => $requiredActions,
            'notification_triggers' => $notificationTriggers,
            'assigned_role_id' => $roleId,
        ]);
    }

    /**
     * Helper method to create a workflow transition between stages.
     *
     * @param int $sourceStageId
     * @param int $targetStageId
     * @param string $name
     * @param string $description
     * @param array $conditions
     * @param array $requiredPermissions
     * @param bool $isAutomatic
     * @return \App\Models\WorkflowTransition
     */
    private function createWorkflowTransition($sourceStageId, $targetStageId, $name, $description, $conditions, $requiredPermissions, $isAutomatic)
    {
        return WorkflowTransition::create([
            'source_stage_id' => $sourceStageId,
            'target_stage_id' => $targetStageId,
            'name' => $name,
            'description' => $description,
            'transition_conditions' => $conditions,
            'required_permissions' => $requiredPermissions,
            'is_automatic' => $isAutomatic,
        ]);
    }
}