<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{ config('app.name') }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <tr>
                        <td style="background-color: rgb(16, 32, 89); padding: 24px 32px;">
                            <h1 style="margin: 0; font-size: 22px; color: #ffffff;">Welcome to {{ config('app.name') }}</h1>
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
                                Your {{ $userTypeLabel }} account has been created successfully. You can sign in using the credentials below.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">Your login credentials</p>
                                        <p style="margin: 0 0 8px; font-size: 15px;"><strong>Email:</strong> {{ $user->userDetail->email }}</p>
                                        <p style="margin: 0 0 8px; font-size: 15px;"><strong>Username:</strong> {{ $username }}</p>
                                        <p style="margin: 0; font-size: 15px;"><strong>Password:</strong> {{ $plainPassword }}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                                For your security, please change your password after your first login.
                            </p>

                            <a href="{{ $loginUrl }}" style="display: inline-block; background-color: rgb(16, 32, 89); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: bold;">
                                Sign in to your account
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                                If you did not expect this email, please contact your administrator.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
