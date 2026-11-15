<?php

namespace App\Services;

use App\Models\Farm;
use App\Models\FarmGamefowlListing;
use App\Models\GamefowlCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FarmListingDiscoveryService
{
    public function listings(array $data = []): Collection
    {
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

        return $listings->values();
    }

    public function find(int $id): ?array
    {
        return $this->visibleListings($this->listingQuery()->whereKey($id))->first();
    }

    public function search(string $term, int $limit): Collection
    {
        return $this->listings(['search' => $term])->take($limit)->map(fn (array $listing) => [
            'listing_id' => $listing['id'],
            'farm_id' => $listing['farm_id'],
            'name' => $listing['name'],
            'image' => $listing['image'],
            'price' => $listing['price'],
            'is_bundle' => $listing['is_bundle'],
        ])->values();
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
                'available_birds' => max(0, $listing->stock - (int) $listing->reserved_stock),
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

    public function farmPayload(Farm $farm): array
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
}
