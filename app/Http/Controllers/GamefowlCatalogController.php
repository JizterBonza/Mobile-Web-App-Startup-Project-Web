<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\GamefowlCatalog;
use App\Models\GamefowlLookup;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class GamefowlCatalogController extends Controller
{
    public function index()
    {
        $gamefowls = GamefowlCatalog::listed()
            ->with(['bloodline', 'ageType', 'gamefowlClass', 'creator.userDetail'])
            ->latest()
            ->get()
            ->map(fn (GamefowlCatalog $gamefowl) => $this->listPayload($gamefowl));

        return Inertia::render('Dashboard/Gamefowls', [
            'gamefowls' => $gamefowls,
            'pendingCount' => GamefowlCatalog::pending()->count(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Dashboard/RegisterGamefowl', $this->formOptions());
    }

    public function store(Request $request)
    {
        $validated = $this->validateEntry($request, true);
        $images = $this->resolveImages($request);

        if (count($images) < 5) {
            return back()->withInput()->withErrors(['images' => 'Please upload all 5 gamefowl images.']);
        }

        $gamefowl = GamefowlCatalog::create([
            'name' => $validated['name'],
            'bloodline_id' => $validated['bloodline_id'],
            'age_type_id' => $validated['age_type_id'],
            'class_id' => $validated['class_id'],
            'sex' => $validated['sex'],
            'hatch_date' => $validated['hatch_date'] ?? null,
            'description' => $validated['description'] ?? null,
            'images' => array_values($images),
            'primary_image_index' => (int) $validated['primary_image_index'],
            'status' => GamefowlCatalog::STATUS_ACTIVE,
            'created_by' => auth()->id(),
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        ActivityLog::log('created', "Gamefowl catalog entry created: {$gamefowl->name}", $gamefowl, null, $gamefowl->toArray());

        return redirect($this->basePath())->with('success', 'Gamefowl registered in the catalog.');
    }

    public function show($id)
    {
        $gamefowl = GamefowlCatalog::with(['bloodline', 'ageType', 'gamefowlClass', 'creator.userDetail'])->findOrFail($id);

        return Inertia::render('Dashboard/GamefowlShow', [
            'gamefowl' => $this->detailPayload($gamefowl),
        ]);
    }

    public function edit($id)
    {
        $gamefowl = GamefowlCatalog::listed()->findOrFail($id);

        return Inertia::render('Dashboard/RegisterGamefowl', [
            ...$this->formOptions($gamefowl),
            'gamefowl' => $this->detailPayload($gamefowl),
        ]);
    }

    public function update(Request $request, $id)
    {
        $gamefowl = GamefowlCatalog::listed()->findOrFail($id);
        $oldValues = $gamefowl->toArray();
        $validated = $this->validateEntry($request, false);
        $images = $this->resolveImages($request, $gamefowl->images ?? []);

        if (count($images) < 5) {
            return back()->withInput()->withErrors(['images' => 'Please keep or replace all 5 gamefowl images.']);
        }

        $gamefowl->update([
            'name' => $validated['name'],
            'bloodline_id' => $validated['bloodline_id'],
            'age_type_id' => $validated['age_type_id'],
            'class_id' => $validated['class_id'],
            'sex' => $validated['sex'],
            'hatch_date' => $validated['hatch_date'] ?? null,
            'description' => $validated['description'] ?? null,
            'images' => array_values($images),
            'primary_image_index' => (int) $validated['primary_image_index'],
        ]);

        ActivityLog::log('updated', "Gamefowl catalog entry updated: {$gamefowl->name}", $gamefowl, $oldValues, $gamefowl->fresh()->toArray());

        return redirect($this->basePath())->with('success', 'Gamefowl updated.');
    }

    public function updateStatus(Request $request, $id)
    {
        $gamefowl = GamefowlCatalog::listed()->findOrFail($id);
        $oldValues = $gamefowl->toArray();

        $request->validate([
            'status' => 'required|string|in:active,inactive',
        ]);

        $gamefowl->update(['status' => $request->status]);

        $action = $request->status === GamefowlCatalog::STATUS_INACTIVE ? 'disabled' : 'enabled';
        ActivityLog::log('updated', "Gamefowl catalog entry {$action}: {$gamefowl->name}", $gamefowl, $oldValues, $gamefowl->fresh()->toArray());

        $message = $request->status === GamefowlCatalog::STATUS_INACTIVE
            ? 'Gamefowl disabled. It stays in the catalog but is marked inactive.'
            : 'Gamefowl enabled.';

        return redirect()->back()->with('success', $message);
    }

    public function requests()
    {
        $requests = GamefowlCatalog::pending()
            ->with(['bloodline', 'ageType', 'gamefowlClass', 'creator.userDetail'])
            ->latest()
            ->get()
            ->map(fn (GamefowlCatalog $gamefowl) => $this->detailPayload($gamefowl));

        return Inertia::render('Dashboard/GamefowlRequests', [
            'requests' => $requests,
        ]);
    }

    public function approve($id)
    {
        $gamefowl = GamefowlCatalog::pending()->findOrFail($id);
        $gamefowl->update([
            'status' => GamefowlCatalog::STATUS_ACTIVE,
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        ActivityLog::log('updated', "Gamefowl request approved: {$gamefowl->name}", $gamefowl);

        return redirect()->back()->with('success', 'Gamefowl request approved.');
    }

    public function reject($id)
    {
        $gamefowl = GamefowlCatalog::pending()->findOrFail($id);
        $gamefowl->update([
            'status' => GamefowlCatalog::STATUS_REJECTED,
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        ActivityLog::log('updated', "Gamefowl request rejected: {$gamefowl->name}", $gamefowl);

        return redirect()->back()->with('success', 'Gamefowl request rejected.');
    }

    private function validateEntry(Request $request, bool $creating): array
    {
        $request->merge([
            'hatch_date' => $request->filled('hatch_date') ? $request->hatch_date : null,
            'description' => $request->filled('description') ? $request->description : null,
        ]);

        return $request->validate([
            'name' => 'required|string|max:150',
            'bloodline_id' => ['required', Rule::exists('gamefowl_lookups', 'id')->where('type', GamefowlLookup::TYPE_BLOODLINE)],
            'age_type_id' => ['required', Rule::exists('gamefowl_lookups', 'id')->where('type', GamefowlLookup::TYPE_AGE)],
            'class_id' => ['required', Rule::exists('gamefowl_lookups', 'id')->where('type', GamefowlLookup::TYPE_CLASS)],
            'sex' => 'required|string|in:Not yet determined,Male,Female',
            'hatch_date' => 'nullable|date',
            'description' => 'nullable|string|max:2000',
            'images' => $creating ? 'required|array|size:5' : 'nullable|array|max:5',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'primary_image_index' => 'required|integer|min:0|max:4',
        ]);
    }

    /**
     * @param  list<string>|null  $existing
     * @return array<int, string>
     */
    private function resolveImages(Request $request, ?array $existing = null): array
    {
        $existing = array_values($existing ?? []);
        $paths = [];

        for ($i = 0; $i < 5; $i++) {
            if ($request->hasFile("images.{$i}")) {
                $paths[$i] = '/storage/'.$request->file("images.{$i}")->store('gamefowl-catalog', 'public');
            } elseif (! empty($existing[$i])) {
                $paths[$i] = $existing[$i];
            }
        }

        ksort($paths);

        return $paths;
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(?GamefowlCatalog $current = null): array
    {
        return [
            'bloodlines' => $this->lookupOptions(GamefowlLookup::TYPE_BLOODLINE, $current?->bloodline_id),
            'ageTypes' => $this->lookupOptions(GamefowlLookup::TYPE_AGE, $current?->age_type_id),
            'classes' => $this->lookupOptions(GamefowlLookup::TYPE_CLASS, $current?->class_id),
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function lookupOptions(string $type, $includeId = null): array
    {
        return GamefowlLookup::query()
            ->where('type', $type)
            ->where(function ($query) use ($includeId) {
                $query->where('status', 'active');
                if ($includeId) {
                    $query->orWhere('id', $includeId);
                }
            })
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (GamefowlLookup $lookup) => [
                'id' => $lookup->id,
                'name' => $lookup->name,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function listPayload(GamefowlCatalog $gamefowl): array
    {
        return [
            'id' => $gamefowl->id,
            'name' => $gamefowl->name,
            'bloodline_name' => $gamefowl->bloodline?->name,
            'age_type_name' => $gamefowl->ageType?->name,
            'class_name' => $gamefowl->gamefowlClass?->name,
            'images' => $gamefowl->images ?? [],
            'primary_image_index' => $gamefowl->primary_image_index ?? 0,
            'status' => $gamefowl->status,
            'created_by_name' => $this->userName($gamefowl->creator),
            'created_at' => $gamefowl->created_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailPayload(GamefowlCatalog $gamefowl): array
    {
        return [
            ...$this->listPayload($gamefowl),
            'description' => $gamefowl->description,
            'bloodline_id' => $gamefowl->bloodline_id,
            'age_type_id' => $gamefowl->age_type_id,
            'class_id' => $gamefowl->class_id,
            'sex' => $gamefowl->sex,
            'hatch_date' => $gamefowl->hatch_date?->format('Y-m-d'),
            'created_by_role' => $gamefowl->creator?->user_type,
        ];
    }

    private function userName(?User $user): ?string
    {
        $detail = $user?->userDetail;
        if (! $detail) {
            return null;
        }

        $name = trim(($detail->first_name ?? '').' '.($detail->last_name ?? ''));

        return $name !== '' ? $name : null;
    }

    private function basePath(): string
    {
        $segment = auth()->user()?->user_type === 'admin' ? 'admin' : 'super-admin';

        return "/dashboard/{$segment}/gamefowls";
    }
}
