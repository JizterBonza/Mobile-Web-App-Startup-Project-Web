<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $userTypeLabel;

    public string $loginUrl;

    public function __construct(
        public User $user,
        public string $username,
        public string $plainPassword,
    ) {
        $this->userTypeLabel = match ($user->user_type) {
            User::TYPE_SUPER_ADMIN => 'Super Admin',
            User::TYPE_ADMIN => 'Admin',
            User::TYPE_VENDOR => 'Vendor',
            User::TYPE_VETERINARIAN => 'Veterinarian',
            User::TYPE_CUSTOMER => 'Customer',
            User::TYPE_RIDER => 'Rider',
            User::TYPE_OWNER_MANAGER => 'Owner/Manager',
            default => ucfirst(str_replace('_', ' ', $user->user_type)),
        };

        $this->loginUrl = url('/login');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to '.config('app.name').' — Your Account Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-user',
        );
    }
}
