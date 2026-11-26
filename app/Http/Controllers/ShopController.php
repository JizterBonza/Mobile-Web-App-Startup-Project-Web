<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\RatingReview;
use App\Models\Shop;
use App\Models\Zone;
use App\Services\ShopZoneCoverageService;
use App\Support\FuzzySearch;
use App\Support\GeoDistance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ShopController extends Controller
{
    use EnsuresApiOwnership;

    /**
     * Check delivery coordinates against one or more shops' assigned zones.
     */
    public function checkZoneCoverage(Request $request, ShopZoneCoverageService $coverageService)
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'shop_ids' => ['required', 'array', 'min:1'],
            'shop_ids.*' => ['required', 'integer', 'distinct', 'exists:shops,id'],
        ]);

        $latitude = (float) $validated['latitude'];
        $longitude = (float) $validated['longitude'];
        $coverage = $coverageService->check($latitude, $longitude, $validated['shop_ids']);

        return response()->json([
            'success' => true,
            'all_inside_zone' => $coverage['all_inside_zone'],
            'coordinates' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
            ],
            'shops' => $coverage['shops'],
        ]);
    }

    /**
     * Fetch all shops
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Shop::query();

        // Filter by agrivet_id if provided
        if ($request->has('agrivet_id')) {
            $query->where('agrivet_id', $request->agrivet_id);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('shop_status', $request->status);
        } else {
            // Default to active shops only
            $query->where('shop_status', 'active');
        }

        // Search by shop name if provided
        if ($request->has('search')) {
            $query->where('shop_name', 'like', '%' . $request->search . '%');
        }

        // Order by created_at descending (newest first)
        $query->whereAgrivetIsActive()->orderBy('created_at', 'desc');

        $shops = $query->with(['agrivet' => function ($query) {
            $query->select('id', 'logo_url', 'status');
        }])->get();
        $shops->each->includeAgrivetBanner();

        return response()->json([
            'success' => true,
            'data' => $shops,
            'count' => $shops->count()
        ]);
    }

    /**
     * Fetch a single shop by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $shop = Shop::query()
            ->with(['agrivet' => function ($query) {
                $query->select('id', 'logo_url', 'status');
            }])
            ->find($id);

        if (! $shop || ! $shop->agrivetIsActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shop->includeAgrivetBanner()
        ]);
    }

    /**
     * Fetch a shop with its items
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getShopWithItems($id)
    {
        $shop = Shop::with([
            'agrivet' => function ($query) {
                $query->select('id', 'logo_url', 'status');
            },
            'items' => function ($query) {
                $query->where('item_status', 'active')
                      ->orderBy('created_at', 'desc');
            },
        ])->find($id);

        if (! $shop || ! $shop->agrivetIsActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shop->includeAgrivetBanner()
        ]);
    }

    /**
     * Fetch shops by agrivet ID
     *
     * @param int $agrivetId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByAgrivetId($agrivetId)
    {
        $shops = Shop::query()
            ->with(['agrivet' => function ($query) {
                $query->select('id', 'logo_url', 'status');
            }])
            ->where('agrivet_id', $agrivetId)
            ->whereAgrivetIsActive()
            ->get();
        $shops->each->includeAgrivetBanner();

        if ($shops->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No shops found for this agrivet'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shops,
            'count' => $shops->count()
        ]);
    }

    /**
     * Create a new shop
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        if ($response = $this->ensureStaffOrVendor($request)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'agrivet_id' => 'required|exists:agrivets,id',
            'shop_name' => 'required|string|max:150',
            'shop_description' => 'nullable|string',
            'shop_address' => 'nullable|string|max:255',
            'shop_city' => 'nullable|string|max:100',
            'shop_postal_code' => 'nullable|string|max:20',
            'shop_province' => 'nullable|string|max:100',
            'shop_lat' => 'nullable|numeric',
            'shop_long' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'shop_status' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:150',
            'account_name' => 'nullable|string|max:150',
            'account_number' => 'nullable|string|max:50|regex:/^[0-9]+$/',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // If shop has coordinates, set zone_id to the zone whose boundary contains this point
        $zoneId = null;
        if ($request->filled('shop_lat') && $request->filled('shop_long')) {
            $zone = Zone::findZoneContainingPoint((float) $request->shop_lat, (float) $request->shop_long);
            if ($zone) {
                $zoneId = $zone->id;
            }
        }

        $shop = Shop::create([
            'agrivet_id' => $request->agrivet_id,
            'zone_id' => $zoneId,
            'shop_name' => $request->shop_name,
            'shop_description' => $request->shop_description,
            'shop_address' => $request->shop_address,
            'shop_city' => $request->shop_city,
            'shop_postal_code' => $request->shop_postal_code,
            'shop_province' => $request->shop_province,
            'shop_lat' => $request->shop_lat,
            'shop_long' => $request->shop_long,
            'contact_number' => $request->contact_number,
            'shop_status' => $request->shop_status ?? 'active',
            'bank_name' => $request->bank_name,
            'account_name' => $request->account_name,
            'account_number' => $request->account_number,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Shop created successfully',
            'data' => $shop
        ], 201);
    }

    /**
     * Update an existing shop
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        if ($response = $this->ensureStaffOrVendor($request)) {
            return $response;
        }

        $shop = Shop::find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'agrivet_id' => 'sometimes|exists:agrivets,id',
            'shop_name' => 'sometimes|string|max:150',
            'shop_description' => 'nullable|string',
            'shop_address' => 'nullable|string|max:255',
            'shop_city' => 'nullable|string|max:100',
            'shop_postal_code' => 'nullable|string|max:20',
            'shop_province' => 'nullable|string|max:100',
            'shop_lat' => 'nullable|numeric',
            'shop_long' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'shop_status' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:150',
            'account_name' => 'nullable|string|max:150',
            'account_number' => 'nullable|string|max:50|regex:/^[0-9]+$/',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only([
            'agrivet_id',
            'shop_name',
            'shop_description',
            'shop_address',
            'shop_city',
            'shop_postal_code',
            'shop_province',
            'shop_lat',
            'shop_long',
            'contact_number',
            'shop_status',
            'bank_name',
            'account_name',
            'account_number',
        ]);

        // If shop coordinates are provided, set zone_id to the zone whose boundary contains this point
        if ($request->filled('shop_lat') && $request->filled('shop_long')) {
            $zone = Zone::findZoneContainingPoint((float) $request->shop_lat, (float) $request->shop_long);
            $data['zone_id'] = $zone?->id;
        }

        $shop->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Shop updated successfully',
            'data' => $shop
        ]);
    }

    /**
     * Delete a shop
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        if ($response = $this->ensureStaffOrVendor($request)) {
            return $response;
        }

        $shop = Shop::find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        $shop->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shop deleted successfully'
        ]);
    }

    /**
     * Fetch a shop with its reviews
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getShopWithReviews($id)
    {
        $shop = Shop::with([
            'agrivet' => function ($query) {
                $query->select('id', 'logo_url');
            },
            'ratingReviews' => function ($query) {
                $query->orderBy('created_at', 'desc')
                    ->with(['user.userCredential' => function ($query) {
                        $query->select('id', 'username');
                    }]);
            },
        ])->find($id);

        if (! $shop || ! $shop->agrivetIsActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        // Get shop data without the rating_reviews relationship
        $shopData = $shop->only([
            'id', 'agrivet_id', 'shop_name', 'shop_description', 'shop_address',
            'shop_lat', 'shop_long', 'contact_number',
            'average_rating', 'total_reviews', 'shop_status', 'created_at', 'updated_at'
        ]);
        $shopData['logo_url'] = $shop->agrivetLogoPath();
        $shopData['banner_url'] = $shop->storefrontPath();

        // Add reviews
        $shopData['reviews'] = $shop->ratingReviews->map(function ($review) {
            return [
                'id' => $review->id,
                'user_id' => $review->user_id,
                'username' => $review->user->userCredential->username ?? null,
                'item_id' => $review->item_id,
                'rating' => $review->rating,
                'comment' => $review->review_text,
                'review_images' => $review->review_images,
                'order_id' => $review->order_id,
                'created_at' => $review->created_at,
                'updated_at' => $review->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $shopData
        ]);
    }

    /**
     * Store a new review for a shop
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeReview(Request $request, $id)
    {
        $shop = Shop::find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
            'item_id' => 'nullable|exists:items,id',
            'order_id' => 'nullable|exists:orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'review_text' => 'nullable|string|max:1000',
            'review_images' => 'nullable|array',
            'review_images.*' => 'string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $userId = $this->authUserId($request);

        // Create the review
        $review = RatingReview::create([
            'user_id' => $userId,
            'shop_id' => $id,
            'item_id' => $request->item_id,
            'order_id' => $request->order_id,
            'rating' => $request->rating,
            'review_text' => $request->review_text,
            'review_images' => $request->review_images,
        ]);

        // Update shop's average rating and total reviews
        $totalReviews = RatingReview::where('shop_id', $id)->count();
        $averageRating = RatingReview::where('shop_id', $id)->avg('rating');

        $shop->update([
            'total_reviews' => $totalReviews,
            'average_rating' => round($averageRating, 2),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Review created successfully',
            'data' => $review
        ], 201);
    }

    /**
     * Fetch active shops ordered by distance from the user's location.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function nearby(Request $request, ShopZoneCoverageService $coverage)
    {
        $validator = Validator::make($request->all(), [
            'lat' => 'required|numeric|between:-90,90',
            'long' => 'required|numeric|between:-180,180',
            'limit' => 'nullable|integer|min:1|max:50',
            'radius_km' => 'nullable|numeric|min:0.1|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userLat = (float) $request->lat;
        $userLong = (float) $request->long;
        $limit = (int) $request->input('limit', 20);
        $radiusKm = $request->filled('radius_km') ? (float) $request->radius_km : null;
        $zoneIds = $coverage->zoneIdsContainingPoint($userLat, $userLong);

        $shops = $zoneIds === [] ? collect() : Shop::query()
            ->with(['agrivet' => function ($query) {
                $query->select('id', 'logo_url', 'status');
            }])
            ->where('shop_status', 'active')
            ->whereAgrivetIsActive()
            ->whereNotNull('shop_lat')
            ->whereNotNull('shop_long')
            ->whereIn('zone_id', $zoneIds)
            ->get()
            ->map(function (Shop $shop) use ($userLat, $userLong) {
                $distanceKm = GeoDistance::kmBetween(
                    $userLat,
                    $userLong,
                    (float) $shop->shop_lat,
                    (float) $shop->shop_long
                );

                $shopData = $shop->includeAgrivetBanner()->toArray();
                $shopData['distance_km'] = $distanceKm !== null ? round($distanceKm, 3) : null;

                return $shopData;
            })
            ->filter(function (array $shop) use ($radiusKm) {
                if ($shop['distance_km'] === null) {
                    return false;
                }

                if ($radiusKm !== null && $shop['distance_km'] > $radiusKm) {
                    return false;
                }

                return true;
            })
            ->sortBy('distance_km')
            ->values()
            ->take($limit);

        return response()->json([
            'success' => true,
            'data' => $shops,
            'count' => $shops->count(),
            'location' => [
                'lat' => $userLat,
                'long' => $userLong,
            ],
        ]);
    }

    /**
     * Search shops with optimized query
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request, ShopZoneCoverageService $coverage)
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:2|max:100',
            'limit' => 'nullable|integer|min:1|max:50',
            'lat' => 'nullable|numeric|between:-90,90',
            'long' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $zoneIds = $request->filled('lat') && $request->filled('long')
            ? $coverage->zoneIdsContainingPoint((float) $request->input('lat'), (float) $request->input('long'))
            : [];
        $searchTerm = $request->input('q');

        if ($zoneIds === []) {
            return response()->json([
                'success' => true,
                'data' => [],
                'count' => 0,
                'query' => $searchTerm,
            ]);
        }

        $query = Shop::query()->with(['agrivet' => function ($query) {
            $query->select('id', 'logo_url', 'status');
        }]);

        // Only search active shops of an active Agrivet inside a matching zone.
        $query->where('shop_status', 'active')
            ->whereAgrivetIsActive()
            ->whereIn('zone_id', $zoneIds);
        FuzzySearch::constrain($query, $searchTerm, ['shop_name', 'shop_description', 'shop_address']);

        FuzzySearch::orderByNameRelevance($query, $searchTerm, 'shop_name');
        $query->orderBy('average_rating', 'desc')
            ->orderBy('total_reviews', 'desc');

        $limit = (int) ($request->input('limit') ?? 20);
        $shops = FuzzySearch::rank(
            $query->limit(FuzzySearch::CANDIDATE_LIMIT)->get(),
            $searchTerm,
            'shop_name',
            ['shop_description', 'shop_address']
        )->take($limit)->values();
        $shops->each->includeAgrivetBanner();

        return response()->json([
            'success' => true,
            'data' => $shops,
            'count' => $shops->count(),
            'query' => $searchTerm
        ]);
    }
}
