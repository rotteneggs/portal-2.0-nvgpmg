@extends('layouts.email')

@section('content')
<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
        <td align="center" style="background-color: #f8f9fa; padding: 40px 0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                    <td align="center" style="padding: 30px 40px 20px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="center">
                                    <img src="{{ $institution['logo_url'] }}" alt="{{ $institution['name'] }}" style="max-width: 200px; height: auto;" />
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 20px 0 0 0;">
                                    <h1 style="color: #1976D2; font-family: 'Roboto', Arial, sans-serif; font-size: 24px; font-weight: 600; margin: 0; line-height: 30px;">Payment Receipt</h1>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Greeting -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <p style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; line-height: 24px; margin: 0;">Dear {{ $user->first_name }} {{ $user->last_name }},</p>
                        <p style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; line-height: 24px; margin: 16px 0 0 0;">Thank you for your payment. This email confirms that your payment has been processed successfully. Please find your receipt details below.</p>
                    </td>
                </tr>

                <!-- Receipt Details -->
                <tr>
                    <td style="padding: 0 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #EEEEEE; border-radius: 6px; margin: 0 0 20px 0;">
                            <tr>
                                <td colspan="2" style="background-color: #f8f9fa; border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 20px; text-transform: uppercase;">
                                    Receipt Information
                                </td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Receipt Number:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $receiptNumber }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Transaction ID:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->transaction_id }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Payment Date:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $paymentDate }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Payment Method:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->payment_method }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Payment Type:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->payment_type }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Status:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #4CAF50; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 20px; width: 60%;">{{ $payment->status }}</td>
                            </tr>
                            <tr>
                                <td style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Amount:</td>
                                <td style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 18px; font-weight: 600; padding: 12px 20px; width: 60%;">{{ $formattedAmount }}</td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Application Details (if applicable) -->
                @if($payment->application_id)
                <tr>
                    <td style="padding: 0 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #EEEEEE; border-radius: 6px; margin: 0 0 20px 0;">
                            <tr>
                                <td colspan="2" style="background-color: #f8f9fa; border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 20px; text-transform: uppercase;">
                                    Application Information
                                </td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Application ID:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->application->id }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Application Type:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->application->application_type }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Academic Term:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->application->academic_term }}</td>
                            </tr>
                            <tr>
                                <td style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Academic Year:</td>
                                <td style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->application->academic_year }}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @endif

                <!-- Billing Details -->
                @if(isset($payment->payment_data['billing_details']))
                <tr>
                    <td style="padding: 0 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #EEEEEE; border-radius: 6px; margin: 0 0 20px 0;">
                            <tr>
                                <td colspan="2" style="background-color: #f8f9fa; border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 20px; text-transform: uppercase;">
                                    Billing Information
                                </td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Name:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $payment->payment_data['billing_details']['name'] ?? $user->first_name . ' ' . $user->last_name }}</td>
                            </tr>
                            @if(isset($payment->payment_data['billing_details']['address']))
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%; vertical-align: top;">Address:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">
                                    {{ $payment->payment_data['billing_details']['address']['line1'] ?? '' }}<br>
                                    @if(isset($payment->payment_data['billing_details']['address']['line2']))
                                        {{ $payment->payment_data['billing_details']['address']['line2'] }}<br>
                                    @endif
                                    {{ $payment->payment_data['billing_details']['address']['city'] ?? '' }}, 
                                    {{ $payment->payment_data['billing_details']['address']['state'] ?? '' }} 
                                    {{ $payment->payment_data['billing_details']['address']['postal_code'] ?? '' }}<br>
                                    {{ $payment->payment_data['billing_details']['address']['country'] ?? '' }}
                                </td>
                            </tr>
                            @endif
                            @if(isset($payment->payment_data['last_digits']))
                            <tr>
                                <td style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Card Number:</td>
                                <td style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">**** **** **** {{ $payment->payment_data['last_digits'] }}</td>
                            </tr>
                            @endif
                        </table>
                    </td>
                </tr>
                @endif

                <!-- Institution Details -->
                <tr>
                    <td style="padding: 0 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #EEEEEE; border-radius: 6px; margin: 0 0 20px 0;">
                            <tr>
                                <td colspan="2" style="background-color: #f8f9fa; border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 20px; text-transform: uppercase;">
                                    Institution Information
                                </td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Name:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $institution['name'] }}</td>
                            </tr>
                            <tr>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%; vertical-align: top;">Address:</td>
                                <td style="border-bottom: 1px solid #EEEEEE; color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $institution['address'] }}</td>
                            </tr>
                            @if(isset($institution['tax_id']))
                            <tr>
                                <td style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 40%;">Tax ID:</td>
                                <td style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; padding: 12px 20px; width: 60%;">{{ $institution['tax_id'] }}</td>
                            </tr>
                            @endif
                        </table>
                    </td>
                </tr>

                <!-- Call to Action -->
                <tr>
                    <td style="padding: 0 40px 20px 40px; text-align: center;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="text-align: center;">
                                    <a href="{{ $paymentHistoryUrl }}" style="background-color: #1976D2; border-radius: 4px; color: #ffffff; display: inline-block; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 500; line-height: 24px; margin: 0; padding: 10px 24px; text-decoration: none; text-align: center; text-transform: uppercase;">View Payment History</a>
                                </td>
                            </tr>
                            @if(isset($pdfReceiptUrl))
                            <tr>
                                <td style="padding: 20px 0 0 0; text-align: center;">
                                    <a href="{{ $pdfReceiptUrl }}" style="color: #1976D2; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; text-decoration: none;">Download PDF Receipt</a>
                                </td>
                            </tr>
                            @endif
                        </table>
                    </td>
                </tr>

                <!-- Contact Information -->
                <tr>
                    <td style="background-color: #f8f9fa; border-radius: 0 0 8px 8px; padding: 20px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="center" style="padding: 0 0 20px 0;">
                                    <p style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; line-height: 21px; margin: 0;">If you have any questions about this payment, please contact us:</p>
                                </td>
                            </tr>
                            <tr>
                                <td align="center">
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td style="padding: 0 10px;">
                                                <a href="mailto:{{ $institution['support_email'] }}" style="color: #1976D2; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; text-decoration: none;">{{ $institution['support_email'] }}</a>
                                            </td>
                                            <td style="padding: 0 10px;">
                                                <span style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 14px;">|</span>
                                            </td>
                                            <td style="padding: 0 10px;">
                                                <span style="color: #212121; font-family: 'Roboto', Arial, sans-serif; font-size: 14px;">{{ $institution['support_phone'] }}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
@endsection

@section('footer')
<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
        <td align="center" style="padding: 40px 0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
                <tr>
                    <td align="center" style="padding: 0 40px 10px 40px;">
                        <p style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 12px; line-height: 18px; margin: 0;">
                            This is an automated email, please do not reply to this message.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding: 0 40px 20px 40px;">
                        <p style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 12px; line-height: 18px; margin: 0;">
                            &copy; {{ date('Y') }} {{ $institution['name'] }}. All rights reserved.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding: 0 40px;">
                        <p style="color: #757575; font-family: 'Roboto', Arial, sans-serif; font-size: 12px; line-height: 18px; margin: 0;">
                            Please keep this receipt for your records. This receipt serves as the official record of your payment.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
@endsection