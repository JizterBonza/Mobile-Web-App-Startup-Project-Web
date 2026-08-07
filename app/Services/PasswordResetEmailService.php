<?php

namespace App\Services;

use App\Mail\PasswordResetOtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PasswordResetEmailService
{
    public function send(User $user, string $otp, int $expiresInMinutes = 60): bool
    {
        if ($this->mailerIsLog()) {
            Log::info('Password reset OTP email written to log only (MAIL_MAILER=log). Configure SMTP in .env to deliver to inbox.', [
                'user_id' => $user->id,
                'email' => $user->userDetail?->email,
            ]);
        }

        if (! $this->mailIsConfigured()) {
            Log::warning('Password reset OTP email skipped: mail credentials are not configured in .env.', [
                'user_id' => $user->id,
                'email' => $user->userDetail?->email,
            ]);

            return false;
        }

        try {
            $user->loadMissing(['userDetail']);

            $email = $user->userDetail?->email;
            if (! $email) {
                return false;
            }

            Mail::to($email)->send(new PasswordResetOtpMail($user, $otp, $expiresInMinutes));

            return true;
        } catch (\Throwable $e) {
            $mailer = config('mail.default');

            Log::error('Failed to send password reset OTP email.', [
                'user_id' => $user->id,
                'email' => $user->userDetail?->email,
                'exception' => get_class($e),
                'error' => $e->getMessage(),
                'previous' => $e->getPrevious()?->getMessage(),
                'mailer' => $mailer,
                'host' => config("mail.mailers.{$mailer}.host"),
                'port' => config("mail.mailers.{$mailer}.port"),
                'encryption' => config("mail.mailers.{$mailer}.encryption"),
            ]);

            return false;
        }
    }

    private function mailerIsLog(): bool
    {
        return config('mail.default') === 'log';
    }

    private function mailIsConfigured(): bool
    {
        if ($this->mailerIsLog()) {
            return true;
        }

        $mailer = config('mail.default');
        $username = config("mail.mailers.{$mailer}.username");
        $password = config("mail.mailers.{$mailer}.password");

        return filled($username) && filled($password);
    }
}
