<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Models\SupportTicketMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SupportTicketController extends Controller
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function ticketsForUser(int $userId): array
    {
        return SupportTicket::query()
            ->where('user_id', $userId)
            ->with(['messages.attachments'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SupportTicket $ticket) => self::formatTicket($ticket))
            ->values()
            ->all();
    }

    /**
     * All tickets for admin/super-admin views — includes sender name, store name, and initials.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function ticketsForAdmin(): array
    {
        return SupportTicket::query()
            ->with(['messages.attachments', 'user.userDetail', 'user.shops'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SupportTicket $ticket) => self::formatTicketForAdmin($ticket))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function formatTicket(SupportTicket $ticket): array
    {
        $evidenceCount = $ticket->messages
            ->flatMap(fn (SupportTicketMessage $message) => $message->attachments)
            ->count();

        return [
            'id' => $ticket->ticket_number,
            'title' => $ticket->title,
            'description' => $ticket->description,
            'category' => $ticket->category,
            'status' => $ticket->status,
            'createdAt' => $ticket->created_at?->toIso8601String(),
            'updatedAt' => $ticket->updated_at?->toIso8601String(),
            'evidenceCount' => $evidenceCount,
            'reopenCount' => (int) $ticket->reopen_count,
            'thread' => $ticket->messages->map(function (SupportTicketMessage $message) {
                $attachmentCount = $message->attachments->count();

                return [
                    'id' => (string) $message->id,
                    'sender' => $message->sender_type,
                    'senderName' => $message->sender_type === 'vendor' ? 'You' : $message->sender_name,
                    'body' => $message->body,
                    'timestamp' => $message->created_at?->toIso8601String(),
                    'attachmentCount' => $attachmentCount > 0 ? $attachmentCount : null,
                ];
            })->values()->all(),
        ];
    }

    /**
     * Format a ticket for admin/super-admin views (shows real sender names, store name, and initials).
     *
     * @return array<string, mixed>
     */
    public static function formatTicketForAdmin(SupportTicket $ticket): array
    {
        $evidenceCount = $ticket->messages
            ->flatMap(fn (SupportTicketMessage $message) => $message->attachments)
            ->count();

        $user = $ticket->user;
        $firstName = $user?->userDetail?->first_name ?? '';
        $lastName = $user?->userDetail?->last_name ?? '';
        $senderName = trim("{$firstName} {$lastName}");
        if ($senderName === '') {
            $senderName = $ticket->messages->first()?->sender_name ?? 'Vendor';
        }

        $storeName = $user?->shops?->first()?->shop_name ?? '—';

        $initials = collect(explode(' ', $senderName))
            ->filter()
            ->map(fn ($part) => strtoupper(substr($part, 0, 1)))
            ->take(2)
            ->join('');

        return [
            'id' => $ticket->ticket_number,
            'title' => $ticket->title,
            'description' => $ticket->description,
            'category' => $ticket->category,
            'status' => $ticket->status,
            'createdAt' => $ticket->created_at?->toIso8601String(),
            'updatedAt' => $ticket->updated_at?->toIso8601String(),
            'evidenceCount' => $evidenceCount,
            'reopenCount' => (int) $ticket->reopen_count,
            'senderName' => $senderName,
            'storeName' => $storeName,
            'senderAvatar' => $initials ?: '?',
            'thread' => $ticket->messages->map(function (SupportTicketMessage $message) {
                return [
                    'id' => (string) $message->id,
                    'sender' => $message->sender_type,
                    'senderName' => $message->sender_name,
                    'body' => $message->body,
                    'timestamp' => $message->created_at?->toIso8601String(),
                    'attachmentCount' => $message->attachments->count() ?: null,
                ];
            })->values()->all(),
        ];
    }

    /** Accept an open ticket (admin action — moves to Awaiting Review). */
    public function adminAccept(int $id): \Illuminate\Http\RedirectResponse
    {
        $ticket = SupportTicket::findOrFail($id);

        if ($ticket->status === SupportTicket::STATUS_OPEN) {
            $ticket->update(['status' => SupportTicket::STATUS_AWAITING_REVIEW]);
        }

        return redirect()->back()->with('success', 'Ticket accepted.');
    }

    /** Move ticket to In Progress (admin action). */
    public function adminProgress(int $id): \Illuminate\Http\RedirectResponse
    {
        $ticket = SupportTicket::findOrFail($id);

        if ($ticket->status === SupportTicket::STATUS_AWAITING_REVIEW) {
            $ticket->update(['status' => SupportTicket::STATUS_IN_PROGRESS]);
        }

        return redirect()->back()->with('success', 'Ticket moved to In Progress.');
    }

    /** Add an admin message and optionally change status. */
    public function adminMessage(Request $request, int $id): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'type' => ['required', 'string', Rule::in(['info', 'follow-up', 'resolve'])],
        ]);

        $ticket = SupportTicket::with('messages.attachments')->findOrFail($id);
        $admin = $request->user();
        $admin->loadMissing('userDetail');
        $firstName = $admin->userDetail?->first_name ?? '';
        $lastName = $admin->userDetail?->last_name ?? '';
        $adminName = trim("{$firstName} {$lastName}") ?: 'Support Team';

        $body = $validated['type'] === 'resolve'
            ? '[Resolution] '.$validated['body']
            : $validated['body'];

        SupportTicketMessage::create([
            'support_ticket_id' => $ticket->id,
            'sender_type' => 'admin',
            'sender_user_id' => $admin->id,
            'sender_name' => $adminName,
            'body' => $body,
        ]);

        $newStatus = match ($validated['type']) {
            'resolve' => SupportTicket::STATUS_RESOLVED,
            default => SupportTicket::STATUS_INFO_REQUESTED,
        };

        $ticket->update(['status' => $newStatus]);

        return redirect()->back()->with('success', 'Message sent.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'category' => ['required', 'string', Rule::in(SupportTicket::CATEGORIES)],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => [
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,mp4,pdf,docx',
            ],
        ]);

        $user = $request->user();
        $user->loadMissing('userDetail');
        $senderName = trim(($user->userDetail->first_name ?? '').' '.($user->userDetail->last_name ?? ''));
        if ($senderName === '') {
            $senderName = $user->userDetail->email ?? 'Seller';
        }

        $ticketPayload = DB::transaction(function () use ($validated, $request, $user, $senderName) {
            $ticket = SupportTicket::create([
                'user_id' => $user->id,
                'title' => $validated['title'],
                'description' => $validated['description'],
                'category' => $validated['category'],
                'status' => SupportTicket::STATUS_OPEN,
            ]);

            $message = SupportTicketMessage::create([
                'support_ticket_id' => $ticket->id,
                'sender_type' => 'vendor',
                'sender_user_id' => $user->id,
                'sender_name' => $senderName,
                'body' => $validated['description'],
            ]);

            /** @var array<int, \Illuminate\Http\UploadedFile> $files */
            $files = $request->file('attachments', []);

            foreach ($files as $file) {
                if (! $file) {
                    continue;
                }

                $path = $file->store("support-tickets/{$ticket->id}", 'public');

                SupportTicketAttachment::create([
                    'support_ticket_message_id' => $message->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                ]);
            }

            return $ticket->fresh(['messages.attachments']);
        });

        if ($request->wantsJson()) {
            return response()->json([
                'ticket' => self::formatTicket($ticketPayload),
                'tickets' => self::ticketsForUser($user->id),
            ]);
        }

        return redirect()->back()->with('success', 'Support ticket submitted successfully.');
    }
}
