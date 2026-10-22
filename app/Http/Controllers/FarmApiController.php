<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\FarmGamefowlListing;
use App\Models\GamefowlCatalog;
use App\Support\GeoDistance;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class FarmApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $this->validateQuery($request, ['search' => 'nullable|string|max:100']);
        $query = Farm::query()->where('status', 'active');

        if (filled($data['search'] ?? null)) {
            $query->where('name', 'like', '%'.$data['search'].'%');
        }

        return $this->collectionResponse(
            $query->latest()->orderByDesc('id')->get()->map(fn (Farm $farm) => $this->farmPayload($farm))
        );
    }

    public function search(Request $request): JsonResponse
    {
        $data = $this->validateQuery($request, [
            'q' => 'required|string|min:2|max:100',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);
        $term = $data['q'];
        $farms = Farm::query()->where('status', 'active')
            ->where(function (Builder $query) use ($term) {
                $query->where('name', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%')
                    ->orWhere('address', 'like', '%'.$term.'%');
            })
            ->orderByRaw('CASE WHEN name = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END', [$term, $term.'%'])
            ->latest()->orderByDesc('id')->limit($data['limit'] ?? 20)->get()
            ->map(fn (Farm $farm) => $this->farmPayload($farm));

        return $this->collectionResponse($farms, ['query' => $term]);
    }

    public function nearby(Request $request): JsonResponse
    {
        $data = $this->validateQuery($request, [
            'lat' => 'required|numeric|between:-90,90',
            'long' => 'required|numeric|between:-180,180',
            'limit' => 'nullable|integer|min:1|max:50',
            'radius_km' => 'nullable|numeric|min:0.1|max:500',
        ]);
        $lat = (float) $data['lat'];
        $long = (float) $data['long'];
        $radius = isset($data['radius_km']) ? (float) $data['radius_km'] : null;
        $farms = Farm::query()->where('status', 'active')
            ->whereNotNull('latitude')->whereNotNull('longitude')->get()
            ->map(function (Farm $farm) use ($lat, $long) {
                return $this->farmPayload($farm) + [
                    'distance_km' => GeoDistance::kmBetween($lat, $long, $farm->latitude, $farm->longitude),
                ];
            })
            ->filter(fn (array $farm) => $farm['distance_km'] !== null
                && ($radius === null || $farm['distance_km'] <= $radius))
            ->sortBy('distance_km')->take($data['limit'] ?? 20)
            ->map(function (array $farm) {
                $farm['distance_km'] = round($farm['distance_km'], 3);

                return $farm;
            });

        return $this->collectionResponse($farms, ['location' => ['lat' => $lat, 'long' => $long]]);
    }

    public function show(int $id): JsonResponse
    {
        $farm = Farm::query()->where('status', 'active')->find($id);

        return $farm
            ? response()->json(['success' => true, 'data' => $this->farmPayload($farm)])
            : $this->notFound('Farm');
    }

    public function farmListings(int $id): JsonResponse
    {
        $farm = Farm::query()->where('status', 'active')->find($id);
        if (! $farm) {
            return $this->notFound('Farm');
        }

        $listings = $this->visibleListings($this->listingQuery()->where('farm_id', $id));

        return response()->json([
            'success' => true,
            'data' => $this->farmPayload($farm) + ['listings' => $listings->all()],
        ]);
    }

    public function listings(Request $request): JsonResponse
    {
        $data = $this->validateQuery($request, [
            'farm_id' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:100',
            'is_bundle' => 'nullable|boolean',
        ]);
        $query = $this->listingQuery();
        if (isset($data['farm_id'])) {
            $query->where('farm_id', $data['farm_id']);
        }
        if (isset($data['is_bundle'])) {
            $query->where('is_bundle', (bool) $data['is_bundle']);
        }

        $listings = $this->visibleListings($query);
        if (filled($data['search'] ?? null)) {
            $term = mb_strtolower($data['search']);
            $rank = function (array $listing) use ($term): int {
                $name = mb_strtolower($listing['name']);

                return $name === $term ? 0 : (str_starts_with($name, $term) ? 1 : 2);
            };
            $listings = $listings->filter(function (array $listing) use ($term) {
                $names = collect([$listing['name'], $listing['gamefowl']['name'], $listing['gamefowl']['bloodline']['name'] ?? '']);
                foreach ($listing['bundle_members'] as $member) {
                    $names->push($member['name'], $member['bloodline']['name'] ?? '');
                }

                return $names->contains(fn ($name) => str_contains(mb_strtolower($name), $term));
            })->sortBy($rank);
        }

        return $this->collectionResponse($listings);
    }

    public function listing(int $id): JsonResponse
    {
        $listing = $this->visibleListings($this->listingQuery()->whereKey($id))->first();

        return $listing
            ? response()->json(['success' => true, 'data' => $listing])
            : $this->notFound('Listing');
    }

    private function listingQuery(): Builder
    {
        return FarmGamefowlListing::query()
            ->where('status', 'active')
            ->whereHas('farm', fn (Builder $query) => $query->where('status', 'active'))
            ->whereHas('gamefowl', fn (Builder $query) => $query->where('status', GamefowlCatalog::STATUS_ACTIVE))
            ->with(['farm', 'gamefowl.bloodline', 'gamefowl.ageType', 'gamefowl.gamefowlClass'])
            ->latest()->orderByDesc('id');
    }

    /**
     * JSON bundle members cannot be eager-loaded as a relationship. Fetch them once
     * for the whole result set, preserving their stored order and hiding broken bundles.
     */
    private function visibleListings(Builder $query): Collection
    {
        $listings = $query->get();
        $memberIds = $listings->where('is_bundle', true)
            ->flatMap(fn (FarmGamefowlListing $listing) => $listing->bundle_catalog_ids ?? [])
            ->unique()->values();
        $members = $memberIds->isEmpty() ? collect() : GamefowlCatalog::query()
            ->where('status', GamefowlCatalog::STATUS_ACTIVE)->whereIn('id', $memberIds)
            ->with(['bloodline', 'ageType', 'gamefowlClass'])->get()->keyBy('id');

        return $listings->filter(function (FarmGamefowlListing $listing) use ($members) {
            if (! $listing->is_bundle) {
                return true;
            }
            $ids = $listing->bundle_catalog_ids ?? [];

            return count($ids) > 0 && collect($ids)->every(fn ($id) => $members->has($id));
        })->map(function (FarmGamefowlListing $listing) use ($members) {
            $bird = $listing->gamefowl;

            return [
                'id' => $listing->id,
                'farm_id' => $listing->farm_id,
                'farm' => $this->farmPayload($listing->farm),
                'gamefowl_catalog_id' => $listing->gamefowl_catalog_id,
                'name' => $listing->is_bundle ? $listing->bundle_name : $bird->name,
                'price' => $listing->price,
                'stock' => $listing->stock,
                'selling_unit' => $listing->selling_unit,
                'release_option' => $listing->release_option,
                'release_date' => $listing->release_date?->format('Y-m-d'),
                'status' => $listing->status,
                'popularity' => $listing->popularity,
                'images' => $bird->images ?? [],
                'primary_image_index' => $bird->primary_image_index,
                'image' => ($bird->images ?? [])[$bird->primary_image_index] ?? ($bird->images[0] ?? null),
                'is_bundle' => $listing->is_bundle,
                'bundle_name' => $listing->bundle_name,
                'bundle_type' => $listing->bundle_type,
                'bundle_catalog_ids' => $listing->is_bundle ? $listing->bundle_catalog_ids : [],
                'gamefowl' => $this->birdPayload($bird),
                'bundle_members' => $listing->is_bundle
                    ? collect($listing->bundle_catalog_ids)->map(fn ($id) => $this->birdPayload($members->get($id)))->values()->all()
                    : [],
            ];
        })->values();
    }

    private function farmPayload(Farm $farm): array
    {
        return $farm->only([
            'id', 'name', 'registered_business_name', 'owner_name', 'description',
            'contact_number', 'email', 'address', 'city', 'province', 'postal_code',
            'latitude', 'longitude', 'operating_days', 'operating_hours',
            'logo_url', 'banner_url', 'cover_url', 'status',
        ]);
    }

    private function birdPayload(GamefowlCatalog $bird): array
    {
        return $bird->only(['id', 'name', 'description', 'sex', 'images', 'primary_image_index', 'status']) + [
            'hatch_date' => $bird->hatch_date?->format('Y-m-d'),
            'bloodline' => $bird->bloodline?->only(['id', 'name']),
            'age_type' => $bird->ageType?->only(['id', 'name']),
            'class' => $bird->gamefowlClass?->only(['id', 'name']),
        ];
    }

    private function validateQuery(Request $request, array $rules): array
    {
        $validator = Validator::make($request->query(), $rules);
        if ($validator->fails()) {
            throw new ValidationException($validator, response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422));
        }

        return $validator->validated();
    }

    private function collectionResponse(Collection $data, array $extra = []): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $data->values(), 'count' => $data->count()] + $extra);
    }

    private function notFound(string $resource): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $resource.' not found'], 404);
    }
}
