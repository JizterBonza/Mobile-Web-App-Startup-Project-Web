<?php

namespace App\Http\Controllers;

use App\Models\KlasrumCategory;
use App\Models\KlasrumContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KlasrumApiController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = KlasrumCategory::query()
            ->active()
            ->orderBy('name')
            ->get()
            ->map(fn (KlasrumCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
            ]);

        return response()->json([
            'success' => true,
            'data' => $categories,
            'count' => $categories->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = KlasrumContent::query()
            ->with('category')
            ->published();

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('heading', 'like', '%' . $search . '%');
            });
        }

        $contents = $query
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (KlasrumContent $content) => $content->toMobileListArray());

        return response()->json([
            'success' => true,
            'data' => $contents,
            'count' => $contents->count(),
        ]);
    }

    public function contents(): JsonResponse
    {
        $contents = KlasrumContent::query()
            ->with('category')
            ->published()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (KlasrumContent $content) => $content->toMobileDetailArray());

        return response()->json([
            'success' => true,
            'data' => $contents,
            'count' => $contents->count(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $content = KlasrumContent::query()
            ->with('category')
            ->published()
            ->find($id);

        if (! $content) {
            return response()->json([
                'success' => false,
                'message' => 'Content not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $content->toMobileDetailArray(),
        ]);
    }
}
