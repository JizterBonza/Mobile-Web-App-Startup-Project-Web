<?php

namespace App\Services;

use App\Mail\WelcomeUserMail;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UserWelcomeEmailService
{
    public function send(User $user, string $username, string $plainPassword): bool
    {
        if ($this->mailerIsLog()) {
            Log::info('Welcome email written to log only (MAIL_MAILER=log). Configure SMTP in .env to deliver to inbox.', [
                'user_id' => $user->id,
                'email' => $user->userDetail?->email,
            ]);
        }

        if (!$this->mailIsConfigured()) {
            Log::warning('Welcome email skipped: mail credentials are not configured in .env.', [
                'user_id' => $user->id,
                'email' => $user->userDetail?->email,
            ]);

            return false;
        }

        try {
            $user->loadMissing(['userDetail', 'userCredential']);

            $email = $user->userDetail?->email;
            if (!$email) {
                return false;
            }

            Mail::to($email)->send(new WelcomeUserMail($user, $username, $plainPassword));

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to send welcome email to user.', [
                'user_id' => $user->id,
                'email' => $user->userDetail?->email,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public static function successMessage(bool $emailSent, string $baseMessage = 'User created successfully.'): string
    {
        if ($emailSent) {
            return $baseMessage.' A welcome email with login credentials has been sent.';
        }

        if ((new self())->mailerIsLog()) {
            return $baseMessage.' The welcome email was saved to storage/logs/laravel.log only (MAIL_MAILER=log). Configure SMTP in .env to deliver it to the inbox.';
        }

        if (!(new self())->mailIsConfigured()) {
            return $baseMessage.' The welcome email was not sent because MAIL_USERNAME or MAIL_PASSWORD is missing in .env.';
        }

        return $baseMessage.' The welcome email could not be sent. Check storage/logs/laravel.log and your SMTP settings.';
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
