@extends('layouts.email')

@section('content')
<table class="main-table" width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
        <td class="content-cell">
            <div class="header" style="text-align: center; margin-bottom: 25px;">
                <img src="{{ asset('images/logo.png') }}" alt="{{ config('app.name') }}" style="max-width: 200px; height: auto;">
                <h1 style="color: #1976D2; margin-top: 20px;">Document Verification Confirmation</h1>
            </div>

            <div class="greeting" style="margin-bottom: 20px;">
                <p>Dear {{ $user->first_name }},</p>
            </div>

            <div class="verification-message" style="margin-bottom: 25px;">
                <p>We are pleased to inform you that your document has been successfully verified for your application to {{ config('app.name') }}.</p>
            </div>

            <div class="document-details" style="background-color: #f5f8fa; border-radius: 5px; padding: 15px; margin-bottom: 25px;">
                <h2 style="color: #1976D2; font-size: 18px; margin-top: 0;">Document Details</h2>
                <table width="100%" cellpadding="5" cellspacing="0" role="presentation">
                    <tr>
                        <td width="40%" style="font-weight: bold;">Document Type:</td>
                        <td>{{ ucfirst($document->document_type) }}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">File Name:</td>
                        <td>{{ $document->file_name }}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Verification Date:</td>
                        <td>{{ $verificationDate }}</td>
                    </tr>
                    @if ($verification->verification_method)
                    <tr>
                        <td style="font-weight: bold;">Verification Method:</td>
                        <td>{{ ucfirst($verification->verification_method) }}</td>
                    </tr>
                    @endif
                    @if ($verification->verification_method === 'ai' && $verification->confidence_score)
                    <tr>
                        <td style="font-weight: bold;">Confidence Score:</td>
                        <td>{{ number_format($verification->confidence_score * 100, 1) }}%</td>
                    </tr>
                    @endif
                </table>
            </div>

            <div class="application-context" style="margin-bottom: 25px;">
                <h2 style="color: #1976D2; font-size: 18px;">Application Status</h2>
                <p>This document is associated with your {{ $application->application_type }} application (ID: {{ $application->id }}).</p>
                <p>Your application is currently in the <strong>{{ $application->current_status->status }}</strong> stage.</p>
            </div>

            <div class="next-steps" style="margin-bottom: 25px;">
                <h2 style="color: #1976D2; font-size: 18px;">Next Steps</h2>
                
                @if ($remainingDocuments > 0)
                <p>You still have <strong>{{ $remainingDocuments }}</strong> document(s) that require verification. Please ensure all required documents are uploaded to complete your application.</p>
                @else
                <p>Great news! All your required documents have been verified. Your application will now proceed to the next stage of review.</p>
                @endif

                <p>Our admissions team will continue processing your application, and you can expect {{ $nextStep['action'] }} by {{ $nextStep['date'] }}.</p>
            </div>

            <div class="call-to-action" style="text-align: center; margin: 35px 0;">
                <a href="{{ $portalUrl }}" class="button" style="background-color: #1976D2; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; display: inline-block;">View Document Status</a>
            </div>

            <div class="contact-information" style="margin-bottom: 25px; font-size: 14px;">
                <p>If you have any questions about your document verification or application status, please contact our admissions team:</p>
                <p>Email: <a href="mailto:{{ config('admissions.support_email') }}">{{ config('admissions.support_email') }}</a><br>
                Phone: {{ config('admissions.support_phone') }}</p>
            </div>
        </td>
    </tr>
</table>
@endsection

@section('footer')
<table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
        <td class="content-cell" align="center">
            <p style="color: #718096; font-size: 12px; text-align: center; margin-top: 20px;">
                &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
            </p>
            <p style="color: #718096; font-size: 12px; text-align: center;">
                <a href="{{ route('notifications.preferences', ['user' => $user->id, 'token' => $unsubscribeToken]) }}" style="color: #718096; text-decoration: underline;">
                    Manage notification preferences
                </a>
            </p>
        </td>
    </tr>
</table>
@endsection