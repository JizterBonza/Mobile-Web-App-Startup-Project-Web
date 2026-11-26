<?php

namespace App\Http\Controllers;

use App\Services\FeaturedSectionService;
use App\Services\ShopZoneCoverageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeaturedApiController extends Controller
{
    public function __construct(private FeaturedSectionService $featured) {}

    /**
     * Mobile Featured Section: products, Agrivet stores, and farms chosen by an admin.
     */
    public function index(Request $request, ShopZoneCoverageService $coverage): JsonResponse
    {
        $zoneIds = $coverage->zoneIdsForRequest($request);
        if ($zoneIds instanceof JsonResponse) {
            return $zoneIds;
        }

        $payload = $this->featured->publicPayload($zoneIds);

        return response()->json([
            'success' => true,
            'data' => [
                'products' => $payload['products']->values(),
                'agrivet_stores' => $payload['agrivet_stores']->values(),
                'farms' => $payload['farms']->values(),
            ],
        ]);
    }

    public function products(): JsonResponse
    {
        return $this->collection($this->featured->publicProducts());
    }

    public function agrivetStores(Request $request, ShopZoneCoverageService $coverage): JsonResponse
    {
        $zoneIds = $coverage->zoneIdsForRequest($request);
        if ($zoneIds instanceof JsonResponse) {
            return $zoneIds;
        }

        return $this->collection($this->featured->publicStores($zoneIds));
    }

    public function farms(): JsonResponse
    {
        return $this->collection($this->featured->publicFarms());
    }

    private function collection(mixed $data): JsonResponse
    {
        $data = collect($data)->values();

        return response()->json([
            'success' => true,
            'data' => $data,
            'count' => $data->count(),
        ]);
    }
}
