<?php

namespace App\Services;

use App\Models\BreederPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\Cursor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class BreederFeedService
{
    public function query(User $viewer): Builder
    {
        return BreederPost::query()
            ->with([
                'images',
                'author' => fn ($author) => $author->with('userDetail')
                    ->withExists(['breederFollowers as is_following' => fn ($follows) => $follows->where('follower_id', $viewer->id)]),
            ])
            ->withCount(['likes', 'comments'])
            ->withExists(['likes as is_liked' => fn ($likes) => $likes->where('user_id', $viewer->id)]);
    }

    public function card(BreederPost $post, User $viewer): BreederPost
    {
        return $this->query($viewer)->findOrFail($post->id);
    }

    public function ensurePublished(BreederPost $post): void
    {
        abort_unless($post->isPubliclyVisible(), 404, 'Post not found.');
    }

    public function cursor(?string $encoded, string $timestamp): ?Cursor
    {
        if ($encoded === null) {
            return null;
        }

        try {
            $parameters = json_decode(base64_decode(strtr($encoded, '-_', '+/'), true) ?: '', true);
            if (is_array($parameters) && ! Validator::make($parameters, [
                'id' => 'required|integer|min:1',
                $timestamp => 'required|date',
                '_pointsToNextItems' => 'required|boolean',
            ])->fails()) {
                return new Cursor([
                    $timestamp => $parameters[$timestamp],
                    'id' => $parameters['id'],
                ], (bool) $parameters['_pointsToNextItems']);
            }
        } catch (Throwable) {
            // Malformed cursor tokens are validation errors, not server errors.
        }

        throw ValidationException::withMessages(['cursor' => 'The cursor is invalid.']);
    }

    public function save(User $viewer, array $data, ?BreederPost $post = null): BreederPost
    {
        $storedPaths = [];
        $removedPaths = [];

        try {
            $saved = DB::transaction(function () use ($viewer, $data, $post, &$storedPaths, &$removedPaths) {
                $saved = $post ? BreederPost::query()->lockForUpdate()->findOrFail($post->id) : new BreederPost;
                Gate::forUser($viewer)->authorize($post ? 'update' : 'create', $post ? $saved : BreederPost::class);

                if (! $saved->exists) {
                    $saved->breeder_id = $viewer->id;
                    $saved->status = BreederPost::STATUS_PUBLISHED;
                }
                $saved->fill(array_intersect_key($data, array_flip(['title', 'body', 'status'])));
                if ($saved->status === BreederPost::STATUS_PUBLISHED && $saved->published_at === null) {
                    $saved->published_at = now();
                }
                $saved->save();

                if (! array_key_exists('keep_image_ids', $data) && ! array_key_exists('images', $data)) {
                    return $saved;
                }

                $current = $saved->images()->get()->keyBy('id');
                $keepIds = array_values(array_map('intval', $data['keep_image_ids'] ?? $current->keys()->all()));
                foreach ($keepIds as $id) {
                    if (! $current->has($id)) {
                        throw ValidationException::withMessages(['keep_image_ids' => 'Every retained image must belong to this post.']);
                    }
                }
                $files = $data['images'] ?? [];
                if (count($keepIds) + count($files) > BreederPost::MAX_IMAGES) {
                    throw ValidationException::withMessages(['images' => 'A post can have at most 10 images.']);
                }

                $removedPaths = $current->except($keepIds)->pluck('path')->all();
                $saved->images()->whereNotIn('id', $keepIds)->delete();

                // Move retained rows away from 0..9 before reordering unique positions.
                $saved->images()->increment('position', BreederPost::MAX_IMAGES);
                foreach ($keepIds as $position => $id) {
                    $saved->images()->whereKey($id)->update(['position' => $position]);
                }
                $position = count($keepIds);
                foreach ($files as $file) {
                    $path = $file->store('breeder-posts/'.$saved->id, 'public');
                    if (! is_string($path) || $path === '') {
                        throw new RuntimeException('The image could not be stored.');
                    }
                    $storedPaths[] = $path;
                    $saved->images()->create(['path' => $path, 'position' => $position++]);
                }

                return $saved;
            });
        } catch (Throwable $exception) {
            $this->deleteFiles($storedPaths);
            throw $exception;
        }

        // The committed rows no longer reference these files. Never roll back new
        // uploads after commit if filesystem cleanup happens to fail.
        $this->deleteFiles($removedPaths);

        return $saved;
    }

    private function deleteFiles(array $paths): void
    {
        if ($paths === []) {
            return;
        }

        try {
            if (! Storage::disk('public')->delete($paths)) {
                report(new RuntimeException('Breeder feed image cleanup failed.'));
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
