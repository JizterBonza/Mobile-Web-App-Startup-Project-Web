<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Services\FarmListingDiscoveryService;
use App\Support\GeoDistance;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class FarmApiController extends Controller
{
    public function __construct(private FarmListingDiscoveryService $discovery) {}

    public function index(Request $request): JsonResponse
    {
        $data = $this->validateQuery($request, ['search' => 'nullable|string|max:100']);
        $query = Farm::query()->where('status', 'active');

        if (filled($data['search'] ?? null)) {
            $query->where('name', 'like', '%'.$data['search'].'%');
        }

        return $this->collectionResponse(
            $query->latest()->orderByDesc('id')->get()->map(fn (Farm $farm) => $this->discovery->farmPayload($farm))
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
            ->map(fn (Farm $farm) => $this->discovery->farmPayload($farm));

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
                return $this->discovery->farmPayload($farm) + [
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
            ? response()->json(['success' => true, 'data' => $this->discovery->farmPayload($farm)])
            : $this->notFound('Farm');
    }

    public function farmListings(int $id): JsonResponse
    {
        $farm = Farm::query()->where('status', 'active')->find($id);
        if (! $farm) {
            return $this->notFound('Farm');
        }

        $listings = $this->discovery->listings(['farm_id' => $id]);

        return response()->json([
            'success' => true,
            'data' => $this->discovery->farmPayload($farm) + ['listings' => $listings->all()],
        ]);
    }

    public function listings(Request $request): JsonResponse
    {
        $data = $this->validateQuery($request, [
            'farm_id' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:100',
            'is_bundle' => 'nullable|boolean',
        ]);

        return $this->collectionResponse($this->discovery->listings($data));
    }

    public function listing(int $id): JsonResponse
    {
        $listing = $this->discovery->find($id);

        return $listing
            ? response()->json(['success' => true, 'data' => $listing])
            : $this->notFound('Listing');
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
