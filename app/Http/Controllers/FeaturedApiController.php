<?php

namespace App\Http\Controllers;

use App\Services\FeaturedSectionService;
use Illuminate\Http\JsonResponse;

class FeaturedApiController extends Controller
{
    public function __construct(private FeaturedSectionService $featured) {}

    /**
     * Mobile Featured Section: products, Agrivet stores, and farms chosen by an admin.
     */
    public function index(): JsonResponse
    {
        $payload = $this->featured->publicPayload();

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

    public function agrivetStores(): JsonResponse
    {
        return $this->collection($this->featured->publicStores());
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
