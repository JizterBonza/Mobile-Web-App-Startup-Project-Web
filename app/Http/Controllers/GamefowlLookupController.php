<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\GamefowlCatalog;
use App\Models\GamefowlLookup;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class GamefowlLookupController extends Controller
{
    public function bloodlines(Request $request)
    {
        return $this->index($request, GamefowlLookup::TYPE_BLOODLINE);
    }

    public function storeBloodline(Request $request)
    {
        return $this->store($request, GamefowlLookup::TYPE_BLOODLINE);
    }

    public function updateBloodline(Request $request, $id)
    {
        return $this->update($request, GamefowlLookup::TYPE_BLOODLINE, $id);
    }

    public function destroyBloodline($id)
    {
        return $this->destroy(GamefowlLookup::TYPE_BLOODLINE, $id);
    }

    public function ageTypes(Request $request)
    {
        return $this->index($request, GamefowlLookup::TYPE_AGE);
    }

    public function storeAgeType(Request $request)
    {
        return $this->store($request, GamefowlLookup::TYPE_AGE);
    }

    public function updateAgeType(Request $request, $id)
    {
        return $this->update($request, GamefowlLookup::TYPE_AGE, $id);
    }

    public function destroyAgeType($id)
    {
        return $this->destroy(GamefowlLookup::TYPE_AGE, $id);
    }

    public function classes(Request $request)
    {
        return $this->index($request, GamefowlLookup::TYPE_CLASS);
    }

    public function storeClass(Request $request)
    {
        return $this->store($request, GamefowlLookup::TYPE_CLASS);
    }

    public function updateClass(Request $request, $id)
    {
        return $this->update($request, GamefowlLookup::TYPE_CLASS, $id);
    }

    public function destroyClass($id)
    {
        return $this->destroy(GamefowlLookup::TYPE_CLASS, $id);
    }

    private function index(Request $request, string $type)
    {
        $items = GamefowlLookup::query()
            ->where('type', $type)
            ->orderBy('name')
            ->get();

        return Inertia::render('Dashboard/GamefowlLookup', [
            'kind' => $this->kindMeta($type),
            'items' => $items,
        ]);
    }

    private function store(Request $request, string $type)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('gamefowl_lookups', 'name')->where('type', $type),
            ],
            'description' => 'nullable|string',
            'status' => 'required|string|in:active,inactive',
        ]);

        $lookup = GamefowlLookup::create([
            ...$validated,
            'type' => $type,
        ]);

        ActivityLog::log('created', "{$this->kindMeta($type)['singular']} created: {$lookup->name}", $lookup, null, $lookup->toArray());

        return redirect()->back()->with('success', "{$this->kindMeta($type)['singular']} created successfully.");
    }

    private function update(Request $request, string $type, $id)
    {
        $lookup = GamefowlLookup::query()->where('type', $type)->findOrFail($id);
        $oldValues = $lookup->toArray();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('gamefowl_lookups', 'name')->where('type', $type)->ignore($lookup->id),
            ],
            'description' => 'nullable|string',
            'status' => 'required|string|in:active,inactive',
        ]);

        $lookup->update($validated);

        ActivityLog::log('updated', "{$this->kindMeta($type)['singular']} updated: {$lookup->name}", $lookup, $oldValues, $lookup->fresh()->toArray());

        return redirect()->back()->with('success', "{$this->kindMeta($type)['singular']} updated successfully.");
    }

    private function destroy(string $type, $id)
    {
        $lookup = GamefowlLookup::query()->where('type', $type)->findOrFail($id);
        $column = match ($type) {
            GamefowlLookup::TYPE_BLOODLINE => 'bloodline_id',
            GamefowlLookup::TYPE_AGE => 'age_type_id',
            default => 'class_id',
        };

        if (GamefowlCatalog::query()->where($column, $lookup->id)->exists()) {
            return redirect()->back()->with('error', "Cannot delete this {$this->kindMeta($type)['singular']}. It is used by a gamefowl.");
        }

        ActivityLog::log('deleted', "{$this->kindMeta($type)['singular']} deleted: {$lookup->name}", null, $lookup->toArray(), null);
        $lookup->delete();

        return redirect()->back()->with('success', "{$this->kindMeta($type)['singular']} deleted successfully.");
    }

    /**
     * @return array{type: string, title: string, singular: string, noun: string}
     */
    private function kindMeta(string $type): array
    {
        return match ($type) {
            GamefowlLookup::TYPE_BLOODLINE => [
                'type' => $type,
                'title' => 'Bloodline Categories',
                'singular' => 'Bloodline Category',
                'noun' => 'bloodline categories',
            ],
            GamefowlLookup::TYPE_AGE => [
                'type' => $type,
                'title' => 'Age Type',
                'singular' => 'Age Type',
                'noun' => 'age types',
            ],
            default => [
                'type' => $type,
                'title' => 'Class',
                'singular' => 'Class',
                'noun' => 'classes',
            ],
        };
    }
}
