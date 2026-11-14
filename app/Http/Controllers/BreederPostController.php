<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveBreederPostRequest;
use App\Http\Resources\BreederPostResource;
use App\Models\BreederPost;
use App\Services\BreederFeedService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class BreederPostController extends Controller
{
    public function __construct(private BreederFeedService $feed) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'feed' => 'sometimes|in:all,following',
            'breeder_id' => 'sometimes|integer|min:1',
            'cursor' => 'sometimes|string|max:2048',
            'per_page' => 'sometimes|integer|min:1|max:50',
        ]);
        $query = $this->feed->query($request->user())->visible();
        if (isset($data['breeder_id'])) {
            $query->where('breeder_id', $data['breeder_id']);
        }
        if (($data['feed'] ?? 'all') === 'following') {
            $query->whereHas('author.breederFollowers', fn ($follows) => $follows->where('follower_id', $request->user()->id));
        }

        return $this->page($request, $query, $data, 'published_at');
    }

    public function mine(Request $request): JsonResponse
    {
        Gate::authorize('create', BreederPost::class);
        $data = $request->validate([
            'status' => 'sometimes|in:draft,published',
            'cursor' => 'sometimes|string|max:2048',
            'per_page' => 'sometimes|integer|min:1|max:50',
        ]);
        $query = $this->feed->query($request->user())->where('breeder_id', $request->user()->id);
        if (isset($data['status'])) {
            $query->where('status', $data['status']);
        }

        // Drafts have no publication timestamp; creation time keeps this cursor non-null.
        return $this->page($request, $query, $data, 'created_at');
    }

    public function show(Request $request, BreederPost $post): JsonResponse
    {
        Gate::authorize('view', $post);

        return $this->postResponse($request, $post);
    }

    public function store(SaveBreederPostRequest $request): JsonResponse
    {
        return $this->postResponse($request, $this->feed->save($request->user(), $request->validated()), 201);
    }

    public function update(SaveBreederPostRequest $request, BreederPost $post): JsonResponse
    {
        return $this->postResponse($request, $this->feed->save($request->user(), $request->validated(), $post));
    }

    public function destroy(BreederPost $post): JsonResponse
    {
        DB::transaction(function () use ($post) {
            $locked = BreederPost::query()->lockForUpdate()->findOrFail($post->id);
            Gate::authorize('delete', $locked);
            $locked->delete();
        });

        return response()->json(['success' => true, 'data' => ['id' => $post->id, 'deleted' => true]]);
    }

    private function postResponse(Request $request, BreederPost $post, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => (new BreederPostResource($this->feed->card($post, $request->user())))->resolve($request),
        ], $status);
    }

    private function page(Request $request, Builder $query, array $data, string $timestamp): JsonResponse
    {
        $page = $query->orderByDesc($timestamp)->orderByDesc('id')
            ->cursorPaginate($data['per_page'] ?? 20, ['*'], 'cursor', $this->feed->cursor($data['cursor'] ?? null, $timestamp));

        return response()->json([
            'success' => true,
            'data' => BreederPostResource::collection($page->items())->resolve($request),
            'meta' => ['next_cursor' => $page->nextCursor()?->encode(), 'has_more' => $page->hasMorePages()],
        ]);
    }
}
