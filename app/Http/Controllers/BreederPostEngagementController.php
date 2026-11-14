<?php

namespace App\Http\Controllers;

use App\Models\BreederFollow;
use App\Models\BreederPost;
use App\Models\BreederPostLike;
use App\Models\User;
use App\Services\BreederFeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BreederPostEngagementController extends Controller
{
    public function __construct(private BreederFeedService $feed) {}

    public function like(Request $request, BreederPost $post): JsonResponse
    {
        return $this->setLike($request, $post, true);
    }

    public function unlike(Request $request, BreederPost $post): JsonResponse
    {
        return $this->setLike($request, $post, false);
    }

    public function follow(Request $request, User $breeder): JsonResponse
    {
        return $this->setFollow($request, $breeder, true);
    }

    public function unfollow(Request $request, User $breeder): JsonResponse
    {
        return $this->setFollow($request, $breeder, false);
    }

    private function setLike(Request $request, BreederPost $post, bool $liked): JsonResponse
    {
        $data = DB::transaction(function () use ($request, $post, $liked) {
            $locked = BreederPost::query()->lockForUpdate()->findOrFail($post->id);
            $this->feed->ensurePublished($locked);
            $attributes = ['breeder_post_id' => $locked->id, 'user_id' => $request->user()->id];
            if ($liked) {
                BreederPostLike::firstOrCreate($attributes);
            } else {
                BreederPostLike::where($attributes)->delete();
            }

            return [
                'post_id' => $locked->id,
                'is_liked' => $liked,
                'likes_count' => $locked->likes()->count(),
                'comments_count' => $locked->comments()->count(),
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    private function setFollow(Request $request, User $breeder, bool $following): JsonResponse
    {
        $data = DB::transaction(function () use ($request, $breeder, $following) {
            $target = User::query()->lockForUpdate()->findOrFail($breeder->id);
            abort_unless($target->isActive() && $target->user_type === User::TYPE_BREEDER, 404, 'Breeder not found.');
            if ((int) $target->id === (int) $request->user()->id) {
                throw ValidationException::withMessages(['breeder' => 'You cannot follow your own account.']);
            }
            $attributes = ['breeder_id' => $target->id, 'follower_id' => $request->user()->id];
            if ($following) {
                BreederFollow::firstOrCreate($attributes);
            } else {
                BreederFollow::where($attributes)->delete();
            }

            return ['breeder_id' => $target->id, 'is_following' => $following];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }
}
