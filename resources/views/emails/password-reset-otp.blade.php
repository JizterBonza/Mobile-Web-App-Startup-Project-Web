<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset — {{ config('app.name') }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <tr>
                        <td style="background-color: rgb(16, 32, 89); padding: 24px 32px;">
                            <h1 style="margin: 0; font-size: 22px; color: #ffffff;">Password Reset</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px;">
                            @php
                                $firstName = $user->userDetail->first_name ?? 'there';
                            @endphp

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
                                Hello {{ $firstName }},
                            </p>

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password. Use the code below in the app to set a new password.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">Your reset code</p>
                                        <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: rgb(16, 32, 89);">{{ $otp }}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                                This code expires in <strong>{{ $expiresInMinutes }} minutes</strong>.
                            </p>

                            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #6b7280;">
                                If you did not request a password reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                                This is an automated message from {{ config('app.name') }}.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
