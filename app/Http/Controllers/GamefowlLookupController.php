<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\GamefowlCatalog;
use App\Models\GamefowlLookup;
use App\Models\GamefowlLookupRateLog;
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

    /**
     * Fetch rate change history for a bloodline.
     */
    public function bloodlineRateHistory($id)
    {
        $lookup = GamefowlLookup::query()
            ->where('type', GamefowlLookup::TYPE_BLOODLINE)
            ->findOrFail($id);

        $logs = GamefowlLookupRateLog::query()
            ->with([
                'user:id,user_detail_id',
                'user.userDetail:id,first_name,last_name,email',
            ])
            ->where('gamefowl_lookup_id', $lookup->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (GamefowlLookupRateLog $log) {
                $detail = $log->user?->userDetail;
                $userName = $detail
                    ? trim(($detail->first_name ?? '').' '.($detail->last_name ?? '')) ?: ($detail->email ?? null)
                    : null;

                return [
                    'id' => $log->id,
                    'old_rate' => $log->old_rate,
                    'new_rate' => $log->new_rate,
                    'changed_by' => $userName ?: ($log->user_id ? "User #{$log->user_id}" : 'System'),
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'bloodline' => [
                'id' => $lookup->id,
                'name' => $lookup->name,
                'rate' => $lookup->rate,
            ],
            'data' => $logs,
        ]);
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
        $validated = $request->validate($this->rules($type));

        $lookup = GamefowlLookup::create([
            ...$validated,
            'type' => $type,
            'rate' => $this->rateFor($type, $validated),
        ]);

        if ($type === GamefowlLookup::TYPE_BLOODLINE) {
            GamefowlLookup::flushRatesCache();
            GamefowlLookupRateLog::logChange($lookup, null, (float) $lookup->rate);
            ActivityLog::log(
                'bloodline_rate_changed',
                "Initial bloodline rate set for {$lookup->name}: {$lookup->rate}%",
                $lookup,
                null,
                ['rate' => $lookup->rate]
            );
        }

        ActivityLog::log('created', "{$this->kindMeta($type)['singular']} created: {$lookup->name}", $lookup, null, $lookup->toArray());

        return redirect()->back()->with('success', "{$this->kindMeta($type)['singular']} created successfully.");
    }

    private function update(Request $request, string $type, $id)
    {
        $lookup = GamefowlLookup::query()->where('type', $type)->findOrFail($id);
        $oldValues = $lookup->toArray();
        $oldRate = $oldValues['rate'] ?? null;

        $validated = $request->validate($this->rules($type, $lookup->id));
        $validated['rate'] = $this->rateFor($type, $validated);

        $lookup->update($validated);

        if ($type === GamefowlLookup::TYPE_BLOODLINE) {
            GamefowlLookup::flushRatesCache();
            $newRate = (float) $lookup->rate;
            $rateChanged = $oldRate === null
                || bccomp(number_format((float) $oldRate, 2, '.', ''), number_format($newRate, 2, '.', ''), 2) !== 0;

            if ($rateChanged) {
                GamefowlLookupRateLog::logChange(
                    $lookup,
                    $oldRate !== null ? (float) $oldRate : null,
                    $newRate
                );

                $oldLabel = $oldRate !== null ? "{$oldRate}%" : 'none';
                ActivityLog::log(
                    'bloodline_rate_changed',
                    "Bloodline rate changed for {$lookup->name}: {$oldLabel} → {$newRate}%",
                    $lookup,
                    ['rate' => $oldRate],
                    ['rate' => $newRate]
                );
            }
        }

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

        if ($type === GamefowlLookup::TYPE_BLOODLINE) {
            GamefowlLookup::flushRatesCache();
        }

        return redirect()->back()->with('success', "{$this->kindMeta($type)['singular']} deleted successfully.");
    }

    /**
     * Rate is stored only for bloodline categories. Other lookup types always keep it null.
     *
     * @return array<string, mixed>
     */
    private function rules(string $type, $ignoreId = null): array
    {
        $rules = [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('gamefowl_lookups', 'name')->where('type', $type)->ignore($ignoreId),
            ],
            'description' => 'nullable|string',
            'status' => 'required|string|in:active,inactive',
        ];

        if ($type === GamefowlLookup::TYPE_BLOODLINE) {
            $rules['rate'] = 'required|numeric|min:0|max:100';
        }

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function rateFor(string $type, array $validated): ?string
    {
        if ($type !== GamefowlLookup::TYPE_BLOODLINE) {
            return null;
        }

        return number_format((float) $validated['rate'], 2, '.', '');
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
