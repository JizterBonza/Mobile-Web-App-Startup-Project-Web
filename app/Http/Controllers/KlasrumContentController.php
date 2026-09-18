<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\KlasrumCategory;
use App\Models\KlasrumContent;
use App\Support\PublicStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class KlasrumContentController extends Controller
{
    public function index(): Response
    {
        $contents = KlasrumContent::query()
            ->with('category')
            ->orderByRaw("CASE WHEN status = ? THEN 0 ELSE 1 END", [KlasrumContent::STATUS_PUBLISHED])
            ->orderByDesc('published_at')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (KlasrumContent $content) => $content->toListArray());

        return Inertia::render('Klasrum', [
            'contents' => $contents,
            'categories' => KlasrumCategory::options(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Klasrum/ContentBuilder', [
            'content' => null,
            'categories' => KlasrumCategory::options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatedPayload($request);
        $paths = $this->storeUploads($request);

        $status = $validated['status'];
        $content = KlasrumContent::create([
            ...$this->contentFields($validated),
            ...$paths,
            'status' => $status,
            'published_at' => $status === KlasrumContent::STATUS_PUBLISHED ? now() : null,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        ActivityLog::log(
            'created',
            'Klasrum content created: ' . ($content->title ?: 'Untitled'),
            $content,
            null,
            $content->toArray()
        );

        return redirect()->route('klasrum.index')->with(
            'success',
            $status === KlasrumContent::STATUS_PUBLISHED
                ? 'Content published successfully.'
                : 'Draft saved successfully.'
        );
    }

    public function edit(KlasrumContent $content): Response
    {
        $content->load('category');

        return Inertia::render('Klasrum/ContentBuilder', [
            'content' => $content->toBuilderArray(),
            'categories' => KlasrumCategory::options($content->category_id),
        ]);
    }

    public function update(Request $request, KlasrumContent $content): RedirectResponse
    {
        $validated = $this->validatedPayload($request, $content);
        $oldValues = $content->toArray();
        $paths = $this->storeUploads($request, $content);

        $status = $validated['status'];
        $publishedAt = $content->published_at;
        if ($status === KlasrumContent::STATUS_PUBLISHED && ! $content->isPublished()) {
            $publishedAt = now();
        }
        if ($status === KlasrumContent::STATUS_DRAFT) {
            $publishedAt = $content->isPublished() ? $content->published_at : null;
        }

        $content->update([
            ...$this->contentFields($validated),
            ...$paths,
            'status' => $status,
            'published_at' => $publishedAt,
            'updated_by' => Auth::id(),
        ]);

        ActivityLog::log(
            'updated',
            'Klasrum content updated: ' . ($content->title ?: 'Untitled'),
            $content,
            $oldValues,
            $content->fresh()->toArray()
        );

        return redirect()->route('klasrum.index')->with(
            'success',
            $status === KlasrumContent::STATUS_PUBLISHED
                ? 'Content published successfully.'
                : 'Draft saved successfully.'
        );
    }

    public function destroy(KlasrumContent $content): RedirectResponse
    {
        $oldValues = $content->toArray();
        $this->deleteStoredFile($content->cover_path);
        $this->deleteMediaItems($content);
        $content->delete();

        ActivityLog::log(
            'deleted',
            'Klasrum content deleted: ' . ($oldValues['title'] ?: 'Untitled'),
            null,
            $oldValues,
            null
        );

        return redirect()->route('klasrum.index')->with('success', 'Content deleted successfully.');
    }

    public function togglePublish(KlasrumContent $content): RedirectResponse
    {
        $oldValues = $content->toArray();
        $publishing = ! $content->isPublished();

        $content->update([
            'status' => $publishing ? KlasrumContent::STATUS_PUBLISHED : KlasrumContent::STATUS_DRAFT,
            'published_at' => $publishing ? now() : $content->published_at,
            'updated_by' => Auth::id(),
        ]);

        ActivityLog::log(
            $publishing ? 'published' : 'unpublished',
            'Klasrum content ' . ($publishing ? 'published' : 'unpublished') . ': ' . ($content->title ?: 'Untitled'),
            $content,
            $oldValues,
            $content->fresh()->toArray()
        );

        return redirect()->route('klasrum.index')->with(
            'success',
            $publishing ? 'Content published successfully.' : 'Content unpublished successfully.'
        );
    }

    public function uploadMedia(Request $request): JsonResponse
    {
        $request->validate([
            'media' => ['required', 'file', 'mimes:jpeg,jpg,png,mp4,webm,mov', 'max:20480'],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('media');
        $path = $file->store('klasrum/media', 'public');
        $type = str_starts_with((string) $file->getMimeType(), 'video/') ? 'video' : 'image';

        return response()->json([
            'success' => true,
            'data' => [
                'path' => $path,
                'url' => PublicStorage::url($path),
                'type' => $type,
                'is_video' => $type === 'video',
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedPayload(Request $request, ?KlasrumContent $existing = null): array
    {
        $request->merge([
            'category_id' => $request->input('category_id') ?: null,
        ]);
        $this->mergeMediaInputs($request);

        $status = $request->input('status', KlasrumContent::STATUS_DRAFT);
        $titleRules = $status === KlasrumContent::STATUS_PUBLISHED
            ? ['required', 'string', 'max:255']
            : ['nullable', 'string', 'max:255'];

        $validated = $request->validate([
            'title' => $titleRules,
            'description' => ['nullable', 'string'],
            'heading' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'category_id' => [
                'nullable',
                'integer',
                Rule::exists('klasrum_categories', 'id')->where(function ($query) use ($existing) {
                    $query->where(function ($inner) use ($existing) {
                        $inner->where('active', 1)->whereNull('deleted_at');
                        if ($existing?->category_id) {
                            $inner->orWhere('id', $existing->category_id);
                        }
                    });
                }),
            ],
            'caption' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in([KlasrumContent::STATUS_DRAFT, KlasrumContent::STATUS_PUBLISHED])],
            'cover' => ['nullable', 'image', 'mimes:jpeg,jpg,png', 'max:5120'],
            'media' => ['nullable', 'array', 'max:'.KlasrumContent::MAX_MEDIA_ITEMS],
            'media.*' => ['file', 'mimes:jpeg,jpg,png,mp4,webm,mov', 'max:20480'],
            'keep_media' => ['nullable', 'array', 'max:'.KlasrumContent::MAX_MEDIA_ITEMS],
            'keep_media.*' => ['nullable', 'string', 'max:500'],
            'remove_cover' => ['nullable', 'boolean'],
            'remove_media' => ['nullable', 'boolean'],
        ]);

        $keepCount = count(array_filter(
            $request->input('keep_media', []) ?? [],
            fn ($path) => is_string($path) && $path !== ''
        ));
        $fileCount = count($request->file('media') ?: []);
        if ($keepCount + $fileCount > KlasrumContent::MAX_MEDIA_ITEMS) {
            throw ValidationException::withMessages([
                'media' => 'You can upload up to '.KlasrumContent::MAX_MEDIA_ITEMS.' files.',
            ]);
        }

        return $validated;
    }

    private function mergeMediaInputs(Request $request): void
    {
        $keepMedia = $request->input('keep_media');
        if (is_string($keepMedia)) {
            $decoded = json_decode($keepMedia, true);
            $request->merge([
                'keep_media' => is_array($decoded) ? array_values($decoded) : [],
            ]);
        }

        $files = $request->file('media');
        if ($files instanceof UploadedFile) {
            $request->files->set('media', [$files]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function contentFields(array $validated): array
    {
        $allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'div', 'span'];

        return [
            'title' => isset($validated['title']) ? trim((string) $validated['title']) : null,
            'description' => $validated['description'] ?? null,
            'heading' => $validated['heading'] ?? null,
            'body' => isset($validated['body']) ? strip_tags($validated['body'], $allowedTags) : null,
            'category_id' => $validated['category_id'] ?? null,
            'caption' => $validated['caption'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function storeUploads(Request $request, ?KlasrumContent $existing = null): array
    {
        $paths = [];

        if ($request->boolean('remove_cover') && $existing?->cover_path) {
            $this->deleteStoredFile($existing->cover_path);
            $paths['cover_path'] = null;
        }

        if ($request->hasFile('cover')) {
            if ($existing?->cover_path) {
                $this->deleteStoredFile($existing->cover_path);
            }
            $paths['cover_path'] = $request->file('cover')->store('klasrum/covers', 'public');
        }

        $syncingMedia = $request->exists('keep_media')
            || $request->hasFile('media')
            || $request->boolean('remove_media');

        if ($syncingMedia) {
            $paths = [
                ...$paths,
                ...$this->syncMediaItems($request, $existing),
            ];
        }

        return $paths;
    }

    /**
     * @return array{media_items: list<array{path: string, type: string}>, media_path: ?string, media_type: ?string}
     */
    private function syncMediaItems(Request $request, ?KlasrumContent $existing): array
    {
        $existingItems = $existing?->normalizedMediaItems() ?? [];
        $existingByPath = [];
        foreach ($existingItems as $item) {
            $existingByPath[$item['path']] = $item;
        }

        $requested = array_values(array_filter(
            $request->boolean('remove_media') ? [] : ($request->input('keep_media', []) ?? []),
            fn ($path) => is_string($path) && $this->isKlasrumMediaPath($path)
        ));
        $requested = array_slice($requested, 0, KlasrumContent::MAX_MEDIA_ITEMS);

        $kept = [];
        $keptPathSet = [];
        foreach ($requested as $path) {
            if (isset($keptPathSet[$path])) {
                continue;
            }
            if (isset($existingByPath[$path])) {
                $kept[] = $existingByPath[$path];
                $keptPathSet[$path] = true;
                continue;
            }
            if (! Storage::disk('public')->exists($path)) {
                continue;
            }
            $kept[] = [
                'path' => $path,
                'type' => $this->mediaTypeFromPath($path),
            ];
            $keptPathSet[$path] = true;
        }

        foreach ($existingItems as $item) {
            if (! isset($keptPathSet[$item['path']])) {
                $this->deleteStoredFile($item['path']);
            }
        }

        $uploaded = $request->file('media', []);
        if ($uploaded instanceof UploadedFile) {
            $uploaded = [$uploaded];
        }
        $uploaded = array_values(array_filter(
            is_array($uploaded) ? $uploaded : [],
            fn ($file) => $file instanceof UploadedFile
        ));

        $remaining = KlasrumContent::MAX_MEDIA_ITEMS - count($kept);
        $uploaded = array_slice($uploaded, 0, max(0, $remaining));

        foreach ($uploaded as $file) {
            $kept[] = [
                'path' => $file->store('klasrum/media', 'public'),
                'type' => str_starts_with((string) $file->getMimeType(), 'video/') ? 'video' : 'image',
            ];
        }

        $first = $kept[0] ?? null;

        return [
            'media_items' => $kept,
            'media_path' => $first['path'] ?? null,
            'media_type' => $first['type'] ?? null,
        ];
    }

    private function isKlasrumMediaPath(string $path): bool
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');

        return str_starts_with($path, 'klasrum/media/')
            && ! str_contains($path, '..')
            && strlen($path) <= 500;
    }

    private function mediaTypeFromPath(string $path): string
    {
        $extension = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, ['mp4', 'webm', 'mov'], true) ? 'video' : 'image';
    }

    private function deleteMediaItems(KlasrumContent $content): void
    {
        $deleted = [];
        foreach ($content->normalizedMediaItems() as $item) {
            $path = $item['path'];
            if (isset($deleted[$path])) {
                continue;
            }
            $this->deleteStoredFile($path);
            $deleted[$path] = true;
        }

        if ($content->media_path && ! isset($deleted[$content->media_path])) {
            $this->deleteStoredFile($content->media_path);
        }
    }

    private function deleteStoredFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
