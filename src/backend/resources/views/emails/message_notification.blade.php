@extends('layouts.email')

@section('title', 'New Message Notification')

@section('content')
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message Notification</title>
    <style>
        /* Ensuring email clients render styles properly by using inline CSS */
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; color: #212121; background-color: #f5f5f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px;">
                    <!-- Header with logo and title -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; background-color: #1976D2; border-radius: 8px 8px 0 0;">
                            <img src="{{ $message->embed(public_path().'/images/logo.png') }}" alt="Institution Logo" width="180" style="display: block; margin: 0 auto 15px auto;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 500;">New Message Notification</h1>
                        </td>
                    </tr>
                    
                    <!-- Main content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 24px;">Hello {{ $recipientName }},</p>
                            
                            <!-- Notification message -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px;">You have received a new message in your Student Admissions Enrollment Platform inbox.</p>
                            
                            <!-- Message details -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; background-color: #f9f9f9; border-radius: 4px; border-left: 4px solid #1976D2;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #757575;">From:</p>
                                        <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 500;">{{ $senderName }}</p>
                                        
                                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #757575;">Subject:</p>
                                        <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 500;">{{ $messageSubject }}</p>
                                        
                                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #757575;">Sent:</p>
                                        <p style="margin: 0 0 15px 0; font-size: 15px;">{{ $sentTime }}</p>
                                        
                                        @if(isset($applicationId) && isset($applicationName))
                                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #757575;">Related Application:</p>
                                        <p style="margin: 0 0 15px 0; font-size: 15px;">{{ $applicationName }}</p>
                                        @endif
                                        
                                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #757575;">Message Preview:</p>
                                        <p style="margin: 0; font-size: 15px; font-style: italic; color: #555;">{{ $messagePreview }}...</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Call to Action Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $portalUrl }}/messages/{{ $messageId }}" target="_blank" style="display: inline-block; background-color: #1976D2; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-size: 16px; font-weight: 500;">View Message</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Additional information -->
                            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px;">Please note that you can only reply to this message within the platform. Do not reply to this email notification.</p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 15px; line-height: 24px;">If you have any questions, please contact our admissions support team.</p>
                            
                            <p style="margin: 0; font-size: 15px; line-height: 24px;">Thank you,<br>The Admissions Team</p>
                        </td>
                    </tr>
                    
                    <!-- Contact Information -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #eeeeee; padding-top: 20px;">
                                <tr>
                                    <td style="font-size: 14px; color: #757575;">
                                        <p style="margin: 0 0 5px 0;">Need help? Contact us:</p>
                                        <p style="margin: 0 0 5px 0;">Email: <a href="mailto:admissions@institution.edu" style="color: #1976D2; text-decoration: none;">admissions@institution.edu</a></p>
                                        <p style="margin: 0;">Phone: (555) 123-4567</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto;">
                    <tr>
                        <td style="padding: 20px 0; text-align: center; color: #757575; font-size: 12px;">
                            <p style="margin: 0 0 10px 0;">&copy; {{ date('Y') }} Institution Name. All rights reserved.</p>
                            <p style="margin: 0 0 10px 0;">
                                <a href="{{ $portalUrl }}/profile/notification-preferences" style="color: #1976D2; text-decoration: none;">Manage notification preferences</a>
                            </p>
                            <p style="margin: 0;">This email was sent to you because you're registered in the Student Admissions Enrollment Platform.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
@endsection

@section('footer')
    @include('emails.partials.footer')
@endsection