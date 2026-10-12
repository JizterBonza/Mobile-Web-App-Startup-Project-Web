<?php

namespace App\Http\Controllers;

use App\Models\KlasrumComment;
use App\Models\KlasrumContent;
use App\Models\KlasrumFollow;
use App\Models\KlasrumReaction;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class KlasrumPostEngagementController extends Controller
{
    public function toggleFollow(User $user): RedirectResponse
    {
        $viewerId = (int) Auth::id();
        if ((int) $user->id === $viewerId) {
            throw ValidationException::withMessages([
                'follow' => 'You cannot follow your own account.',
            ]);
        }

        $deleted = KlasrumFollow::query()
            ->where('follower_id', $viewerId)
            ->where('following_id', $user->id)
            ->delete();

        if ($deleted === 0) {
            try {
                KlasrumFollow::create([
                    'follower_id' => $viewerId,
                    'following_id' => $user->id,
                ]);
            } catch (UniqueConstraintViolationException) {
                // A parallel request already followed this account.
            }
        }

        return back();
    }

    public function toggleReaction(KlasrumContent $post): RedirectResponse
    {
        $this->ensurePublishedPost($post);

        $viewerId = (int) Auth::id();
        $deleted = KlasrumReaction::query()
            ->where('klasrum_content_id', $post->id)
            ->where('user_id', $viewerId)
            ->delete();

        if ($deleted === 0) {
            try {
                KlasrumReaction::create([
                    'klasrum_content_id' => $post->id,
                    'user_id' => $viewerId,
                    'type' => KlasrumReaction::TYPE_LIKE,
                ]);
            } catch (UniqueConstraintViolationException) {
                // A parallel request already reacted to this post.
            }
        }

        return back();
    }

    public function storeComment(Request $request, KlasrumContent $post): RedirectResponse
    {
        $this->ensurePublishedPost($post);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $body = trim($validated['body']);
        if ($body === '') {
            throw ValidationException::withMessages([
                'body' => 'Write a comment before posting.',
            ]);
        }

        KlasrumComment::create([
            'klasrum_content_id' => $post->id,
            'user_id' => Auth::id(),
            'body' => $body,
        ]);

        return back();
    }

    public function destroyComment(KlasrumContent $post, KlasrumComment $comment): RedirectResponse
    {
        abort_unless($post->kind === KlasrumContent::KIND_POST, 404);
        abort_unless((int) $comment->klasrum_content_id === (int) $post->id, 404);

        $viewer = Auth::user();
        $ownsComment = (int) $comment->user_id === (int) $viewer?->id;
        $canModerate = in_array($viewer?->user_type, ['super_admin', 'admin'], true);
        abort_unless($ownsComment || $canModerate, 403);

        $comment->delete();

        return back();
    }

    private function ensurePublishedPost(KlasrumContent $post): void
    {
        abort_unless($post->kind === KlasrumContent::KIND_POST, 404);

        if (! $post->isPublished()) {
            throw ValidationException::withMessages([
                'body' => 'Publish this post before reacting or commenting.',
            ]);
        }
    }
}
