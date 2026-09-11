<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ContactMessageController extends Controller
{
    public function index(Request $request)
    {
        $messages = ContactMessage::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(function (ContactMessage $message) {
                return $this->toPayload($message);
            });

        return Inertia::render('Dashboard/ContactMessages', [
            'contactMessages' => $messages,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    public function publicStore(Request $request)
    {
        $validated = $this->validatedPayload($request);

        ContactMessage::create([
            ...$validated,
            'status' => ContactMessage::STATUS_NEW,
        ]);

        return redirect('/#contact')->with('success', 'Your message has been sent. We will get back to you soon.');
    }

    public function store(Request $request)
    {
        $validated = $this->validatedPayload($request, true);

        $message = ContactMessage::create([
            ...$validated,
            'read_at' => ($validated['status'] ?? ContactMessage::STATUS_NEW) === ContactMessage::STATUS_READ
                ? now()
                : null,
        ]);

        ActivityLog::log(
            'created',
            "Contact message created: {$message->name} ({$message->email})",
            $message,
            null,
            $message->toArray()
        );

        return redirect()->route($this->indexRouteName())->with('flash', [
            'success' => 'Contact message created successfully!',
        ]);
    }

    public function update(Request $request, int $id)
    {
        $message = ContactMessage::findOrFail($id);
        $oldValues = $message->toArray();

        $validated = $this->validatedPayload($request, true);
        $validated['read_at'] = $validated['status'] === ContactMessage::STATUS_READ
            ? ($message->read_at ?? now())
            : null;

        $message->update($validated);

        ActivityLog::log(
            'updated',
            "Contact message updated: {$message->name} ({$message->email})",
            $message,
            $oldValues,
            $message->fresh()->toArray()
        );

        return redirect()->route($this->indexRouteName())->with('flash', [
            'success' => 'Contact message updated successfully!',
        ]);
    }

    public function markAsRead(int $id)
    {
        $message = ContactMessage::findOrFail($id);

        if ($message->status !== ContactMessage::STATUS_READ) {
            $oldValues = $message->toArray();
            $message->update([
                'status' => ContactMessage::STATUS_READ,
                'read_at' => $message->read_at ?? now(),
            ]);

            ActivityLog::log(
                'updated',
                "Contact message marked as read: {$message->name} ({$message->email})",
                $message,
                $oldValues,
                $message->fresh()->toArray()
            );
        }

        return redirect()->route($this->indexRouteName());
    }

    public function destroy(int $id)
    {
        $message = ContactMessage::findOrFail($id);

        ActivityLog::log(
            'deleted',
            "Contact message deleted: {$message->name} ({$message->email})",
            null,
            $message->toArray(),
            null
        );

        $message->delete();

        return redirect()->route($this->indexRouteName())->with('flash', [
            'success' => 'Contact message deleted successfully!',
        ]);
    }

    private function validatedPayload(Request $request, bool $withStatus = false): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'required|string|max:5000',
        ];

        if ($withStatus) {
            $rules['status'] = 'required|string|in:new,read';
        }

        return $request->validate($rules);
    }

    private function indexRouteName(): string
    {
        return auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.contact-messages.index'
            : 'dashboard.super-admin.contact-messages.index';
    }

    private function toPayload(ContactMessage $message): array
    {
        return [
            'id' => $message->id,
            'name' => $message->name,
            'email' => $message->email,
            'message' => $message->message,
            'status' => $message->status,
            'created_at' => $message->created_at?->toISOString(),
            'read_at' => $message->read_at?->toISOString(),
            'updated_at' => $message->updated_at?->toISOString(),
        ];
    }
}
