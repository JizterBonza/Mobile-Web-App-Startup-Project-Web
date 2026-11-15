<?php

namespace App\Http\Controllers;

use App\Http\Resources\BreederPostCommentResource;
use App\Models\BreederPost;
use App\Models\BreederPostComment;
use App\Services\BreederFeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class BreederPostCommentController extends Controller
{
    public function __construct(private BreederFeedService $feed) {}

    public function index(Request $request, BreederPost $post): JsonResponse
    {
        $this->feed->ensurePublished($post);
        $data = $request->validate([
            'cursor' => 'sometimes|string|max:2048',
            'per_page' => 'sometimes|integer|min:1|max:50',
        ]);
        $page = $post->comments()->with('author.userDetail')->orderBy('created_at')->orderBy('id')
            ->cursorPaginate($data['per_page'] ?? 20, ['*'], 'cursor', $this->feed->cursor($data['cursor'] ?? null, 'created_at'));

        return response()->json([
            'success' => true,
            'data' => BreederPostCommentResource::collection($page->items())->resolve($request),
            'meta' => ['next_cursor' => $page->nextCursor()?->encode(), 'has_more' => $page->hasMorePages()],
        ]);
    }

    public function store(Request $request, BreederPost $post): JsonResponse
    {
        $this->feed->ensurePublished($post);
        $body = $this->validatedBody($request);
        $data = DB::transaction(function () use ($request, $post, $body) {
            $locked = BreederPost::query()->lockForUpdate()->findOrFail($post->id);
            $this->feed->ensurePublished($locked);
            $comment = $locked->comments()->create(['user_id' => $request->user()->id, 'body' => $body]);

            return $this->mutationData($request, $locked, $comment);
        });

        return response()->json(['success' => true, 'data' => $data], 201);
    }

    public function update(Request $request, BreederPost $post, BreederPostComment $comment): JsonResponse
    {
        $this->ensureNested($post, $comment);
        Gate::authorize('update', $comment);
        $body = $this->validatedBody($request);
        $data = $this->change($request, $post, $comment, 'update', $body);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function destroy(Request $request, BreederPost $post, BreederPostComment $comment): JsonResponse
    {
        $this->ensureNested($post, $comment);
        Gate::authorize('delete', $comment);
        $data = $this->change($request, $post, $comment, 'delete');

        return response()->json(['success' => true, 'data' => $data]);
    }

    private function change(Request $request, BreederPost $post, BreederPostComment $comment, string $action, ?string $body = null): array
    {
        return DB::transaction(function () use ($request, $post, $comment, $action, $body) {
            $locked = BreederPost::query()->lockForUpdate()->findOrFail($post->id);
            $this->feed->ensurePublished($locked);
            $entry = $locked->comments()->whereKey($comment->id)->lockForUpdate()->firstOrFail();
            Gate::authorize($action, $entry);
            if ($action === 'delete') {
                $entry->delete();
            } else {
                $entry->update(['body' => $body]);
            }

            return $this->mutationData($request, $locked, $entry, $action === 'delete');
        });
    }

    private function mutationData(Request $request, BreederPost $post, BreederPostComment $comment, bool $deleted = false): array
    {
        return [
            'post_id' => $post->id,
            'comment' => $deleted ? null : (new BreederPostCommentResource($comment->load('author.userDetail')))->resolve($request),
            'deleted_comment_id' => $deleted ? $comment->id : null,
            'likes_count' => $post->likes()->count(),
            'comments_count' => $post->comments()->count(),
            'is_liked' => $post->likes()->where('user_id', $request->user()->id)->exists(),
        ];
    }

    private function ensureNested(BreederPost $post, BreederPostComment $comment): void
    {
        abort_unless((int) $comment->breeder_post_id === (int) $post->id, 404);
        $this->feed->ensurePublished($post);
    }

    private function validatedBody(Request $request): string
    {
        if (is_string($request->input('body'))) {
            $request->merge(['body' => trim($request->input('body'))]);
        }

        return $request->validate([
            'body' => 'required|string|max:2000',
            'user_id' => 'prohibited',
            'breeder_post_id' => 'prohibited',
            'created_at' => 'prohibited',
            'updated_at' => 'prohibited',
        ])['body'];
    }
}
