@extends('layouts.email')

@section('content')
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td style="padding: 20px 0; text-align: center;">
                <img src="{{ asset('images/logo.png') }}" alt="{{ config('app.name') }}" width="200" height="auto" style="display: block; margin: 0 auto;">
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                <h1 style="color: #1976D2; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: bold;">Application Status Update</h1>
                
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 15px;">Dear {{ $user->first_name }},</p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 20px;">
                    We're writing to inform you that the status of your application has been updated to 
                    <strong style="color: #1976D2;">{{ $newStatus->status }}</strong>
                    @if($previousStatus)
                        from <span style="color: #757575;">{{ $previousStatus->status }}</span>
                    @endif
                    on {{ $statusChangeDate }}.
                </p>
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px; background-color: #f7f7f7; border-radius: 4px; padding: 15px;">
                    <tr>
                        <td style="padding-bottom: 10px;">
                            <strong style="color: #757575; font-size: 14px;">Application ID:</strong>
                            <span style="color: #212121; font-size: 14px;">{{ $application->id }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 10px;">
                            <strong style="color: #757575; font-size: 14px;">Application Type:</strong>
                            <span style="color: #212121; font-size: 14px;">{{ $application->application_type }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 10px;">
                            <strong style="color: #757575; font-size: 14px;">Academic Term:</strong>
                            <span style="color: #212121; font-size: 14px;">{{ $application->academic_term }} {{ $application->academic_year }}</span>
                        </td>
                    </tr>
                </table>
                
                <h2 style="color: #1976D2; font-size: 18px; margin-top: 25px; margin-bottom: 15px;">Status Details</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 20px;">
                    {{ $newStatus->description ?? 'Your application is progressing through our admissions process.' }}
                </p>
                
                {{-- Status-specific content --}}
                @if($newStatus->status == 'Submitted')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #E3F2FD; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #0D47A1; margin: 0;">
                            Thank you for submitting your application. Our admissions team will review your application 
                            and required documents. Please ensure all required documents are uploaded to your application portal.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Under Review')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #E3F2FD; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #0D47A1; margin: 0;">
                            Your application is now under review by our admissions team. This process typically takes 2-3 weeks.
                            You can check your application status anytime through your student portal.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Additional Information Requested')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #FFF3E0; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #E65100; margin: 0;">
                            We need additional information to continue processing your application. Please log in to your 
                            student portal to view the specific items we need from you. Providing this information promptly 
                            will help us process your application without delays.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Committee Review')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #E3F2FD; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #0D47A1; margin: 0;">
                            Your application has been forwarded to our admissions committee for review. This is the final 
                            stage before a decision is made. The committee review process typically takes 1-2 weeks.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Decision Pending')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #E3F2FD; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #0D47A1; margin: 0;">
                            The review of your application is complete, and a decision is pending. You should receive your 
                            admission decision within the next 5-7 business days.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Accepted')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #E8F5E9; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #1B5E20; margin: 0;">
                            Congratulations! We are pleased to inform you that you have been accepted to our institution. 
                            Please log in to your student portal to view your acceptance package and complete the enrollment process.
                            The deadline to confirm your enrollment is {{ $application->enrollment_deadline ?? 'stated in your acceptance letter' }}.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Waitlisted')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #FFF3E0; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #E65100; margin: 0;">
                            You have been placed on our waitlist. While we are unable to offer you admission at this time, 
                            you may be offered admission if space becomes available. We will notify you of any change in your 
                            status. Please log in to your student portal for more information about the waitlist process.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Rejected')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #424242; margin: 0;">
                            After careful consideration, we regret to inform you that we are unable to offer you admission 
                            at this time. This decision is not a reflection on your abilities or potential. Please log in to 
                            your student portal for more information and alternative options that may be available to you.
                        </p>
                    </div>
                @elseif($newStatus->status == 'Enrolled')
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #E8F5E9; border-radius: 4px;">
                        <p style="font-size: 16px; line-height: 1.5; color: #1B5E20; margin: 0;">
                            Welcome to our institution! Your enrollment has been confirmed, and we're excited to have you 
                            join our community. Please check your student portal for important information about orientation, 
                            course registration, and next steps to prepare for your academic journey.
                        </p>
                    </div>
                @endif
                
                <h2 style="color: #1976D2; font-size: 18px; margin-top: 25px; margin-bottom: 15px;">Next Steps</h2>
                
                @if($newStatus->required_actions)
                    <ul style="color: #212121; font-size: 16px; line-height: 1.5; margin-bottom: 20px; padding-left: 20px;">
                        @foreach(json_decode($newStatus->required_actions) as $action)
                            <li style="margin-bottom: 10px;">{{ $action }}</li>
                        @endforeach
                    </ul>
                @else
                    <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 20px;">
                        Please log in to your student portal to view detailed information about your application status 
                        and any actions you may need to take.
                    </p>
                @endif
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ $portalUrl }}" style="display: inline-block; background-color: #1976D2; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 25px; border-radius: 4px;">View Application Status</a>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 10px;">
                    If you have any questions or need assistance, please don't hesitate to contact our admissions office:
                </p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 30px;">
                    Email: <a href="mailto:admissions@institution.edu" style="color: #1976D2; text-decoration: underline;">admissions@institution.edu</a><br>
                    Phone: (555) 123-4567
                </p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 20px;">
                    Thank you for your interest in our institution.
                </p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #212121; margin-bottom: 0;">
                    Sincerely,<br>
                    The Admissions Team<br>
                    {{ config('app.name') }}
                </p>
            </td>
        </tr>
    </table>
@endsection

@section('footer')
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td style="padding: 20px; text-align: center; font-size: 14px; color: #757575; background-color: #f7f7f7; border-radius: 4px;">
                <p style="margin-bottom: 10px;">
                    &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
                </p>
                <p style="margin-bottom: 10px;">
                    This email was sent to {{ $user->email }}. 
                </p>
                <p style="margin-bottom: 0;">
                    <a href="{{ route('notifications.preferences') }}" style="color: #1976D2; text-decoration: underline;">Manage notification preferences</a>
                </p>
            </td>
        </tr>
    </table>
@endsection