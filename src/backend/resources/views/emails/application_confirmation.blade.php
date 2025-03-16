@extends('layouts.email')

@php
    // Set background colors based on application type
    $headerColor = '#1976D2'; // Default blue
    $accentColor = '#1976D2'; // Default blue
    
    if($application->application_type == 'undergraduate') {
        $headerColor = '#1976D2'; // Blue
        $accentColor = '#1976D2';
    } elseif($application->application_type == 'graduate') {
        $headerColor = '#4CAF50'; // Green
        $accentColor = '#4CAF50';
    } elseif($application->application_type == 'transfer') {
        $headerColor = '#9C27B0'; // Purple
        $accentColor = '#9C27B0';
    }
@endphp

@section('content')
    <!-- Header with logo and title -->
    <div class="header" style="text-align: center; padding: 20px 0; background-color: {{ $headerColor }}; border-radius: 5px;">
        <img src="{{ asset('images/institution-logo-white.png') }}" alt="{{ config('app.name') }}" style="max-width: 200px; height: auto;">
        <h1 style="color: white; margin-top: 20px; font-size: 24px;">Application Confirmation</h1>
    </div>

    <!-- Greeting -->
    <div class="greeting" style="margin-top: 20px; font-size: 16px;">
        <p>Dear {{ $user->first_name }},</p>
    </div>

    <!-- Confirmation message -->
    <div class="confirmation" style="margin-top: 20px; font-size: 16px;">
        <p>Thank you for submitting your application to {{ config('app.name') }}. Your application has been successfully received and is now being processed.</p>
    </div>

    <!-- Application details -->
    <div class="application-details" style="margin-top: 30px; background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
        <h2 style="color: #212121; font-size: 18px; margin-top: 0;">Application Details</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
            <tr>
                <td style="padding: 8px 0; color: #757575;">Application ID:</td>
                <td style="padding: 8px 0; color: #212121;">{{ $application->id }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Application Type:</td>
                <td style="padding: 8px 0; color: #212121;">{{ ucfirst($application->application_type) }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Academic Term:</td>
                <td style="padding: 8px 0; color: #212121;">{{ $application->academic_term }} {{ $application->academic_year }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Submitted On:</td>
                <td style="padding: 8px 0; color: #212121;">{{ $submissionDate }}</td>
            </tr>
            @if(isset($application->application_data['program']))
            <tr>
                <td style="padding: 8px 0; color: #757575;">Program:</td>
                <td style="padding: 8px 0; color: #212121;">{{ $application->application_data['program'] }}</td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Payment confirmation (if applicable) -->
    @if(isset($application->payments) && count($application->payments) > 0)
    <div class="payment" style="margin-top: 30px; background-color: #E8F5E9; padding: 20px; border-radius: 5px; border-left: 4px solid #4CAF50;">
        <h2 style="color: #212121; font-size: 18px; margin-top: 0;">Payment Confirmation</h2>
        <p style="margin-top: 10px;">Your application fee payment has been successfully processed.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 16px; margin-top: 10px;">
            <tr>
                <td style="padding: 8px 0; color: #757575;">Amount:</td>
                <td style="padding: 8px 0; color: #212121;">${{ number_format($application->payments[0]->amount, 2) }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Transaction ID:</td>
                <td style="padding: 8px 0; color: #212121;">{{ $application->payments[0]->transaction_id }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Payment Date:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($application->payments[0]->paid_at)->format('F j, Y') }}</td>
            </tr>
        </table>
    </div>
    @endif

    <!-- Next steps -->
    <div class="next-steps" style="margin-top: 30px; font-size: 16px;">
        <h2 style="color: #212121; font-size: 18px;">Next Steps</h2>
        <ol style="padding-left: 20px; color: #212121;">
            <li style="margin-bottom: 10px;">
                <strong>Check your application status:</strong> You can track the progress of your application at any time by logging into your student portal.
            </li>
            <li style="margin-bottom: 10px;">
                <strong>Upload required documents:</strong> 
                @if($application->application_type == 'undergraduate')
                    Please ensure you upload your high school transcripts, standardized test scores, and personal statement.
                    @if(isset($application->application_data['international']) && $application->application_data['international'])
                        As an international applicant, you'll also need to provide proof of English proficiency (TOEFL/IELTS) and a financial statement.
                    @endif
                @elseif($application->application_type == 'graduate')
                    Please ensure you upload your undergraduate transcripts, standardized test scores, resume, and statement of purpose.
                    @if(isset($application->application_data['international']) && $application->application_data['international'])
                        As an international applicant, you'll also need to provide proof of English proficiency (TOEFL/IELTS) and a financial statement.
                    @endif
                @elseif($application->application_type == 'transfer')
                    Please ensure you upload your current college transcripts, course descriptions, and transfer reason statement.
                    @if(isset($application->application_data['international']) && $application->application_data['international'])
                        As an international transfer applicant, you'll also need to provide proof of English proficiency (TOEFL/IELTS) and a financial statement.
                    @endif
                @else
                    Please ensure all required documents are uploaded promptly.
                @endif
                Missing documents may delay the review of your application.
            </li>
            <li style="margin-bottom: 10px;">
                <strong>Monitor your email:</strong> We will send updates regarding your application status to this email address.
            </li>
        </ol>
    </div>

    <!-- Important Deadlines -->
    <div class="deadlines" style="margin-top: 30px; background-color: #FFF8E1; padding: 20px; border-radius: 5px; border-left: 4px solid #FFC107;">
        <h2 style="color: #212121; font-size: 18px; margin-top: 0;">Important Deadlines</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 16px; margin-top: 10px;">
            @if($application->application_type == 'undergraduate')
            <tr>
                <td style="padding: 8px 0; color: #757575;">Document Submission Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Expected Decision Date:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(45)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Enrollment Deposit Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">May 1, {{ $application->academic_year }}</td>
            </tr>
            @elseif($application->application_type == 'graduate')
            <tr>
                <td style="padding: 8px 0; color: #757575;">Document Submission Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Expected Decision Date:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(60)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Enrollment Intent Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">2 weeks after admission decision</td>
            </tr>
            @elseif($application->application_type == 'transfer')
            <tr>
                <td style="padding: 8px 0; color: #757575;">Document Submission Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Expected Decision Date:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(45)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Enrollment Deposit Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">2 weeks after admission decision</td>
            </tr>
            @else
            <tr>
                <td style="padding: 8px 0; color: #757575;">Document Submission Deadline:</td>
                <td style="padding: 8px 0; color: #212121;">{{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #757575;">Expected Decision Timeline:</td>
                <td style="padding: 8px 0; color: #212121;">4-6 weeks after submission</td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Application Timeline -->
    <div class="timeline" style="margin-top: 30px; font-size: 16px;">
        <h2 style="color: #212121; font-size: 18px;">What Happens Next</h2>
        <div style="position: relative; margin-left: 20px; padding-left: 20px; border-left: 2px solid #EEEEEE;">
            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -26px; width: 24px; height: 24px; background-color: {{ $accentColor }}; border-radius: 50%; text-align: center; color: white; font-weight: bold; line-height: 24px;">1</div>
                <h3 style="margin: 0; font-size: 16px; color: #212121;">Document Verification</h3>
                <p style="margin-top: 5px; color: #757575;">Our team will verify your submitted documents.</p>
                <p style="margin-top: 5px; font-size: 14px; color: #757575;">Estimated time: 1-2 weeks</p>
            </div>

            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -26px; width: 24px; height: 24px; background-color: {{ $accentColor }}; border-radius: 50%; text-align: center; color: white; font-weight: bold; line-height: 24px;">2</div>
                <h3 style="margin: 0; font-size: 16px; color: #212121;">Application Review</h3>
                <p style="margin-top: 5px; color: #757575;">Your application will be reviewed by the admissions committee.</p>
                <p style="margin-top: 5px; font-size: 14px; color: #757575;">
                    @if($application->application_type == 'undergraduate')
                        Estimated time: 2-3 weeks
                    @elseif($application->application_type == 'graduate')
                        Estimated time: 3-4 weeks
                    @elseif($application->application_type == 'transfer')
                        Estimated time: 2-4 weeks
                    @else
                        Estimated time: 2-4 weeks
                    @endif
                </p>
            </div>

            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -26px; width: 24px; height: 24px; background-color: {{ $accentColor }}; border-radius: 50%; text-align: center; color: white; font-weight: bold; line-height: 24px;">3</div>
                <h3 style="margin: 0; font-size: 16px; color: #212121;">Decision Notification</h3>
                <p style="margin-top: 5px; color: #757575;">You will be notified of the admission decision via email and in your student portal.</p>
            </div>

            <div style="position: relative;">
                <div style="position: absolute; left: -26px; width: 24px; height: 24px; background-color: {{ $accentColor }}; border-radius: 50%; text-align: center; color: white; font-weight: bold; line-height: 24px;">4</div>
                <h3 style="margin: 0; font-size: 16px; color: #212121;">Next Steps After Admission</h3>
                <p style="margin-top: 5px; color: #757575;">If admitted, you will receive information about enrollment deposits, orientation, and registration.</p>
            </div>
        </div>
    </div>

    <!-- Call to action -->
    <div class="cta" style="margin-top: 30px; text-align: center;">
        <a href="{{ $portalUrl }}" style="background-color: {{ $accentColor }}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">View Application Status</a>
    </div>

    <!-- Contact information -->
    <div class="contact-info" style="margin-top: 30px; font-size: 16px;">
        <h2 style="color: #212121; font-size: 18px;">Questions?</h2>
        <p>If you have any questions or need assistance, please contact our admissions office:</p>
        
        @if($application->application_type == 'undergraduate')
            <p>Email: <a href="mailto:undergrad.admissions@institution.edu" style="color: {{ $accentColor }}; text-decoration: underline;">undergrad.admissions@institution.edu</a></p>
            <p>Phone: (555) 123-4567</p>
            <p>Hours: Monday-Friday, 9:00 AM - 5:00 PM EST</p>
        @elseif($application->application_type == 'graduate')
            <p>Email: <a href="mailto:grad.admissions@institution.edu" style="color: {{ $accentColor }}; text-decoration: underline;">grad.admissions@institution.edu</a></p>
            <p>Phone: (555) 234-5678</p>
            <p>Hours: Monday-Friday, 9:00 AM - 5:00 PM EST</p>
        @elseif($application->application_type == 'transfer')
            <p>Email: <a href="mailto:transfer.admissions@institution.edu" style="color: {{ $accentColor }}; text-decoration: underline;">transfer.admissions@institution.edu</a></p>
            <p>Phone: (555) 345-6789</p>
            <p>Hours: Monday-Friday, 9:00 AM - 5:00 PM EST</p>
        @else
            <p>Email: <a href="mailto:admissions@institution.edu" style="color: {{ $accentColor }}; text-decoration: underline;">admissions@institution.edu</a></p>
            <p>Phone: (555) 123-4567</p>
            <p>Hours: Monday-Friday, 9:00 AM - 5:00 PM EST</p>
        @endif
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer" style="margin-top: 30px; font-size: 14px; color: #757575; border-top: 1px solid #EEEEEE; padding-top: 20px;">
        <p>This email confirms the receipt of your application only and does not guarantee admission to {{ config('app.name') }}. All applications are subject to review and verification of submitted information. Providing false or misleading information may result in the denial of your application or revocation of admission.</p>
    </div>
@endsection

@section('footer')
    <div class="footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #EEEEEE; font-size: 14px; color: #757575; text-align: center;">
        <div class="social-media" style="margin-bottom: 20px;">
            <a href="https://facebook.com/institution" style="display: inline-block; margin: 0 10px;"><img src="{{ asset('images/email/facebook-icon.png') }}" alt="Facebook" style="width: 24px; height: 24px;"></a>
            <a href="https://twitter.com/institution" style="display: inline-block; margin: 0 10px;"><img src="{{ asset('images/email/twitter-icon.png') }}" alt="Twitter" style="width: 24px; height: 24px;"></a>
            <a href="https://instagram.com/institution" style="display: inline-block; margin: 0 10px;"><img src="{{ asset('images/email/instagram-icon.png') }}" alt="Instagram" style="width: 24px; height: 24px;"></a>
            <a href="https://linkedin.com/school/institution" style="display: inline-block; margin: 0 10px;"><img src="{{ asset('images/email/linkedin-icon.png') }}" alt="LinkedIn" style="width: 24px; height: 24px;"></a>
        </div>
        <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
        <p>
            This email was sent to {{ $user->email }}. 
            <a href="{{ route('notification.preferences') }}" style="color: {{ $accentColor }}; text-decoration: underline;">Manage notification preferences</a>.
        </p>
    </div>
@endsection

@section('plain-text')
Application Confirmation

Dear {{ $user->first_name }},

Thank you for submitting your application to {{ config('app.name') }}. Your application has been successfully received and is now being processed.

APPLICATION DETAILS:
Application ID: {{ $application->id }}
Application Type: {{ ucfirst($application->application_type) }}
Academic Term: {{ $application->academic_term }} {{ $application->academic_year }}
Submitted On: {{ $submissionDate }}
@if(isset($application->application_data['program']))
Program: {{ $application->application_data['program'] }}
@endif

@if(isset($application->payments) && count($application->payments) > 0)
PAYMENT CONFIRMATION:
Amount: ${{ number_format($application->payments[0]->amount, 2) }}
Transaction ID: {{ $application->payments[0]->transaction_id }}
Payment Date: {{ \Carbon\Carbon::parse($application->payments[0]->paid_at)->format('F j, Y') }}
@endif

NEXT STEPS:
1. Check your application status by logging into your student portal at: {{ $portalUrl }}
2. Upload all required documents promptly.
@if($application->application_type == 'undergraduate')
   * High school transcripts
   * Standardized test scores
   * Personal statement
   @if(isset($application->application_data['international']) && $application->application_data['international'])
   * Proof of English proficiency (TOEFL/IELTS)
   * Financial statement
   @endif
@elseif($application->application_type == 'graduate')
   * Undergraduate transcripts
   * Standardized test scores
   * Resume
   * Statement of purpose
   @if(isset($application->application_data['international']) && $application->application_data['international'])
   * Proof of English proficiency (TOEFL/IELTS)
   * Financial statement
   @endif
@elseif($application->application_type == 'transfer')
   * Current college transcripts
   * Course descriptions
   * Transfer reason statement
   @if(isset($application->application_data['international']) && $application->application_data['international'])
   * Proof of English proficiency (TOEFL/IELTS)
   * Financial statement
   @endif
@endif
3. Monitor your email for updates regarding your application status.

IMPORTANT DEADLINES:
@if($application->application_type == 'undergraduate')
Document Submission Deadline: {{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}
Expected Decision Date: {{ \Carbon\Carbon::parse($submissionDate)->addDays(45)->format('F j, Y') }}
Enrollment Deposit Deadline: May 1, {{ $application->academic_year }}
@elseif($application->application_type == 'graduate')
Document Submission Deadline: {{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}
Expected Decision Date: {{ \Carbon\Carbon::parse($submissionDate)->addDays(60)->format('F j, Y') }}
Enrollment Intent Deadline: 2 weeks after admission decision
@elseif($application->application_type == 'transfer')
Document Submission Deadline: {{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}
Expected Decision Date: {{ \Carbon\Carbon::parse($submissionDate)->addDays(45)->format('F j, Y') }}
Enrollment Deposit Deadline: 2 weeks after admission decision
@else
Document Submission Deadline: {{ \Carbon\Carbon::parse($submissionDate)->addDays(30)->format('F j, Y') }}
Expected Decision Timeline: 4-6 weeks after submission
@endif

WHAT HAPPENS NEXT:
1. Document Verification (1-2 weeks): Our team will verify your submitted documents.
2. Application Review (
@if($application->application_type == 'undergraduate')
2-3 weeks
@elseif($application->application_type == 'graduate')
3-4 weeks
@elseif($application->application_type == 'transfer')
2-4 weeks
@else
2-4 weeks
@endif
): Your application will be reviewed by the admissions committee.
3. Decision Notification: You will be notified of the admission decision via email and in your student portal.
4. Next Steps After Admission: If admitted, you will receive information about enrollment deposits, orientation, and registration.

QUESTIONS?
If you have any questions, please contact:
@if($application->application_type == 'undergraduate')
Email: undergrad.admissions@institution.edu
Phone: (555) 123-4567
@elseif($application->application_type == 'graduate')
Email: grad.admissions@institution.edu
Phone: (555) 234-5678
@elseif($application->application_type == 'transfer')
Email: transfer.admissions@institution.edu
Phone: (555) 345-6789
@else
Email: admissions@institution.edu
Phone: (555) 123-4567
@endif
Hours: Monday-Friday, 9:00 AM - 5:00 PM EST

DISCLAIMER:
This email confirms the receipt of your application only and does not guarantee admission to {{ config('app.name') }}. All applications are subject to review and verification of submitted information. Providing false or misleading information may result in the denial of your application or revocation of admission.

© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.

This email was sent to {{ $user->email }}. 
To manage your notification preferences, visit: {{ route('notification.preferences') }}

Follow us:
Facebook: https://facebook.com/institution
Twitter: https://twitter.com/institution
Instagram: https://instagram.com/institution
LinkedIn: https://linkedin.com/school/institution
@endsection