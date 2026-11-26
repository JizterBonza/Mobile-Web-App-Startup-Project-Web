<?php

namespace App\Services;

use App\Models\Farm;
use App\Models\FarmGamefowlListing;
use App\Models\GamefowlCatalog;
use App\Models\GamefowlLookup;
use App\Support\FuzzySearch;
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
            $listings = $this->rankListings($listings, (string) $data['search']);
        }

        if (filled($data['bloodline_id'] ?? null)) {
            $bloodlineId = (int) $data['bloodline_id'];
            $listings = $listings->filter(
                fn (array $listing) => $this->listingHasBloodline($listing, $bloodlineId)
            );
        }

        return $listings->values();
    }

    /**
     * Active bloodline categories this farm is selling, including bundle members.
     */
    public function bloodlines(int $farmId): Collection
    {
        $ids = $this->listings(['farm_id' => $farmId])
            ->flatMap(fn (array $listing) => $this->listingBloodlineIds($listing))
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        return GamefowlLookup::query()
            ->where('type', GamefowlLookup::TYPE_BLOODLINE)
            ->where('status', 'active')
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name', 'rate'])
            ->map(fn (GamefowlLookup $lookup) => $lookup->only(['id', 'name', 'rate']))
            ->values();
    }

    public function find(int $id): ?array
    {
        return $this->visibleListings($this->listingQuery()->whereKey($id))->first();
    }

    public function search(string $term, int $limit): Collection
    {
        return $this->rankListings($this->visibleListings($this->listingQuery()), $term)
            ->take($limit)
            ->map(fn (array $listing) => [
                'listing_id' => $listing['id'],
                'farm_id' => $listing['farm_id'],
                'name' => $listing['name'],
                'image' => $listing['image'],
                'price' => $listing['price'],
                'is_bundle' => $listing['is_bundle'],
            ])->values();
    }

    private function rankListings(Collection $listings, string $term): Collection
    {
        $rows = $listings->map(function (array $listing) {
            $members = collect($listing['bundle_members'] ?? []);

            return $listing + [
                'search_gamefowl' => $listing['gamefowl']['name'] ?? '',
                'search_bloodline' => $listing['gamefowl']['bloodline']['name'] ?? '',
                'search_members' => $members
                    ->map(fn (array $member) => trim(($member['name'] ?? '').' '.($member['bloodline']['name'] ?? '')))
                    ->implode(' '),
            ];
        });

        return FuzzySearch::rank($rows, $term, 'name', ['search_gamefowl', 'search_bloodline', 'search_members'])
            ->map(function (array $listing) {
                unset($listing['search_gamefowl'], $listing['search_bloodline'], $listing['search_members']);

                return $listing;
            })
            ->values();
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
            if ($listing->is_bundle) {
                $listing->setRelation(
                    'bundleMembers',
                    collect($listing->bundle_catalog_ids ?? [])
                        ->map(fn ($id) => $members->get($id))
                        ->filter()
                        ->values()
                );
            }

            return [
                'id' => $listing->id,
                'farm_id' => $listing->farm_id,
                'farm' => $this->farmPayload($listing->farm),
                'gamefowl_catalog_id' => $listing->gamefowl_catalog_id,
                'name' => $listing->is_bundle ? $listing->bundle_name : $bird->name,
                'price' => $listing->getCustomerUnitPrice(),
                'markup_percent' => $listing->getMarkupPercent(),
                'stock' => $listing->stock,
                'available_birds' => max(0, $listing->stock - (int) $listing->reserved_stock),
                'selling_unit' => $listing->selling_unit,
                'release_option' => $listing->release_option,
                'release_date' => $listing->release_date?->format('Y-m-d'),
                'status' => $listing->status,
                'popularity' => $listing->popularity,
                'images' => $listing->is_bundle && filled($listing->bundle_image)
                    ? [$listing->bundle_image]
                    : ($bird->images ?? []),
                'primary_image_index' => $listing->is_bundle && filled($listing->bundle_image)
                    ? 0
                    : $bird->primary_image_index,
                'image' => $listing->is_bundle && filled($listing->bundle_image)
                    ? $listing->bundle_image
                    : (($bird->images ?? [])[$bird->primary_image_index] ?? ($bird->images[0] ?? null)),
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

    private function listingHasBloodline(array $listing, int $bloodlineId): bool
    {
        return $this->listingBloodlineIds($listing)->contains($bloodlineId);
    }

    /**
     * @param  array<string, mixed>  $listing
     * @return Collection<int, int>
     */
    private function listingBloodlineIds(array $listing): Collection
    {
        $ids = collect([$listing['gamefowl']['bloodline']['id'] ?? null]);
        foreach ($listing['bundle_members'] as $member) {
            $ids->push($member['bloodline']['id'] ?? null);
        }

        return $ids->filter()->map(fn ($id) => (int) $id)->values();
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
