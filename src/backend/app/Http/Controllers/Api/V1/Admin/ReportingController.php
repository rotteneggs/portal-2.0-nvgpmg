<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use App\Models\Application;
use App\Models\ApplicationStatus;
use App\Models\Document;
use App\Models\DocumentVerification;
use App\Models\Payment;
use App\Models\User;

class ReportingController extends Controller
{
    /**
     * Display a list of available reports
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request)
    {
        $reports = [
            [
                'id' => 'application-stats',
                'name' => 'Application Statistics',
                'description' => 'Overview of application counts, types, and statuses',
                'endpoint' => '/api/v1/admin/reports/application-stats'
            ],
            [
                'id' => 'application-trends',
                'name' => 'Application Trends',
                'description' => 'Application submission trends over time',
                'endpoint' => '/api/v1/admin/reports/application-trends'
            ],
            [
                'id' => 'document-stats',
                'name' => 'Document Statistics',
                'description' => 'Overview of document uploads and verification status',
                'endpoint' => '/api/v1/admin/reports/document-stats'
            ],
            [
                'id' => 'document-verification-trends',
                'name' => 'Document Verification Trends',
                'description' => 'Document verification trends over time',
                'endpoint' => '/api/v1/admin/reports/document-verification-trends'
            ],
            [
                'id' => 'payment-stats',
                'name' => 'Payment Statistics',
                'description' => 'Overview of payment data and financial metrics',
                'endpoint' => '/api/v1/admin/reports/payment-stats'
            ],
            [
                'id' => 'payment-trends',
                'name' => 'Payment Trends',
                'description' => 'Payment trends over time',
                'endpoint' => '/api/v1/admin/reports/payment-trends'
            ],
            [
                'id' => 'user-stats',
                'name' => 'User Statistics',
                'description' => 'Overview of user accounts and activity',
                'endpoint' => '/api/v1/admin/reports/user-stats'
            ],
            [
                'id' => 'conversion-funnel',
                'name' => 'Conversion Funnel',
                'description' => 'Application conversion rates through the admissions process',
                'endpoint' => '/api/v1/admin/reports/conversion-funnel'
            ],
            [
                'id' => 'workflow-efficiency',
                'name' => 'Workflow Efficiency',
                'description' => 'Analysis of workflow stage durations and bottlenecks',
                'endpoint' => '/api/v1/admin/reports/workflow-efficiency'
            ],
            [
                'id' => 'ai-performance',
                'name' => 'AI Performance',
                'description' => 'Metrics on AI-powered verification and automation',
                'endpoint' => '/api/v1/admin/reports/ai-performance'
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'reports' => $reports
            ]
        ]);
    }

    /**
     * Generate application statistics report
     *
     * @param Request $request
     * @return Response
     */
    public function applicationStats(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get optional filters
        $applicationType = $request->input('application_type');
        $status = $request->input('status');
        
        // Query applications within date range
        $query = Application::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filters if provided
        if ($applicationType) {
            $query->byType($applicationType);
        }
        
        if ($status) {
            $query->byStatus($status);
        }
        
        // Get applications
        $applications = $query->get();
        
        // Calculate statistics
        $totalApplications = $applications->count();
        $submittedApplications = $applications->where('is_submitted', true)->count();
        $draftApplications = $applications->where('is_submitted', false)->count();
        
        // Applications by type
        $applicationsByType = $applications->groupBy('application_type')
            ->map(function ($group) use ($totalApplications) {
                return [
                    'count' => $group->count(),
                    'percentage' => $totalApplications > 0 ? round(($group->count() / $totalApplications) * 100, 2) : 0
                ];
            });
        
        // Applications by status
        $applicationsByStatus = $applications->groupBy(function ($application) {
            return $application->currentStatus ? $application->currentStatus->status : ($application->is_submitted ? 'Submitted' : 'Draft');
        })->map(function ($group) use ($totalApplications) {
            return [
                'count' => $group->count(),
                'percentage' => $totalApplications > 0 ? round(($group->count() / $totalApplications) * 100, 2) : 0
            ];
        });
        
        // Calculate average time in each stage
        $stageTransitions = ApplicationStatus::whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('application_id')
            ->orderBy('created_at')
            ->get()
            ->groupBy('application_id');
        
        $avgTimeInStage = [];
        foreach ($stageTransitions as $applicationId => $statuses) {
            for ($i = 0; $i < $statuses->count() - 1; $i++) {
                $currentStatus = $statuses[$i];
                $nextStatus = $statuses[$i + 1];
                $stageName = $currentStatus->status;
                
                $timeInStage = $currentStatus->created_at->diffInHours($nextStatus->created_at);
                
                if (!isset($avgTimeInStage[$stageName])) {
                    $avgTimeInStage[$stageName] = ['total_hours' => 0, 'count' => 0];
                }
                
                $avgTimeInStage[$stageName]['total_hours'] += $timeInStage;
                $avgTimeInStage[$stageName]['count']++;
            }
        }
        
        foreach ($avgTimeInStage as $stage => &$data) {
            $data['average_hours'] = $data['count'] > 0 ? round($data['total_hours'] / $data['count'], 2) : 0;
            unset($data['total_hours']);
            unset($data['count']);
        }
        
        // Calculate conversion rates
        $submissionRate = $totalApplications > 0 ? round(($submittedApplications / $totalApplications) * 100, 2) : 0;
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'total_applications' => $totalApplications,
                'submitted_applications' => $submittedApplications,
                'draft_applications' => $draftApplications,
                'submission_rate' => $submissionRate,
                'applications_by_type' => $applicationsByType,
                'applications_by_status' => $applicationsByStatus,
                'average_time_in_stage' => $avgTimeInStage,
            ]
        ]);
    }

    /**
     * Generate application trend data over time
     *
     * @param Request $request
     * @return Response
     */
    public function applicationTrends(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request, 90);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get grouping parameter (day, week, month)
        $groupBy = $request->input('group_by', 'day');
        if (!in_array($groupBy, ['day', 'week', 'month'])) {
            $groupBy = 'day';
        }
        
        // Get optional filter
        $applicationType = $request->input('application_type');
        
        // Query applications within date range
        $query = Application::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filter if provided
        if ($applicationType) {
            $query->byType($applicationType);
        }
        
        // Get all applications in date range
        $applications = $query->get();
    
        // Query submitted applications within date range
        $submittedQuery = Application::whereBetween('submitted_at', [$startDate, $endDate])
            ->where('is_submitted', true);
        
        // Apply filter if provided
        if ($applicationType) {
            $submittedQuery->byType($applicationType);
        }
        
        // Get all submitted applications in date range
        $submittedApplications = $submittedQuery->get();
        
        // Group applications by time interval
        $groupedCreated = $this->groupApplicationsByInterval($applications, $groupBy, 'created_at');
        $groupedSubmitted = $this->groupApplicationsByInterval($submittedApplications, $groupBy, 'submitted_at');
        
        // Prepare trend data
        $trendData = collect($groupedCreated)->map(function ($value, $key) use ($groupedSubmitted) {
            return [
                'period' => $key,
                'applications_created' => $value,
                'applications_submitted' => $groupedSubmitted[$key] ?? 0,
                'submission_rate' => $value > 0 ? round((($groupedSubmitted[$key] ?? 0) / $value) * 100, 2) : 0,
            ];
        })->values();
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'group_by' => $groupBy,
                'trend_data' => $trendData,
            ]
        ]);
    }

    /**
     * Generate document statistics report
     *
     * @param Request $request
     * @return Response
     */
    public function documentStats(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get optional filter
        $documentType = $request->input('document_type');
        
        // Query documents within date range
        $query = Document::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filter if provided
        if ($documentType) {
            $query->byType($documentType);
        }
        
        // Get documents
        $documents = $query->get();
        
        // Calculate statistics
        $totalDocuments = $documents->count();
        $verifiedDocuments = $documents->where('is_verified', true)->count();
        $unverifiedDocuments = $documents->where('is_verified', false)->count();
        
        // Documents by type
        $documentsByType = $documents->groupBy('document_type')
            ->map(function ($group) use ($totalDocuments) {
                return [
                    'count' => $group->count(),
                    'percentage' => $totalDocuments > 0 ? round(($group->count() / $totalDocuments) * 100, 2) : 0,
                    'verified_count' => $group->where('is_verified', true)->count(),
                    'verified_percentage' => $group->count() > 0 ? round(($group->where('is_verified', true)->count() / $group->count()) * 100, 2) : 0,
                ];
            });
        
        // Get document verifications
        $verifications = DocumentVerification::whereIn('document_id', $documents->pluck('id'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
        
        // Verification methods distribution
        $verificationMethods = $verifications->groupBy('verification_method')
            ->map(function ($group) use ($verifications) {
                $totalVerifications = $verifications->count();
                return [
                    'count' => $group->count(),
                    'percentage' => $totalVerifications > 0 ? round(($group->count() / $totalVerifications) * 100, 2) : 0,
                    'success_rate' => $group->count() > 0 ? round(($group->where('verification_status', 'verified')->count() / $group->count()) * 100, 2) : 0,
                ];
            });
        
        // Calculate average verification time
        $verifiedDocs = $documents->filter(function ($doc) {
            return $doc->is_verified && $doc->verified_at;
        });
        
        $totalVerificationTime = 0;
        $docCount = 0;
        
        foreach ($verifiedDocs as $doc) {
            $verificationTime = $doc->created_at->diffInMinutes($doc->verified_at);
            $totalVerificationTime += $verificationTime;
            $docCount++;
        }
        
        $avgVerificationTime = $docCount > 0 ? round($totalVerificationTime / $docCount, 2) : 0;
        
        // Calculate confidence scores distribution
        $confidenceScores = [
            'high' => $verifications->where('confidence_score', '>=', 0.8)->count(),
            'medium' => $verifications->whereBetween('confidence_score', [0.5, 0.8])->count(),
            'low' => $verifications->where('confidence_score', '<', 0.5)->count(),
        ];
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'total_documents' => $totalDocuments,
                'verified_documents' => $verifiedDocuments,
                'unverified_documents' => $unverifiedDocuments,
                'verification_rate' => $totalDocuments > 0 ? round(($verifiedDocuments / $totalDocuments) * 100, 2) : 0,
                'documents_by_type' => $documentsByType,
                'verification_methods' => $verificationMethods,
                'average_verification_time_minutes' => $avgVerificationTime,
                'confidence_scores_distribution' => $confidenceScores,
            ]
        ]);
    }

    /**
     * Generate document verification trend data over time
     *
     * @param Request $request
     * @return Response
     */
    public function documentVerificationTrends(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request, 90);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get grouping parameter (day, week, month)
        $groupBy = $request->input('group_by', 'day');
        if (!in_array($groupBy, ['day', 'week', 'month'])) {
            $groupBy = 'day';
        }
        
        // Get optional filters
        $documentType = $request->input('document_type');
        $verificationMethod = $request->input('verification_method');
        
        // Query document verifications within date range
        $query = DocumentVerification::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filters if provided
        if ($verificationMethod) {
            $query->byMethod($verificationMethod);
        }
        
        if ($documentType) {
            $query->whereHas('document', function ($q) use ($documentType) {
                $q->byType($documentType);
            });
        }
        
        // Get verifications
        $verifications = $query->with('document')->get();
        
        // Group verifications by time interval
        $groupedVerifications = [];
        
        foreach ($verifications as $verification) {
            $date = $verification->created_at;
            
            $periodKey = '';
            
            switch ($groupBy) {
                case 'day':
                    $periodKey = $date->format('Y-m-d');
                    break;
                case 'week':
                    $periodKey = $date->copy()->startOfWeek()->format('Y-m-d') . ' - ' . $date->copy()->endOfWeek()->format('Y-m-d');
                    break;
                case 'month':
                    $periodKey = $date->format('Y-m');
                    break;
            }
            
            if (!isset($groupedVerifications[$periodKey])) {
                $groupedVerifications[$periodKey] = [
                    'total' => 0,
                    'verified' => 0,
                    'rejected' => 0,
                    'confidence_sum' => 0,
                ];
            }
            
            $groupedVerifications[$periodKey]['total']++;
            
            if ($verification->verification_status === 'verified') {
                $groupedVerifications[$periodKey]['verified']++;
            } elseif ($verification->verification_status === 'rejected') {
                $groupedVerifications[$periodKey]['rejected']++;
            }
            
            // Add confidence score if available
            if ($verification->confidence_score) {
                $groupedVerifications[$periodKey]['confidence_sum'] += $verification->confidence_score;
            }
        }
        
        // Calculate averages and success rates
        foreach ($groupedVerifications as &$data) {
            $data['success_rate'] = $data['total'] > 0 ? round(($data['verified'] / $data['total']) * 100, 2) : 0;
            $data['average_confidence'] = $data['total'] > 0 ? round($data['confidence_sum'] / $data['total'], 2) : 0;
            unset($data['confidence_sum']);
        }
        
        // Sort by period keys
        ksort($groupedVerifications);
        
        // Convert to array format
        $trendData = collect($groupedVerifications)->map(function ($value, $key) {
            return array_merge(['period' => $key], $value);
        })->values();
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'group_by' => $groupBy,
                'trend_data' => $trendData,
            ]
        ]);
    }

    /**
     * Generate payment statistics report
     *
     * @param Request $request
     * @return Response
     */
    public function paymentStats(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get optional filters
        $paymentType = $request->input('payment_type');
        $paymentMethod = $request->input('payment_method');
        $status = $request->input('status');
        
        // Query payments within date range
        $query = Payment::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filters if provided
        if ($paymentType) {
            $query->byType($paymentType);
        }
        
        if ($paymentMethod) {
            $query->where('payment_method', $paymentMethod);
        }
        
        if ($status) {
            $query->byStatus($status);
        }
        
        // Get payments
        $payments = $query->get();
        
        // Calculate statistics
        $totalPayments = $payments->count();
        $totalAmount = $payments->sum('amount');
        $completedPayments = $payments->where('status', 'completed')->count();
        $completedAmount = $payments->where('status', 'completed')->sum('amount');
        
        // Payments by type
        $paymentsByType = $payments->groupBy('payment_type')
            ->map(function ($group) use ($totalPayments, $totalAmount) {
                $groupTotal = $group->sum('amount');
                return [
                    'count' => $group->count(),
                    'percentage' => $totalPayments > 0 ? round(($group->count() / $totalPayments) * 100, 2) : 0,
                    'amount' => round($groupTotal, 2),
                    'amount_percentage' => $totalAmount > 0 ? round(($groupTotal / $totalAmount) * 100, 2) : 0,
                ];
            });
        
        // Payments by method
        $paymentsByMethod = $payments->groupBy('payment_method')
            ->map(function ($group) use ($totalPayments) {
                return [
                    'count' => $group->count(),
                    'percentage' => $totalPayments > 0 ? round(($group->count() / $totalPayments) * 100, 2) : 0,
                    'success_rate' => $group->count() > 0 ? round(($group->where('status', 'completed')->count() / $group->count()) * 100, 2) : 0,
                ];
            });
        
        // Payments by status
        $paymentsByStatus = $payments->groupBy('status')
            ->map(function ($group) use ($totalPayments, $totalAmount) {
                $groupTotal = $group->sum('amount');
                return [
                    'count' => $group->count(),
                    'percentage' => $totalPayments > 0 ? round(($group->count() / $totalPayments) * 100, 2) : 0,
                    'amount' => round($groupTotal, 2),
                    'amount_percentage' => $totalAmount > 0 ? round(($groupTotal / $totalAmount) * 100, 2) : 0,
                ];
            });
        
        // Calculate payment success rate
        $paymentSuccessRate = $totalPayments > 0 ? round(($completedPayments / $totalPayments) * 100, 2) : 0;
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'total_payments' => $totalPayments,
                'total_amount' => round($totalAmount, 2),
                'completed_payments' => $completedPayments,
                'completed_amount' => round($completedAmount, 2),
                'payment_success_rate' => $paymentSuccessRate,
                'payments_by_type' => $paymentsByType,
                'payments_by_method' => $paymentsByMethod,
                'payments_by_status' => $paymentsByStatus,
            ]
        ]);
    }

    /**
     * Generate payment trend data over time
     *
     * @param Request $request
     * @return Response
     */
    public function paymentTrends(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request, 90);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get grouping parameter (day, week, month)
        $groupBy = $request->input('group_by', 'day');
        if (!in_array($groupBy, ['day', 'week', 'month'])) {
            $groupBy = 'day';
        }
        
        // Get optional filters
        $paymentType = $request->input('payment_type');
        $paymentMethod = $request->input('payment_method');
        
        // Query payments within date range
        $query = Payment::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filters if provided
        if ($paymentType) {
            $query->byType($paymentType);
        }
        
        if ($paymentMethod) {
            $query->where('payment_method', $paymentMethod);
        }
        
        // Get payments
        $payments = $query->get();
        
        // Group payments by time interval
        $groupedPayments = [];
        
        foreach ($payments as $payment) {
            $date = $payment->created_at;
            
            $periodKey = '';
            
            switch ($groupBy) {
                case 'day':
                    $periodKey = $date->format('Y-m-d');
                    break;
                case 'week':
                    $periodKey = $date->copy()->startOfWeek()->format('Y-m-d') . ' - ' . $date->copy()->endOfWeek()->format('Y-m-d');
                    break;
                case 'month':
                    $periodKey = $date->format('Y-m');
                    break;
            }
            
            if (!isset($groupedPayments[$periodKey])) {
                $groupedPayments[$periodKey] = [
                    'count' => 0,
                    'amount' => 0,
                    'completed_count' => 0,
                    'completed_amount' => 0,
                    'failed_count' => 0,
                ];
            }
            
            $groupedPayments[$periodKey]['count']++;
            $groupedPayments[$periodKey]['amount'] += $payment->amount;
            
            if ($payment->status === 'completed') {
                $groupedPayments[$periodKey]['completed_count']++;
                $groupedPayments[$periodKey]['completed_amount'] += $payment->amount;
            } elseif ($payment->status === 'failed') {
                $groupedPayments[$periodKey]['failed_count']++;
            }
        }
        
        // Calculate success rates
        foreach ($groupedPayments as &$data) {
            $data['success_rate'] = $data['count'] > 0 ? round(($data['completed_count'] / $data['count']) * 100, 2) : 0;
            $data['amount'] = round($data['amount'], 2);
            $data['completed_amount'] = round($data['completed_amount'], 2);
        }
        
        // Sort by period keys
        ksort($groupedPayments);
        
        // Convert to array format
        $trendData = collect($groupedPayments)->map(function ($value, $key) {
            return array_merge(['period' => $key], $value);
        })->values();
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'group_by' => $groupBy,
                'trend_data' => $trendData,
            ]
        ]);
    }

    /**
     * Generate user statistics report
     *
     * @param Request $request
     * @return Response
     */
    public function userStats(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Query all users
        $allUsers = User::withCount(['applications', 'documents'])->get();
        
        // Query new users in the date range
        $newUsers = User::whereBetween('created_at', [$startDate, $endDate])->count();
        
        // Calculate statistics
        $totalUsers = $allUsers->count();
        $activeUsers = $allUsers->where('is_active', true)->count();
        $inactiveUsers = $allUsers->where('is_active', false)->count();
        $verifiedUsers = $allUsers->whereNotNull('email_verified_at')->count();
        $mfaEnabledUsers = $allUsers->whereNotNull('mfa_secret')->count();
        
        // Users by role
        $usersByRole = [];
        foreach ($allUsers as $user) {
            foreach ($user->roles as $role) {
                if (!isset($usersByRole[$role->name])) {
                    $usersByRole[$role->name] = 0;
                }
                $usersByRole[$role->name]++;
            }
        }
        
        // Convert to percentage
        $usersByRolePercentage = [];
        foreach ($usersByRole as $role => $count) {
            $usersByRolePercentage[$role] = [
                'count' => $count,
                'percentage' => $totalUsers > 0 ? round(($count / $totalUsers) * 100, 2) : 0,
            ];
        }
        
        // Calculate user engagement metrics
        $usersWithApplications = $allUsers->where('applications_count', '>', 0)->count();
        $usersWithDocuments = $allUsers->where('documents_count', '>', 0)->count();
        $averageApplicationsPerUser = $totalUsers > 0 ? round($allUsers->sum('applications_count') / $totalUsers, 2) : 0;
        $averageDocumentsPerUser = $totalUsers > 0 ? round($allUsers->sum('documents_count') / $totalUsers, 2) : 0;
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'total_users' => $totalUsers,
                'new_users' => $newUsers,
                'active_users' => $activeUsers,
                'inactive_users' => $inactiveUsers,
                'verified_users' => $verifiedUsers,
                'mfa_enabled_users' => $mfaEnabledUsers,
                'users_by_role' => $usersByRolePercentage,
                'engagement' => [
                    'users_with_applications' => $usersWithApplications,
                    'users_with_applications_percentage' => $totalUsers > 0 ? round(($usersWithApplications / $totalUsers) * 100, 2) : 0,
                    'users_with_documents' => $usersWithDocuments,
                    'users_with_documents_percentage' => $totalUsers > 0 ? round(($usersWithDocuments / $totalUsers) * 100, 2) : 0,
                    'average_applications_per_user' => $averageApplicationsPerUser,
                    'average_documents_per_user' => $averageDocumentsPerUser,
                ],
            ]
        ]);
    }

    /**
     * Generate application conversion funnel report
     *
     * @param Request $request
     * @return Response
     */
    public function conversionFunnel(Request $request)
    {
        // For conversion funnel, we might want to look at the entire application cycle by default
        $currentYear = Carbon::now()->year;
        $defaultStartDate = Carbon::create($currentYear, 1, 1)->startOfDay();
        $defaultEndDate = Carbon::create($currentYear, 12, 31)->endOfDay();
        
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date'))->startOfDay() : $defaultStartDate;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : $defaultEndDate;
        
        // Get optional filter
        $applicationType = $request->input('application_type');
        
        // Query applications within date range
        $query = Application::whereBetween('created_at', [$startDate, $endDate]);
        
        // Apply filter if provided
        if ($applicationType) {
            $query->byType($applicationType);
        }
        
        // Get applications with necessary relations
        $applications = $query->with(['currentStatus', 'documents', 'payments'])->get();
        
        // Define funnel stages
        $started = $applications->count();
        $submitted = $applications->where('is_submitted', true)->count();
        
        // Count applications with complete documentation
        $withCompleteDocumentation = $applications->filter(function ($application) {
            $requiredDocs = $application->getRequiredDocuments();
            $uploadedDocTypes = $application->documents->pluck('document_type')->toArray();
            return count(array_diff($requiredDocs, $uploadedDocTypes)) === 0;
        })->count();
        
        // Count applications that have been reviewed
        $reviewed = $applications->filter(function ($application) {
            return $application->currentStatus && in_array($application->currentStatus->status, ['reviewed', 'decision_pending', 'accepted', 'rejected', 'waitlisted']);
        })->count();
        
        // Count applications by decision
        $accepted = $applications->filter(function ($application) {
            return $application->currentStatus && $application->currentStatus->status === 'accepted';
        })->count();
        
        $rejected = $applications->filter(function ($application) {
            return $application->currentStatus && $application->currentStatus->status === 'rejected';
        })->count();
        
        $waitlisted = $applications->filter(function ($application) {
            return $application->currentStatus && $application->currentStatus->status === 'waitlisted';
        })->count();
        
        // Count applications with enrollment deposit paid
        $depositPaid = $applications->filter(function ($application) {
            return $application->payments->where('payment_type', 'enrollment_deposit')
                                       ->where('status', 'completed')
                                       ->count() > 0;
        })->count();
        
        // Count applications with completed enrollment
        $enrolled = $applications->filter(function ($application) {
            return $application->currentStatus && $application->currentStatus->status === 'enrolled';
        })->count();
        
        // Calculate conversion rates
        $conversionRates = [
            'submission_rate' => $started > 0 ? round(($submitted / $started) * 100, 2) : 0,
            'documentation_rate' => $submitted > 0 ? round(($withCompleteDocumentation / $submitted) * 100, 2) : 0,
            'review_rate' => $withCompleteDocumentation > 0 ? round(($reviewed / $withCompleteDocumentation) * 100, 2) : 0,
            'acceptance_rate' => $reviewed > 0 ? round(($accepted / $reviewed) * 100, 2) : 0,
            'deposit_rate' => $accepted > 0 ? round(($depositPaid / $accepted) * 100, 2) : 0,
            'enrollment_rate' => $depositPaid > 0 ? round(($enrolled / $depositPaid) * 100, 2) : 0,
            'overall_yield' => $started > 0 ? round(($enrolled / $started) * 100, 2) : 0,
        ];
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'funnel_stages' => [
                    'applications_started' => $started,
                    'applications_submitted' => $submitted,
                    'complete_documentation' => $withCompleteDocumentation,
                    'applications_reviewed' => $reviewed,
                    'applications_accepted' => $accepted,
                    'applications_rejected' => $rejected,
                    'applications_waitlisted' => $waitlisted,
                    'enrollment_deposit_paid' => $depositPaid,
                    'enrollment_completed' => $enrolled,
                ],
                'conversion_rates' => $conversionRates,
            ]
        ]);
    }

    /**
     * Generate workflow efficiency report
     *
     * @param Request $request
     * @return Response
     */
    public function workflowEfficiency(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request, 90);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Get optional filter
        $workflowId = $request->input('workflow_id');
        
        // Query application statuses within date range
        $query = ApplicationStatus::whereBetween('created_at', [$startDate, $endDate])
            ->with(['workflowStage', 'application']);
        
        // Apply filter if provided
        if ($workflowId) {
            $query->whereHas('workflowStage', function ($q) use ($workflowId) {
                $q->where('workflow_id', $workflowId);
            });
        }
        
        // Get application statuses
        $statuses = $query->orderBy('application_id')
                          ->orderBy('created_at')
                          ->get();
        
        // Group statuses by application ID
        $statusesByApplication = $statuses->groupBy('application_id');
        
        // Calculate time spent in each stage
        $stageEfficiency = [];
        $manualInterventions = [];
        $transitionSuccess = [];
        
        foreach ($statusesByApplication as $applicationId => $appStatuses) {
            for ($i = 0; $i < $appStatuses->count() - 1; $i++) {
                $currentStatus = $appStatuses[$i];
                $nextStatus = $appStatuses[$i + 1];
                
                $stageName = $currentStatus->workflowStage ? $currentStatus->workflowStage->name : $currentStatus->status;
                $nextStageName = $nextStatus->workflowStage ? $nextStatus->workflowStage->name : $nextStatus->status;
                
                // Calculate hours in this stage
                $hoursInStage = $currentStatus->created_at->diffInHours($nextStatus->created_at);
                
                // Add to stage efficiency data
                if (!isset($stageEfficiency[$stageName])) {
                    $stageEfficiency[$stageName] = [
                        'total_hours' => 0,
                        'applications' => 0,
                        'max_hours' => 0,
                        'min_hours' => PHP_INT_MAX,
                    ];
                }
                
                $stageEfficiency[$stageName]['total_hours'] += $hoursInStage;
                $stageEfficiency[$stageName]['applications']++;
                $stageEfficiency[$stageName]['max_hours'] = max($stageEfficiency[$stageName]['max_hours'], $hoursInStage);
                $stageEfficiency[$stageName]['min_hours'] = min($stageEfficiency[$stageName]['min_hours'], $hoursInStage);
                
                // Track transition
                $transitionKey = $stageName . ' → ' . $nextStageName;
                if (!isset($transitionSuccess[$transitionKey])) {
                    $transitionSuccess[$transitionKey] = [
                        'count' => 0,
                        'auto_count' => 0,
                    ];
                }
                
                $transitionSuccess[$transitionKey]['count']++;
                
                // Check if transition was automatic
                // This is a simplification; in a real system, this information might be stored in the workflow data
                $isAuto = $nextStatus->created_at->diffInMinutes($currentStatus->created_at) < 10; // Assume less than 10 minutes means automatic
                if ($isAuto) {
                    $transitionSuccess[$transitionKey]['auto_count']++;
                }
                
                // Track manual interventions - if created by a user
                if ($currentStatus->created_by_user_id) {
                    if (!isset($manualInterventions[$stageName])) {
                        $manualInterventions[$stageName] = 0;
                    }
                    $manualInterventions[$stageName]++;
                }
            }
        }
        
        // Calculate averages and identify bottlenecks
        foreach ($stageEfficiency as $stage => &$data) {
            $data['average_hours'] = $data['applications'] > 0 
                ? round($data['total_hours'] / $data['applications'], 2) 
                : 0;
        }
        
        // Sort stages by average time (descending) to identify bottlenecks
        uasort($stageEfficiency, function ($a, $b) {
            return $b['average_hours'] <=> $a['average_hours'];
        });
        
        // Calculate automation rate for transitions
        foreach ($transitionSuccess as $transition => &$data) {
            $data['automation_rate'] = $data['count'] > 0 
                ? round(($data['auto_count'] / $data['count']) * 100, 2) 
                : 0;
        }
        
        // Prepare data in a more usable format
        $stageEfficiencyData = [];
        foreach ($stageEfficiency as $stage => $data) {
            $stageEfficiencyData[] = array_merge(
                ['stage' => $stage],
                $data,
                ['manual_interventions' => $manualInterventions[$stage] ?? 0]
            );
        }
        
        $transitionSuccessData = [];
        foreach ($transitionSuccess as $transition => $data) {
            $transitionSuccessData[] = array_merge(
                ['transition' => $transition],
                $data
            );
        }
        
        // Identify top bottlenecks
        $bottlenecks = array_slice($stageEfficiencyData, 0, 3);
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'stage_efficiency' => $stageEfficiencyData,
                'transition_success' => $transitionSuccessData,
                'bottlenecks' => $bottlenecks,
                'total_applications_analyzed' => $statusesByApplication->count(),
            ]
        ]);
    }

    /**
     * Generate AI performance report
     *
     * @param Request $request
     * @return Response
     */
    public function aiPerformance(Request $request)
    {
        $dateRange = $this->getDateRangeFromRequest($request);
        $startDate = $dateRange['start_date'];
        $endDate = $dateRange['end_date'];
        
        // Query document verifications that used AI
        $aiVerifications = DocumentVerification::where('verification_method', 'ai')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('document')
            ->get();
        
        // Query manual verifications for comparison
        $manualVerifications = DocumentVerification::where('verification_method', 'manual')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('document')
            ->get();
        
        // Calculate AI verification statistics
        $totalAiVerifications = $aiVerifications->count();
        $successfulAiVerifications = $aiVerifications->where('verification_status', 'verified')->count();
        $aiVerificationRate = $totalAiVerifications > 0 
            ? round(($successfulAiVerifications / $totalAiVerifications) * 100, 2) 
            : 0;
        
        // Calculate average confidence score
        $avgConfidenceScore = $totalAiVerifications > 0 
            ? round($aiVerifications->avg('confidence_score') * 100, 2) 
            : 0;
        
        // Calculate manual override frequency
        $manualOverrides = DB::table('document_verifications as dv1')
            ->join('document_verifications as dv2', function ($join) {
                $join->on('dv1.document_id', '=', 'dv2.document_id')
                     ->where('dv1.verification_method', '=', 'ai')
                     ->where('dv2.verification_method', '=', 'manual')
                     ->whereRaw('dv2.created_at > dv1.created_at');
            })
            ->whereBetween('dv1.created_at', [$startDate, $endDate])
            ->count();
        
        $manualOverrideRate = $totalAiVerifications > 0 
            ? round(($manualOverrides / $totalAiVerifications) * 100, 2) 
            : 0;
        
        // Calculate verification speed comparison
        $aiVerificationTimes = [];
        $manualVerificationTimes = [];
        
        foreach ($aiVerifications as $verification) {
            $document = $verification->document;
            if ($document && $document->created_at) {
                $aiVerificationTimes[] = $verification->created_at->diffInSeconds($document->created_at);
            }
        }
        
        foreach ($manualVerifications as $verification) {
            $document = $verification->document;
            if ($document && $document->created_at) {
                $manualVerificationTimes[] = $verification->created_at->diffInSeconds($document->created_at);
            }
        }
        
        $avgAiTime = count($aiVerificationTimes) > 0 
            ? round(array_sum($aiVerificationTimes) / count($aiVerificationTimes), 2) 
            : 0;
        
        $avgManualTime = count($manualVerificationTimes) > 0 
            ? round(array_sum($manualVerificationTimes) / count($manualVerificationTimes), 2) 
            : 0;
        
        $speedImprovement = $avgManualTime > 0 
            ? round((($avgManualTime - $avgAiTime) / $avgManualTime) * 100, 2) 
            : 0;
        
        // Calculate accuracy by document type
        $accuracyByType = $aiVerifications->groupBy(function ($verification) {
            return $verification->document ? $verification->document->document_type : 'unknown';
        })->map(function ($group) {
            $total = $group->count();
            $correct = $group->where('verification_status', 'verified')->count();
            
            return [
                'count' => $total,
                'success_count' => $correct,
                'accuracy' => $total > 0 ? round(($correct / $total) * 100, 2) : 0,
                'avg_confidence' => $total > 0 ? round($group->avg('confidence_score') * 100, 2) : 0,
            ];
        });
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => [
                'date_range' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'total_ai_verifications' => $totalAiVerifications,
                'ai_verification_success_rate' => $aiVerificationRate,
                'average_confidence_score' => $avgConfidenceScore,
                'manual_override_rate' => $manualOverrideRate,
                'verification_speed' => [
                    'ai_average_seconds' => $avgAiTime,
                    'manual_average_seconds' => $avgManualTime,
                    'speed_improvement_percentage' => $speedImprovement,
                ],
                'accuracy_by_document_type' => $accuracyByType,
            ]
        ]);
    }

    /**
     * Export a report in CSV format
     *
     * @param Request $request
     * @param string $reportType
     * @return Response
     */
    public function exportReport(Request $request, string $reportType)
    {
        // Validate report type
        $validReportTypes = [
            'application-stats',
            'application-trends',
            'document-stats',
            'document-verification-trends',
            'payment-stats',
            'payment-trends',
            'user-stats',
            'conversion-funnel',
            'workflow-efficiency',
            'ai-performance',
        ];
        
        if (!in_array($reportType, $validReportTypes)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_REPORT_TYPE',
                    'message' => 'Invalid report type. Valid types are: ' . implode(', ', $validReportTypes),
                ]
            ], 400);
        }
        
        // Generate report data based on report type
        $reportMethod = str_replace('-', '', $reportType);
        $reportData = $this->$reportMethod($request)->original['data'];
        
        // Convert data to CSV format
        $csv = $this->convertReportToCsv($reportType, $reportData);
        
        // Set headers for file download
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $reportType . '_' . date('Y-m-d') . '.csv"',
        ];
        
        // Return CSV file as download
        return response($csv, 200, $headers);
    }

    /**
     * Generate a custom report based on specified metrics
     *
     * @param Request $request
     * @return Response
     */
    public function customReport(Request $request)
    {
        // Validate request has metrics
        $request->validate([
            'metrics' => 'required|array',
            'metrics.*' => 'string',
        ]);
        
        $metrics = $request->input('metrics');
        $dateRange = $this->getDateRangeFromRequest($request);
        
        // Define valid metrics and their corresponding methods
        $validMetrics = [
            'application_count' => 'getApplicationCount',
            'application_types' => 'getApplicationTypes',
            'application_statuses' => 'getApplicationStatuses',
            'document_count' => 'getDocumentCount',
            'verification_rate' => 'getVerificationRate',
            'payment_total' => 'getPaymentTotal',
            'payment_success_rate' => 'getPaymentSuccessRate',
            'user_count' => 'getUserCount',
            'conversion_funnel' => 'getConversionFunnel',
            'ai_performance' => 'getAiPerformance',
        ];
        
        // Filter out invalid metrics
        $validRequestedMetrics = array_intersect($metrics, array_keys($validMetrics));
        
        if (empty($validRequestedMetrics)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_METRICS',
                    'message' => 'No valid metrics specified. Valid metrics are: ' . implode(', ', array_keys($validMetrics)),
                ]
            ], 400);
        }
        
        // Gather data for each requested metric
        $reportData = [
            'date_range' => [
                'start_date' => $dateRange['start_date']->toDateString(),
                'end_date' => $dateRange['end_date']->toDateString(),
            ],
        ];
        
        foreach ($validRequestedMetrics as $metric) {
            $method = $validMetrics[$metric];
            $reportData[$metric] = $this->$method($dateRange['start_date'], $dateRange['end_date'], $request);
        }
        
        // Return response
        return response()->json([
            'success' => true,
            'data' => $reportData,
        ]);
    }

    /**
     * Helper method to extract and validate date range from request
     *
     * @param Request $request
     * @param int $defaultDays
     * @return array
     */
    private function getDateRangeFromRequest(Request $request, int $defaultDays = 30): array
    {
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now();
        $startDate = $request->input('start_date') 
            ? Carbon::parse($request->input('start_date')) 
            : $endDate->copy()->subDays($defaultDays);
        
        // Ensure start date is before end date
        if ($startDate->isAfter($endDate)) {
            $temp = $startDate;
            $startDate = $endDate;
            $endDate = $temp;
        }
        
        return [
            'start_date' => $startDate->startOfDay(),
            'end_date' => $endDate->endOfDay(),
        ];
    }

    /**
     * Helper method to group applications by time interval
     *
     * @param Collection $applications
     * @param string $groupBy
     * @param string $dateField
     * @return array
     */
    private function groupApplicationsByInterval(Collection $applications, string $groupBy, string $dateField): array
    {
        $grouped = [];
        
        foreach ($applications as $application) {
            $date = $application->$dateField;
            
            if (!$date) {
                continue;
            }
            
            $periodKey = '';
            
            switch ($groupBy) {
                case 'day':
                    $periodKey = $date->format('Y-m-d');
                    break;
                case 'week':
                    $periodKey = $date->copy()->startOfWeek()->format('Y-m-d') . ' - ' . $date->copy()->endOfWeek()->format('Y-m-d');
                    break;
                case 'month':
                    $periodKey = $date->format('Y-m');
                    break;
            }
            
            if (!isset($grouped[$periodKey])) {
                $grouped[$periodKey] = 0;
            }
            
            $grouped[$periodKey]++;
        }
        
        // Sort by period keys
        ksort($grouped);
        
        return $grouped;
    }

    /**
     * Convert report data to CSV format
     *
     * @param string $reportType
     * @param array $reportData
     * @return string
     */
    private function convertReportToCsv(string $reportType, array $reportData): string
    {
        $output = fopen('php://temp', 'r+');
        
        // Add header row and data rows based on report type
        switch ($reportType) {
            case 'application-stats':
                // Write header
                fputcsv($output, ['Metric', 'Value']);
                
                // Write general statistics
                fputcsv($output, ['Date Range', $reportData['date_range']['start_date'] . ' to ' . $reportData['date_range']['end_date']]);
                fputcsv($output, ['Total Applications', $reportData['total_applications']]);
                fputcsv($output, ['Submitted Applications', $reportData['submitted_applications']]);
                fputcsv($output, ['Draft Applications', $reportData['draft_applications']]);
                fputcsv($output, ['Submission Rate', $reportData['submission_rate'] . '%']);
                
                // Add a blank row
                fputcsv($output, []);
                
                // Write applications by type
                fputcsv($output, ['Applications by Type', '']);
                fputcsv($output, ['Type', 'Count', 'Percentage']);
                foreach ($reportData['applications_by_type'] as $type => $data) {
                    fputcsv($output, [$type, $data['count'], $data['percentage'] . '%']);
                }
                
                // Add a blank row
                fputcsv($output, []);
                
                // Write applications by status
                fputcsv($output, ['Applications by Status', '']);
                fputcsv($output, ['Status', 'Count', 'Percentage']);
                foreach ($reportData['applications_by_status'] as $status => $data) {
                    fputcsv($output, [$status, $data['count'], $data['percentage'] . '%']);
                }
                
                // Add a blank row
                fputcsv($output, []);
                
                // Write average time in stage
                fputcsv($output, ['Average Time in Stage', '']);
                fputcsv($output, ['Stage', 'Average Hours']);
                foreach ($reportData['average_time_in_stage'] as $stage => $hours) {
                    fputcsv($output, [$stage, $hours['average_hours']]);
                }
                break;
                
            case 'application-trends':
                // Write header
                fputcsv($output, ['Period', 'Applications Created', 'Applications Submitted', 'Submission Rate']);
                
                // Write trend data
                foreach ($reportData['trend_data'] as $trend) {
                    fputcsv($output, [
                        $trend['period'],
                        $trend['applications_created'],
                        $trend['applications_submitted'],
                        $trend['submission_rate'] . '%',
                    ]);
                }
                break;
                
            case 'document-stats':
                // Write header
                fputcsv($output, ['Metric', 'Value']);
                
                // Write general statistics
                fputcsv($output, ['Date Range', $reportData['date_range']['start_date'] . ' to ' . $reportData['date_range']['end_date']]);
                fputcsv($output, ['Total Documents', $reportData['total_documents']]);
                fputcsv($output, ['Verified Documents', $reportData['verified_documents']]);
                fputcsv($output, ['Unverified Documents', $reportData['unverified_documents']]);
                fputcsv($output, ['Verification Rate', $reportData['verification_rate'] . '%']);
                fputcsv($output, ['Average Verification Time (minutes)', $reportData['average_verification_time_minutes']]);
                
                // Add a blank row
                fputcsv($output, []);
                
                // Write documents by type
                fputcsv($output, ['Documents by Type', '']);
                fputcsv($output, ['Type', 'Count', 'Percentage', 'Verified Count', 'Verified Percentage']);
                foreach ($reportData['documents_by_type'] as $type => $data) {
                    fputcsv($output, [
                        $type,
                        $data['count'],
                        $data['percentage'] . '%',
                        $data['verified_count'],
                        $data['verified_percentage'] . '%',
                    ]);
                }
                
                // Add a blank row
                fputcsv($output, []);
                
                // Write verification methods
                fputcsv($output, ['Verification Methods', '']);
                fputcsv($output, ['Method', 'Count', 'Percentage', 'Success Rate']);
                foreach ($reportData['verification_methods'] as $method => $data) {
                    fputcsv($output, [
                        $method,
                        $data['count'],
                        $data['percentage'] . '%',
                        $data['success_rate'] . '%',
                    ]);
                }
                
                // Add a blank row
                fputcsv($output, []);
                
                // Write confidence scores distribution
                fputcsv($output, ['Confidence Scores Distribution', '']);
                fputcsv($output, ['Level', 'Count']);
                foreach ($reportData['confidence_scores_distribution'] as $level => $count) {
                    fputcsv($output, [$level, $count]);
                }
                break;
                
            default:
                // For any other report type, provide a simple data dump
                // Convert nested arrays to JSON strings for simplicity
                $flattenedData = [];
                foreach ($reportData as $key => $value) {
                    if (is_array($value)) {
                        $flattenedData[$key] = json_encode($value);
                    } else {
                        $flattenedData[$key] = $value;
                    }
                }
                
                // Write header
                fputcsv($output, array_keys($flattenedData));
                
                // Write data
                fputcsv($output, array_values($flattenedData));
                break;
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        return $csv;
    }
    
    /**
     * Get application count for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getApplicationCount(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $query = Application::whereBetween('created_at', [$startDate, $endDate]);
        
        if ($request->has('application_type')) {
            $query->byType($request->input('application_type'));
        }
        
        $total = $query->count();
        $submitted = $query->where('is_submitted', true)->count();
        
        return [
            'total' => $total,
            'submitted' => $submitted,
            'draft' => $total - $submitted,
            'submission_rate' => $total > 0 ? round(($submitted / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Get application types breakdown for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getApplicationTypes(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $applications = Application::whereBetween('created_at', [$startDate, $endDate])->get();
        $totalApplications = $applications->count();
        
        $applicationsByType = $applications->groupBy('application_type')
            ->map(function ($group) use ($totalApplications) {
                return [
                    'count' => $group->count(),
                    'percentage' => $totalApplications > 0 ? round(($group->count() / $totalApplications) * 100, 2) : 0,
                ];
            });
        
        return $applicationsByType->toArray();
    }

    /**
     * Get application statuses breakdown for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getApplicationStatuses(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $applications = Application::with('currentStatus')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
        
        $totalApplications = $applications->count();
        
        $applicationsByStatus = $applications->groupBy(function ($application) {
            return $application->currentStatus ? $application->currentStatus->status : ($application->is_submitted ? 'Submitted' : 'Draft');
        })->map(function ($group) use ($totalApplications) {
            return [
                'count' => $group->count(),
                'percentage' => $totalApplications > 0 ? round(($group->count() / $totalApplications) * 100, 2) : 0,
            ];
        });
        
        return $applicationsByStatus->toArray();
    }

    /**
     * Get document count for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getDocumentCount(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $query = Document::whereBetween('created_at', [$startDate, $endDate]);
        
        if ($request->has('document_type')) {
            $query->byType($request->input('document_type'));
        }
        
        $documents = $query->get();
        $total = $documents->count();
        $verified = $documents->where('is_verified', true)->count();
        
        return [
            'total' => $total,
            'verified' => $verified,
            'unverified' => $total - $verified,
            'verification_rate' => $total > 0 ? round(($verified / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Get verification rate for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getVerificationRate(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $documents = Document::whereBetween('created_at', [$startDate, $endDate]);
        
        if ($request->has('document_type')) {
            $documents->byType($request->input('document_type'));
        }
        
        $verifications = DocumentVerification::whereBetween('created_at', [$startDate, $endDate]);
        
        $verificationsByMethod = $verifications->get()->groupBy('verification_method')
            ->map(function ($group) {
                $total = $group->count();
                $successful = $group->where('verification_status', 'verified')->count();
                
                return [
                    'count' => $total,
                    'success_count' => $successful,
                    'success_rate' => $total > 0 ? round(($successful / $total) * 100, 2) : 0,
                ];
            });
        
        return [
            'by_method' => $verificationsByMethod->toArray(),
            'ai_vs_manual' => [
                'ai_count' => $verifications->where('verification_method', 'ai')->count(),
                'manual_count' => $verifications->where('verification_method', 'manual')->count(),
                'ai_success_rate' => $this->calculateSuccessRate($verifications, 'ai'),
                'manual_success_rate' => $this->calculateSuccessRate($verifications, 'manual'),
            ],
        ];
    }

    /**
     * Helper to calculate success rate for a verification method
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $method
     * @return float
     */
    private function calculateSuccessRate($query, $method): float
    {
        $methodQuery = clone $query;
        $total = $methodQuery->where('verification_method', $method)->count();
        $successful = $methodQuery->where('verification_status', 'verified')->count();
        
        return $total > 0 ? round(($successful / $total) * 100, 2) : 0;
    }

    /**
     * Get payment total for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getPaymentTotal(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $query = Payment::whereBetween('created_at', [$startDate, $endDate]);
        
        if ($request->has('payment_type')) {
            $query->byType($request->input('payment_type'));
        }
        
        $payments = $query->get();
        $totalAmount = $payments->sum('amount');
        $completedAmount = $payments->where('status', 'completed')->sum('amount');
        
        return [
            'total_count' => $payments->count(),
            'total_amount' => round($totalAmount, 2),
            'completed_count' => $payments->where('status', 'completed')->count(),
            'completed_amount' => round($completedAmount, 2),
            'currency' => 'USD', // Assuming USD as default currency
        ];
    }

    /**
     * Get payment success rate for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getPaymentSuccessRate(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $query = Payment::whereBetween('created_at', [$startDate, $endDate]);
        
        if ($request->has('payment_type')) {
            $query->byType($request->input('payment_type'));
        }
        
        $payments = $query->get();
        $total = $payments->count();
        $completed = $payments->where('status', 'completed')->count();
        
        $byMethod = $payments->groupBy('payment_method')
            ->map(function ($group) {
                $groupTotal = $group->count();
                $groupCompleted = $group->where('status', 'completed')->count();
                
                return [
                    'count' => $groupTotal,
                    'completed' => $groupCompleted,
                    'success_rate' => $groupTotal > 0 ? round(($groupCompleted / $groupTotal) * 100, 2) : 0,
                ];
            });
        
        return [
            'overall_success_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            'by_method' => $byMethod->toArray(),
        ];
    }

    /**
     * Get user count for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getUserCount(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $newUsers = User::whereBetween('created_at', [$startDate, $endDate])->count();
        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();
        $verifiedUsers = User::whereNotNull('email_verified_at')->count();
        
        return [
            'total' => $totalUsers,
            'new_in_period' => $newUsers,
            'active' => $activeUsers,
            'inactive' => $totalUsers - $activeUsers,
            'email_verified' => $verifiedUsers,
            'email_verified_percentage' => $totalUsers > 0 ? round(($verifiedUsers / $totalUsers) * 100, 2) : 0,
        ];
    }

    /**
     * Get conversion funnel data for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getConversionFunnel(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $query = Application::whereBetween('created_at', [$startDate, $endDate]);
        
        if ($request->has('application_type')) {
            $query->byType($request->input('application_type'));
        }
        
        $applications = $query->with(['currentStatus', 'documents', 'payments'])->get();
        
        $started = $applications->count();
        $submitted = $applications->where('is_submitted', true)->count();
        
        // Count applications with complete documentation
        $withCompleteDocumentation = $applications->filter(function ($application) {
            $requiredDocs = $application->getRequiredDocuments();
            $uploadedDocTypes = $application->documents->pluck('document_type')->toArray();
            return count(array_diff($requiredDocs, $uploadedDocTypes)) === 0;
        })->count();
        
        // Count applications that have been reviewed
        $reviewed = $applications->filter(function ($application) {
            return $application->currentStatus && in_array($application->currentStatus->status, ['reviewed', 'decision_pending', 'accepted', 'rejected', 'waitlisted']);
        })->count();
        
        // Count applications accepted
        $accepted = $applications->filter(function ($application) {
            return $application->currentStatus && $application->currentStatus->status === 'accepted';
        })->count();
        
        // Count applications with enrollment completed
        $enrolled = $applications->filter(function ($application) {
            return $application->currentStatus && $application->currentStatus->status === 'enrolled';
        })->count();
        
        return [
            'started' => $started,
            'submitted' => $submitted,
            'complete_documentation' => $withCompleteDocumentation,
            'reviewed' => $reviewed,
            'accepted' => $accepted,
            'enrolled' => $enrolled,
            'conversion_rates' => [
                'submission_rate' => $started > 0 ? round(($submitted / $started) * 100, 2) : 0,
                'documentation_rate' => $submitted > 0 ? round(($withCompleteDocumentation / $submitted) * 100, 2) : 0,
                'review_rate' => $withCompleteDocumentation > 0 ? round(($reviewed / $withCompleteDocumentation) * 100, 2) : 0,
                'acceptance_rate' => $reviewed > 0 ? round(($accepted / $reviewed) * 100, 2) : 0,
                'enrollment_rate' => $accepted > 0 ? round(($enrolled / $accepted) * 100, 2) : 0,
                'overall_yield' => $started > 0 ? round(($enrolled / $started) * 100, 2) : 0,
            ],
        ];
    }

    /**
     * Get AI performance data for custom report
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param Request $request
     * @return array
     */
    private function getAiPerformance(Carbon $startDate, Carbon $endDate, Request $request): array
    {
        $aiVerifications = DocumentVerification::where('verification_method', 'ai')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
        
        $total = $aiVerifications->count();
        $successful = $aiVerifications->where('verification_status', 'verified')->count();
        
        $accuracyByType = $aiVerifications->groupBy(function ($verification) {
            return $verification->document ? $verification->document->document_type : 'unknown';
        })->map(function ($group) {
            $total = $group->count();
            $successful = $group->where('verification_status', 'verified')->count();
            
            return [
                'count' => $total,
                'successful' => $successful,
                'accuracy' => $total > 0 ? round(($successful / $total) * 100, 2) : 0,
            ];
        });
        
        return [
            'total_verifications' => $total,
            'successful_verifications' => $successful,
            'success_rate' => $total > 0 ? round(($successful / $total) * 100, 2) : 0,
            'average_confidence' => $total > 0 ? round($aiVerifications->avg('confidence_score') * 100, 2) : 0,
            'by_document_type' => $accuracyByType->toArray(),
        ];
    }
}