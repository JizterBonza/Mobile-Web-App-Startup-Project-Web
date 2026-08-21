<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\KlasrumCategory;
use App\Models\KlasrumContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
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
            'categories' => KlasrumCategory::options(),
        ]);
    }

    public function update(Request $request, KlasrumContent $content): RedirectResponse
    {
        $validated = $this->validatedPayload($request);
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
        $this->deleteStoredFile($content->media_path);
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

    /**
     * @return array<string, mixed>
     */
    private function validatedPayload(Request $request): array
    {
        $request->merge([
            'category_id' => $request->input('category_id') ?: null,
        ]);

        $status = $request->input('status', KlasrumContent::STATUS_DRAFT);
        $titleRules = $status === KlasrumContent::STATUS_PUBLISHED
            ? ['required', 'string', 'max:255']
            : ['nullable', 'string', 'max:255'];

        return $request->validate([
            'title' => $titleRules,
            'description' => ['nullable', 'string'],
            'heading' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'category_id' => ['nullable', 'integer', 'exists:klasrum_categories,id'],
            'caption' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in([KlasrumContent::STATUS_DRAFT, KlasrumContent::STATUS_PUBLISHED])],
            'cover' => ['nullable', 'image', 'mimes:jpeg,jpg,png', 'max:5120'],
            'media' => ['nullable', 'file', 'mimes:jpeg,jpg,png,mp4,webm,mov', 'max:20480'],
            'remove_cover' => ['nullable', 'boolean'],
            'remove_media' => ['nullable', 'boolean'],
        ]);
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

        if ($request->boolean('remove_media') && $existing?->media_path) {
            $this->deleteStoredFile($existing->media_path);
            $paths['media_path'] = null;
            $paths['media_type'] = null;
        }

        if ($request->hasFile('media')) {
            if ($existing?->media_path) {
                $this->deleteStoredFile($existing->media_path);
            }
            /** @var UploadedFile $file */
            $file = $request->file('media');
            $paths['media_path'] = $file->store('klasrum/media', 'public');
            $paths['media_type'] = str_starts_with((string) $file->getMimeType(), 'video/') ? 'video' : 'image';
        }

        return $paths;
    }

    private function deleteStoredFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
