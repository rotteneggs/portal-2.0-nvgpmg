<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Workflow Default Templates
    |--------------------------------------------------------------------------
    |
    | This section defines the default workflow templates available in the system.
    | Each template includes stages, transitions between stages, and notification
    | triggers for various events.
    |
    */
    'default_templates' => [
        [
            'name' => 'Undergraduate Admissions',
            'description' => 'Standard workflow for undergraduate applications',
            'application_type' => 'undergraduate',
            'stages' => [
                [
                    'name' => 'Draft',
                    'description' => 'Application is being prepared by the applicant',
                    'sequence' => 1,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'welcome_to_application',
                            'channels' => ['email']
                        ]
                    ]
                ],
                [
                    'name' => 'Submitted',
                    'description' => 'Application has been submitted and is awaiting initial screening',
                    'sequence' => 2,
                    'required_documents' => [],
                    'required_actions' => ['submit_application', 'pay_application_fee'],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'application_received',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ],
                [
                    'name' => 'Document Verification',
                    'description' => 'Required documents are being verified',
                    'sequence' => 3,
                    'required_documents' => ['transcript', 'personal_statement', 'recommendation_letters'],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'documents_required',
                            'channels' => ['email', 'in_app']
                        ],
                        [
                            'event' => 'document_verified',
                            'template' => 'document_verified',
                            'channels' => ['in_app']
                        ]
                    ],
                    'assigned_role_id' => 'verification_team'
                ],
                [
                    'name' => 'Under Review',
                    'description' => 'Application is being reviewed by the admissions committee',
                    'sequence' => 4,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'application_under_review',
                            'channels' => ['email', 'in_app']
                        ]
                    ],
                    'assigned_role_id' => 'admissions_committee'
                ],
                [
                    'name' => 'Additional Information',
                    'description' => 'Additional information is required from the applicant',
                    'sequence' => 5,
                    'required_documents' => [],
                    'required_actions' => ['provide_additional_info'],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'additional_information_required',
                            'channels' => ['email', 'in_app', 'sms']
                        ]
                    ]
                ],
                [
                    'name' => 'Decision',
                    'description' => 'Final decision on the application',
                    'sequence' => 6,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [],
                    'assigned_role_id' => 'admissions_director'
                ],
                [
                    'name' => 'Accepted',
                    'description' => 'Applicant has been accepted',
                    'sequence' => 7,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'acceptance_notification',
                            'channels' => ['email', 'in_app', 'sms']
                        ]
                    ]
                ],
                [
                    'name' => 'Waitlisted',
                    'description' => 'Applicant has been placed on the waitlist',
                    'sequence' => 8,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'waitlist_notification',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ],
                [
                    'name' => 'Rejected',
                    'description' => 'Application has been rejected',
                    'sequence' => 9,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'rejection_notification',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ],
                [
                    'name' => 'Enrollment',
                    'description' => 'Accepted applicant has confirmed enrollment',
                    'sequence' => 10,
                    'required_documents' => [],
                    'required_actions' => ['pay_enrollment_deposit'],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'enrollment_confirmation',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ]
            ],
            'transitions' => [
                [
                    'source' => 'Draft',
                    'target' => 'Submitted',
                    'name' => 'Submit Application',
                    'description' => 'Applicant submits their application',
                    'is_automatic' => false,
                    'conditions' => [
                        [
                            'field' => 'is_submitted',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Submitted',
                    'target' => 'Document Verification',
                    'name' => 'Initial Screening Passed',
                    'description' => 'Application passes initial screening',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'application_fee_paid',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Document Verification',
                    'target' => 'Under Review',
                    'name' => 'Documents Verified',
                    'description' => 'All required documents have been verified',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'all_documents_verified',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Under Review',
                    'target' => 'Additional Information',
                    'name' => 'Request Information',
                    'description' => 'Request additional information from applicant',
                    'is_automatic' => false,
                    'required_permissions' => ['request_additional_info']
                ],
                [
                    'source' => 'Additional Information',
                    'target' => 'Under Review',
                    'name' => 'Information Provided',
                    'description' => 'Applicant has provided the requested information',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'additional_info_provided',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Under Review',
                    'target' => 'Decision',
                    'name' => 'Review Complete',
                    'description' => 'Application review is complete',
                    'is_automatic' => false,
                    'required_permissions' => ['complete_review']
                ],
                [
                    'source' => 'Decision',
                    'target' => 'Accepted',
                    'name' => 'Accept',
                    'description' => 'Accept the applicant',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Decision',
                    'target' => 'Waitlisted',
                    'name' => 'Waitlist',
                    'description' => 'Place the applicant on the waitlist',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Decision',
                    'target' => 'Rejected',
                    'name' => 'Reject',
                    'description' => 'Reject the application',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Waitlisted',
                    'target' => 'Accepted',
                    'name' => 'Accept from Waitlist',
                    'description' => 'Accept an applicant from the waitlist',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Waitlisted',
                    'target' => 'Rejected',
                    'name' => 'Reject from Waitlist',
                    'description' => 'Reject an applicant from the waitlist',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Accepted',
                    'target' => 'Enrollment',
                    'name' => 'Confirm Enrollment',
                    'description' => 'Applicant confirms enrollment by paying deposit',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'enrollment_deposit_paid',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ]
            ]
        ],
        [
            'name' => 'Graduate Admissions',
            'description' => 'Standard workflow for graduate applications',
            'application_type' => 'graduate',
            'stages' => [
                [
                    'name' => 'Draft',
                    'description' => 'Application is being prepared by the applicant',
                    'sequence' => 1,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'welcome_to_application',
                            'channels' => ['email']
                        ]
                    ]
                ],
                [
                    'name' => 'Submitted',
                    'description' => 'Application has been submitted and is awaiting initial screening',
                    'sequence' => 2,
                    'required_documents' => [],
                    'required_actions' => ['submit_application', 'pay_application_fee'],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'application_received',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ],
                [
                    'name' => 'Document Verification',
                    'description' => 'Required documents are being verified',
                    'sequence' => 3,
                    'required_documents' => ['transcript', 'personal_statement', 'recommendation_letters', 'resume', 'test_scores'],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'documents_required',
                            'channels' => ['email', 'in_app']
                        ],
                        [
                            'event' => 'document_verified',
                            'template' => 'document_verified',
                            'channels' => ['in_app']
                        ]
                    ],
                    'assigned_role_id' => 'verification_team'
                ],
                [
                    'name' => 'Department Review',
                    'description' => 'Application is being reviewed by the academic department',
                    'sequence' => 4,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'department_review',
                            'channels' => ['email', 'in_app']
                        ]
                    ],
                    'assigned_role_id' => 'department_reviewer'
                ],
                [
                    'name' => 'Interview',
                    'description' => 'Applicant is scheduled for an interview',
                    'sequence' => 5,
                    'required_documents' => [],
                    'required_actions' => ['complete_interview'],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'interview_scheduled',
                            'channels' => ['email', 'in_app', 'sms']
                        ]
                    ],
                    'assigned_role_id' => 'interview_committee'
                ],
                [
                    'name' => 'Graduate Committee Review',
                    'description' => 'Application is being reviewed by the graduate committee',
                    'sequence' => 6,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'committee_review',
                            'channels' => ['email', 'in_app']
                        ]
                    ],
                    'assigned_role_id' => 'graduate_committee'
                ],
                [
                    'name' => 'Decision',
                    'description' => 'Final decision on the application',
                    'sequence' => 7,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [],
                    'assigned_role_id' => 'graduate_director'
                ],
                [
                    'name' => 'Accepted',
                    'description' => 'Applicant has been accepted',
                    'sequence' => 8,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'acceptance_notification',
                            'channels' => ['email', 'in_app', 'sms']
                        ]
                    ]
                ],
                [
                    'name' => 'Waitlisted',
                    'description' => 'Applicant has been placed on the waitlist',
                    'sequence' => 9,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'waitlist_notification',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ],
                [
                    'name' => 'Rejected',
                    'description' => 'Application has been rejected',
                    'sequence' => 10,
                    'required_documents' => [],
                    'required_actions' => [],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'rejection_notification',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ],
                [
                    'name' => 'Enrollment',
                    'description' => 'Accepted applicant has confirmed enrollment',
                    'sequence' => 11,
                    'required_documents' => [],
                    'required_actions' => ['pay_enrollment_deposit'],
                    'notification_triggers' => [
                        [
                            'event' => 'stage_entry',
                            'template' => 'enrollment_confirmation',
                            'channels' => ['email', 'in_app']
                        ]
                    ]
                ]
            ],
            'transitions' => [
                [
                    'source' => 'Draft',
                    'target' => 'Submitted',
                    'name' => 'Submit Application',
                    'description' => 'Applicant submits their application',
                    'is_automatic' => false,
                    'conditions' => [
                        [
                            'field' => 'is_submitted',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Submitted',
                    'target' => 'Document Verification',
                    'name' => 'Initial Screening Passed',
                    'description' => 'Application passes initial screening',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'application_fee_paid',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Document Verification',
                    'target' => 'Department Review',
                    'name' => 'Documents Verified',
                    'description' => 'All required documents have been verified',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'all_documents_verified',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Department Review',
                    'target' => 'Interview',
                    'name' => 'Schedule Interview',
                    'description' => 'Department requests an interview with the applicant',
                    'is_automatic' => false,
                    'required_permissions' => ['schedule_interview']
                ],
                [
                    'source' => 'Department Review',
                    'target' => 'Graduate Committee Review',
                    'name' => 'Forward to Committee',
                    'description' => 'Department forwards application to graduate committee',
                    'is_automatic' => false,
                    'required_permissions' => ['forward_to_committee']
                ],
                [
                    'source' => 'Interview',
                    'target' => 'Graduate Committee Review',
                    'name' => 'Interview Completed',
                    'description' => 'Applicant has completed the interview',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'interview_completed',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ],
                [
                    'source' => 'Graduate Committee Review',
                    'target' => 'Decision',
                    'name' => 'Review Complete',
                    'description' => 'Graduate committee review is complete',
                    'is_automatic' => false,
                    'required_permissions' => ['complete_committee_review']
                ],
                [
                    'source' => 'Decision',
                    'target' => 'Accepted',
                    'name' => 'Accept',
                    'description' => 'Accept the applicant',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Decision',
                    'target' => 'Waitlisted',
                    'name' => 'Waitlist',
                    'description' => 'Place the applicant on the waitlist',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Decision',
                    'target' => 'Rejected',
                    'name' => 'Reject',
                    'description' => 'Reject the application',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Waitlisted',
                    'target' => 'Accepted',
                    'name' => 'Accept from Waitlist',
                    'description' => 'Accept an applicant from the waitlist',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Waitlisted',
                    'target' => 'Rejected',
                    'name' => 'Reject from Waitlist',
                    'description' => 'Reject an applicant from the waitlist',
                    'is_automatic' => false,
                    'required_permissions' => ['make_admission_decision']
                ],
                [
                    'source' => 'Accepted',
                    'target' => 'Enrollment',
                    'name' => 'Confirm Enrollment',
                    'description' => 'Applicant confirms enrollment by paying deposit',
                    'is_automatic' => true,
                    'conditions' => [
                        [
                            'field' => 'enrollment_deposit_paid',
                            'operator' => '=',
                            'value' => true
                        ]
                    ]
                ]
            ]
        ]
    ],

    /*
    |--------------------------------------------------------------------------
    | Workflow Engine Settings
    |--------------------------------------------------------------------------
    |
    | General configuration settings for the workflow engine behavior including
    | automation, notifications, and permissions.
    |
    */
    'settings' => [
        'auto_process_transitions' => true,
        'transition_processing_interval' => 5, // minutes
        'notification_default_channels' => ['email', 'in_app'],
        'document_verification' => [
            'auto_verification_enabled' => true,
            'minimum_confidence_score' => 0.85,
            'verification_timeout_hours' => 48,
        ],
        'status_display' => [
            'show_estimated_completion' => true,
            'show_stage_requirements' => true,
            'show_next_steps' => true,
        ],
        'permissions' => [
            'view_workflow_editor' => ['admin', 'workflow_manager'],
            'edit_workflow' => ['admin', 'workflow_manager'],
            'activate_workflow' => ['admin'],
            'make_admission_decision' => ['admin', 'admissions_director', 'graduate_director'],
            'request_additional_info' => ['admin', 'admissions_committee', 'department_reviewer', 'graduate_committee'],
            'complete_review' => ['admin', 'admissions_committee', 'department_reviewer', 'graduate_committee'],
            'schedule_interview' => ['admin', 'department_reviewer', 'graduate_committee'],
            'forward_to_committee' => ['admin', 'department_reviewer'],
            'complete_committee_review' => ['admin', 'graduate_committee'],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Condition Operators
    |--------------------------------------------------------------------------
    |
    | Available operators for defining conditions in workflow transitions.
    | These operators are used in the WYSIWYG workflow editor to create
    | logic for when transitions should occur.
    |
    */
    'condition_operators' => [
        [
            'operator' => '=',
            'description' => 'Equal to',
            'applies_to' => ['string', 'number', 'boolean'],
        ],
        [
            'operator' => '!=',
            'description' => 'Not equal to',
            'applies_to' => ['string', 'number', 'boolean'],
        ],
        [
            'operator' => '>',
            'description' => 'Greater than',
            'applies_to' => ['number', 'date'],
        ],
        [
            'operator' => '>=',
            'description' => 'Greater than or equal to',
            'applies_to' => ['number', 'date'],
        ],
        [
            'operator' => '<',
            'description' => 'Less than',
            'applies_to' => ['number', 'date'],
        ],
        [
            'operator' => '<=',
            'description' => 'Less than or equal to',
            'applies_to' => ['number', 'date'],
        ],
        [
            'operator' => 'contains',
            'description' => 'Contains substring',
            'applies_to' => ['string', 'array'],
        ],
        [
            'operator' => 'in',
            'description' => 'Value is in array',
            'applies_to' => ['string', 'number'],
        ],
        [
            'operator' => 'not_in',
            'description' => 'Value is not in array',
            'applies_to' => ['string', 'number'],
        ],
        [
            'operator' => 'all',
            'description' => 'All conditions must be true',
            'applies_to' => ['condition_group'],
        ],
        [
            'operator' => 'any',
            'description' => 'Any condition must be true',
            'applies_to' => ['condition_group'],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Templates
    |--------------------------------------------------------------------------
    |
    | Templates for notifications triggered by workflow events. These are used
    | when sending automated communications to applicants and staff throughout
    | the admissions process.
    |
    */
    'notification_templates' => [
        'welcome_to_application' => [
            'subject' => 'Welcome to Your Application',
            'description' => 'Sent when a user starts a new application',
        ],
        'application_received' => [
            'subject' => 'Application Received',
            'description' => 'Sent when an application is submitted',
        ],
        'documents_required' => [
            'subject' => 'Documents Required for Your Application',
            'description' => 'Sent when documents need to be uploaded',
        ],
        'document_verified' => [
            'subject' => 'Document Verified',
            'description' => 'Sent when a document is verified',
        ],
        'application_under_review' => [
            'subject' => 'Your Application is Under Review',
            'description' => 'Sent when application enters review stage',
        ],
        'additional_information_required' => [
            'subject' => 'Additional Information Required',
            'description' => 'Sent when additional information is needed',
        ],
        'department_review' => [
            'subject' => 'Your Application is Being Reviewed by the Department',
            'description' => 'Sent when application is being reviewed by academic department',
        ],
        'interview_scheduled' => [
            'subject' => 'Interview Scheduled',
            'description' => 'Sent when an interview is scheduled',
        ],
        'committee_review' => [
            'subject' => 'Your Application is Being Reviewed by the Committee',
            'description' => 'Sent when application is being reviewed by committee',
        ],
        'acceptance_notification' => [
            'subject' => 'Congratulations! Your Application Has Been Accepted',
            'description' => 'Sent when an application is accepted',
        ],
        'waitlist_notification' => [
            'subject' => 'Your Application Has Been Waitlisted',
            'description' => 'Sent when an application is waitlisted',
        ],
        'rejection_notification' => [
            'subject' => 'Your Application Status',
            'description' => 'Sent when an application is rejected',
        ],
        'enrollment_confirmation' => [
            'subject' => 'Enrollment Confirmation',
            'description' => 'Sent when enrollment is confirmed',
        ],
    ],
];