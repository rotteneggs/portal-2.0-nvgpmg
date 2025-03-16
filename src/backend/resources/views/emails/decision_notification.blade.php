@extends('layouts.email')

@section('title')
Your Application Decision
@endsection

@section('content')
<!-- Header Section -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
    <tr>
        <td style="padding: 30px 30px 20px 30px; text-align: center;">
            <img src="{{ asset('images/logo.png') }}" alt="Institution Logo" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 100%;">
        </td>
    </tr>
</table>

<!-- Main Content Section -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
    <tr>
        <td style="padding: 0 30px 30px 30px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <!-- Title -->
                <tr>
                    <td style="padding-bottom: 20px;">
                        <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: bold;">Your Application Decision</h1>
                    </td>
                </tr>
                
                <!-- Greeting -->
                <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #555555; font-size: 16px;">Dear {{ $userName }},</p>
                    </td>
                </tr>
                
                <!-- Decision Announcement -->
                <tr>
                    <td style="padding-bottom: 20px;">
                        @if($decisionType === 'accepted')
                            <p style="margin: 0; color: #555555; font-size: 16px;">
                                <strong style="color: #2e7d32;">Congratulations!</strong> We are pleased to inform you that you have been 
                                <strong>accepted</strong> to our {{ $applicationType }} program for the {{ $academicTerm }} {{ $academicYear }} term.
                            </p>
                        @elseif($decisionType === 'rejected')
                            <p style="margin: 0; color: #555555; font-size: 16px;">
                                Thank you for your interest in our {{ $applicationType }} program for the {{ $academicTerm }} {{ $academicYear }} term.
                                After careful review of your application, we regret to inform you that we are unable to offer you admission at this time.
                            </p>
                        @elseif($decisionType === 'waitlisted')
                            <p style="margin: 0; color: #555555; font-size: 16px;">
                                Thank you for your interest in our {{ $applicationType }} program for the {{ $academicTerm }} {{ $academicYear }} term.
                                After reviewing your application, we have placed you on our waitlist.
                            </p>
                        @endif
                    </td>
                </tr>
                
                <!-- Application Details -->
                <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #555555; font-size: 16px;">
                            <strong>Application ID:</strong> {{ $applicationId }}<br>
                            <strong>Decision Date:</strong> {{ $decisionDate }}
                        </p>
                    </td>
                </tr>
                
                <!-- Decision Notes (if any) -->
                @if(!empty($decisionNotes))
                <tr>
                    <td style="padding-bottom: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #f5f5f5; border-left: 4px solid #2196F3;">
                            <tr>
                                <td style="padding: 15px;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">
                                        <strong>Additional Notes:</strong><br>
                                        {{ $decisionNotes }}
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @endif
                
                <!-- Next Steps Section -->
                <tr>
                    <td style="padding-bottom: 10px;">
                        <h2 style="margin: 0; color: #333333; font-size: 20px; font-weight: bold;">Next Steps</h2>
                    </td>
                </tr>
                
                <!-- Decision-specific content -->
                @if($decisionType === 'accepted')
                <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px;">
                            To secure your place in our program, please complete the following steps:
                        </p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0 0 10px 0;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">1. Submit your enrollment confirmation by <strong>{{ $enrollmentDeadline }}</strong></p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 10px 0;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">2. Pay the enrollment deposit of <strong>{{ $depositAmount }}</strong></p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 10px 0;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">3. Review your financial aid package and accept any offered awards</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 10px 0;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">4. Look out for orientation information in the coming weeks</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                
                <!-- Financial Aid Information (for accepted students) -->
                @if(!empty($financialAidInfo))
                <tr>
                    <td style="padding-bottom: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #e8f5e9; border-left: 4px solid #4CAF50;">
                            <tr>
                                <td style="padding: 15px;">
                                    <h3 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 18px; font-weight: bold;">Financial Aid Information</h3>
                                    <p style="margin: 0; color: #555555; font-size: 16px;">
                                        {{ $financialAidInfo }}
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @endif
                
                @elseif($decisionType === 'rejected')
                <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px;">
                            We understand this may be disappointing news. Here are some options you might consider:
                        </p>
                        
                        @if(!empty($alternativeOptions) && count($alternativeOptions) > 0)
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                            @foreach($alternativeOptions as $option)
                            <tr>
                                <td style="padding: 0 0 10px 20px;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">• {{ $option }}</p>
                                </td>
                            </tr>
                            @endforeach
                        </table>
                        @endif
                    </td>
                </tr>
                
                <!-- Appeal Process Information (for rejected students) -->
                @if(!empty($appealProcess))
                <tr>
                    <td style="padding-bottom: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #fff8e1; border-left: 4px solid #FFC107;">
                            <tr>
                                <td style="padding: 15px;">
                                    <h3 style="margin: 0 0 10px 0; color: #ff6f00; font-size: 18px; font-weight: bold;">Appeal Process</h3>
                                    <p style="margin: 0; color: #555555; font-size: 16px;">
                                        {{ $appealProcess }}
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @endif
                
                @elseif($decisionType === 'waitlisted')
                <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px;">
                            Here's what you need to know about our waitlist process:
                        </p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0 0 10px 20px;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">• Your current position on the waitlist: <strong>{{ $waitlistPosition }}</strong></p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 10px 20px;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">• You must confirm your interest in remaining on the waitlist by <strong>{{ $waitlistDeadline }}</strong></p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 10px 20px;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">• We will notify you of any changes to your application status</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 10px 20px;">
                                    <p style="margin: 0; color: #555555; font-size: 16px;">• We recommend having alternative plans in case admission is not possible</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @endif
                
                <!-- Call to Action Button -->
                <tr>
                    <td style="padding: 20px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                            <tr>
                                <td align="center">
                                    <!--[if mso]>
                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $portalUrl }}" style="height:45px;v-text-anchor:middle;width:250px;" arcsize="10%" stroke="f" fillcolor="#1976D2">
                                    <w:anchorlock/>
                                    <center>
                                    <![endif]-->
                                    <a href="{{ $portalUrl }}" style="background-color:#1976D2;border-radius:4px;color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:45px;text-align:center;text-decoration:none;width:250px;-webkit-text-size-adjust:none;">View Your Application Status</a>
                                    <!--[if mso]>
                                    </center>
                                    </v:roundrect>
                                    <![endif]-->
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                
                <!-- Contact Information and Closing -->
                <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px;">
                            If you have any questions about your application or this decision, please contact our admissions office at 
                            <a href="mailto:admissions@institution.edu" style="color: #1976D2; text-decoration: underline;">admissions@institution.edu</a> 
                            or call us at (555) 123-4567.
                        </p>
                        
                        <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px;">
                            Thank you for your interest in our institution.
                        </p>
                        
                        <p style="margin: 0; color: #555555; font-size: 16px;">
                            Sincerely,<br>
                            The Admissions Team<br>
                            Institution Name
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
@endsection

@section('footer')
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
        <td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #777777; font-size: 14px;">
                This email was sent to you because you applied to Institution Name.
            </p>
            <p style="margin: 0 0 10px 0; color: #777777; font-size: 14px;">
                © {{ date('Y') }} Institution Name. All rights reserved.
            </p>
            <p style="margin: 0; color: #777777; font-size: 14px;">
                <a href="{{ url('privacy-policy') }}" style="color: #1976D2; text-decoration: underline;">Privacy Policy</a> | 
                <a href="{{ url('unsubscribe') }}" style="color: #1976D2; text-decoration: underline;">Unsubscribe</a>
            </p>
        </td>
    </tr>
</table>
@endsection