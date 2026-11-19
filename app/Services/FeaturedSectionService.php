<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Farm;
use App\Models\FeaturedEntry;
use App\Models\Item;
use App\Models\Shop;
use App\Support\PublicStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FeaturedSectionService
{
    public function __construct(private FarmListingDiscoveryService $farms) {}

    /**
     * Curated lists for the Super Admin / Admin page.
     *
     * @return array<string, array<string, mixed>>
     */
    public function dashboard(): array
    {
        $entries = FeaturedEntry::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $maps = $this->entityMaps($entries);
        $sections = [];

        foreach (FeaturedEntry::sections() as $key => $label) {
            $cards = $entries
                ->where('section', $key)
                ->values()
                ->map(fn (FeaturedEntry $entry) => $this->entryCard($entry, $maps))
                ->all();

            $sections[$key] = [
                'key' => $key,
                'label' => $label,
                'entries' => $cards,
                'total' => count($cards),
                'visible_count' => count(array_filter(
                    $cards,
                    fn (array $card) => $card['is_active'] && $card['available']
                )),
            ];
        }

        return $sections;
    }

    /**
     * Active records an admin can add. Already featured rows stay in the list and are marked.
     *
     * @return list<array<string, mixed>>
     */
    public function search(string $section, string $term, int $limit = 12): array
    {
        $this->assertSection($section);
        $term = trim($term);
        if (mb_strlen($term) < 2) {
            return [];
        }

        $featuredIds = FeaturedEntry::query()
            ->where('section', $section)
            ->pluck('entity_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $records = match ($section) {
            FeaturedEntry::SECTION_PRODUCT => $this->searchProducts($term, $limit),
            FeaturedEntry::SECTION_AGRIVET_STORE => $this->searchStores($term, $limit),
            FeaturedEntry::SECTION_FARM => $this->searchFarms($term, $limit),
        };

        return $records->map(function ($record) use ($section, $featuredIds) {
            $card = $this->recordCard($section, $record);

            return $card + [
                'already_featured' => in_array($card['entity_id'], $featuredIds, true),
            ];
        })->all();
    }

    public function add(string $section, int $entityId, ?int $userId): FeaturedEntry
    {
        $this->assertSection($section);
        $name = $this->requireEligibleName($section, $entityId);

        try {
            $entry = DB::transaction(function () use ($section, $entityId, $userId) {
                $existing = FeaturedEntry::query()
                    ->where('section', $section)
                    ->lockForUpdate()
                    ->get();

                if ($existing->contains(fn (FeaturedEntry $row) => (int) $row->entity_id === $entityId)) {
                    throw ValidationException::withMessages([
                        'entity_id' => 'This is already in the Featured Section.',
                    ]);
                }

                if ($existing->count() >= FeaturedEntry::MAX_PER_SECTION) {
                    throw ValidationException::withMessages([
                        'entity_id' => 'This Featured Section already has the maximum of '.FeaturedEntry::MAX_PER_SECTION.' entries. Remove one before adding another.',
                    ]);
                }

                $nextOrder = $existing->isEmpty()
                    ? 0
                    : ((int) $existing->max('sort_order')) + 1;

                return FeaturedEntry::create([
                    'section' => $section,
                    'entity_id' => $entityId,
                    'sort_order' => $nextOrder,
                    'is_active' => true,
                    'created_by' => $userId,
                ]);
            });
        } catch (QueryException $exception) {
            if ($this->isDuplicateKey($exception)) {
                throw ValidationException::withMessages([
                    'entity_id' => 'This is already in the Featured Section.',
                ]);
            }

            throw $exception;
        }

        ActivityLog::log(
            'created',
            'Added to Featured Section ('.$this->sectionLabel($section).'): '.$name,
            $entry,
            null,
            $entry->only(['section', 'entity_id', 'sort_order', 'is_active'])
        );

        return $entry;
    }

    public function toggle(FeaturedEntry $entry): FeaturedEntry
    {
        $name = $this->displayName($entry->section, (int) $entry->entity_id);
        $entry->is_active = ! $entry->is_active;
        $entry->save();

        $state = $entry->is_active ? 'shown in' : 'hidden from';
        ActivityLog::log(
            'updated',
            'Featured Section entry is now '.$state.' the mobile app ('.$this->sectionLabel($entry->section).'): '.$name,
            $entry,
            ['is_active' => ! $entry->is_active],
            $entry->only(['section', 'entity_id', 'is_active'])
        );

        return $entry;
    }

    public function remove(FeaturedEntry $entry): void
    {
        $name = $this->displayName($entry->section, (int) $entry->entity_id);
        $snapshot = $entry->only(['id', 'section', 'entity_id', 'sort_order', 'is_active']);

        ActivityLog::log(
            'deleted',
            'Removed from Featured Section ('.$this->sectionLabel($entry->section).'): '.$name,
            $entry,
            $snapshot,
            null
        );

        $entry->delete();
    }

    /**
     * @param  list<int>  $ids
     */
    public function reorder(string $section, array $ids): void
    {
        $this->assertSection($section);
        $ids = array_map('intval', $ids);

        DB::transaction(function () use ($section, $ids) {
            $existing = FeaturedEntry::query()
                ->where('section', $section)
                ->lockForUpdate()
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $expected = $existing;
            $received = $ids;
            sort($expected);
            sort($received);

            if ($expected !== $received) {
                throw ValidationException::withMessages([
                    'ids' => 'The featured list changed. Refresh the page and try again.',
                ]);
            }

            foreach ($ids as $index => $id) {
                FeaturedEntry::query()->whereKey($id)->update(['sort_order' => $index]);
            }
        });

        ActivityLog::log(
            'updated',
            'Reordered the Featured Section ('.$this->sectionLabel($section).').',
            null,
            null,
            ['section' => $section, 'ids' => $ids]
        );
    }

    /**
     * Payload for the mobile home Featured Section.
     * Products and stores match the existing item and shop list objects.
     * Farms match the farm discovery payload. Order is the admin sort order.
     * Inactive entries and records the app would not otherwise list are omitted.
     *
     * @return array{products: Collection, agrivet_stores: Collection, farms: Collection}
     */
    public function publicPayload(): array
    {
        return [
            'products' => $this->publicProducts(),
            'agrivet_stores' => $this->publicStores(),
            'farms' => $this->publicFarms(),
        ];
    }

    public function publicProducts(): Collection
    {
        $entries = $this->activeEntries(FeaturedEntry::SECTION_PRODUCT);
        if ($entries->isEmpty()) {
            return collect();
        }

        $items = Item::query()
            ->with(['shop.agrivet:id,status,banner_url'])
            ->whereIn('id', $entries->pluck('entity_id'))
            ->where('item_status', 'active')
            ->whereHas('shop', function (Builder $shop) {
                $shop->where('shop_status', 'active')->whereAgrivetIsActive();
            })
            ->get()
            ->keyBy('id');

        return $this->ordered($entries, $items, function (Item $item) {
            if ($item->shop) {
                $item->shop->unsetRelation('agrivet');
                $item->shop->makeHidden([
                    'bank_name',
                    'account_name',
                    'account_number',
                    'wallet_balance',
                    'permit_url',
                ]);
            }

            return $item;
        });
    }

    public function publicStores(): Collection
    {
        $entries = $this->activeEntries(FeaturedEntry::SECTION_AGRIVET_STORE);
        if ($entries->isEmpty()) {
            return collect();
        }

        $shops = Shop::query()
            ->with(['agrivet:id,status,banner_url'])
            ->whereIn('id', $entries->pluck('entity_id'))
            ->where('shop_status', 'active')
            ->whereAgrivetIsActive()
            ->get()
            ->keyBy('id');

        return $this->ordered($entries, $shops, function (Shop $shop) {
            $shop->includeAgrivetBanner();
            $shop->makeHidden(['bank_name', 'account_name', 'account_number', 'wallet_balance']);

            return $shop;
        });
    }

    public function publicFarms(): Collection
    {
        $entries = $this->activeEntries(FeaturedEntry::SECTION_FARM);
        if ($entries->isEmpty()) {
            return collect();
        }

        $farms = Farm::query()
            ->where('status', 'active')
            ->whereIn('id', $entries->pluck('entity_id'))
            ->get()
            ->keyBy('id');

        return $this->ordered(
            $entries,
            $farms,
            fn (Farm $farm) => $this->farms->farmPayload($farm)
        );
    }

    private function activeEntries(string $section): Collection
    {
        return FeaturedEntry::query()
            ->where('section', $section)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  Collection<int, FeaturedEntry>  $entries
     * @param  Collection<int|string, mixed>  $records
     */
    private function ordered(Collection $entries, Collection $records, callable $present): Collection
    {
        return $entries
            ->map(function (FeaturedEntry $entry) use ($records, $present) {
                $record = $records->get($entry->entity_id);

                return $record ? $present($record) : null;
            })
            ->filter()
            ->values();
    }

    /**
     * @param  Collection<int, FeaturedEntry>  $entries
     * @return array{items: Collection, shops: Collection, farms: Collection}
     */
    private function entityMaps(Collection $entries): array
    {
        $ids = function (string $section) use ($entries) {
            return $entries->where('section', $section)->pluck('entity_id')->unique()->values();
        };

        return [
            'items' => Item::query()
                ->with(['shop.agrivet:id,status'])
                ->whereIn('id', $ids(FeaturedEntry::SECTION_PRODUCT))
                ->get()
                ->keyBy('id'),
            'shops' => Shop::query()
                ->with(['agrivet:id,status'])
                ->whereIn('id', $ids(FeaturedEntry::SECTION_AGRIVET_STORE))
                ->get()
                ->keyBy('id'),
            'farms' => Farm::query()
                ->whereIn('id', $ids(FeaturedEntry::SECTION_FARM))
                ->get()
                ->keyBy('id'),
        ];
    }

    /**
     * @param  array{items: Collection, shops: Collection, farms: Collection}  $maps
     * @return array<string, mixed>
     */
    private function entryCard(FeaturedEntry $entry, array $maps): array
    {
        $record = match ($entry->section) {
            FeaturedEntry::SECTION_PRODUCT => $maps['items']->get($entry->entity_id),
            FeaturedEntry::SECTION_AGRIVET_STORE => $maps['shops']->get($entry->entity_id),
            FeaturedEntry::SECTION_FARM => $maps['farms']->get($entry->entity_id),
            default => null,
        };

        [$available, $reason] = $record
            ? $this->availability($entry->section, $record)
            : [false, 'This record no longer exists.'];

        $card = $record
            ? $this->recordCard($entry->section, $record)
            : [
                'entity_id' => (int) $entry->entity_id,
                'name' => 'Removed '.$this->sectionLabel($entry->section),
                'subtitle' => null,
                'image_url' => null,
                'detail' => null,
            ];

        return $card + [
            'id' => (int) $entry->id,
            'is_active' => (bool) $entry->is_active,
            'sort_order' => (int) $entry->sort_order,
            'available' => $available,
            'unavailable_reason' => $available ? null : $reason,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function recordCard(string $section, Item|Shop|Farm $record): array
    {
        if ($record instanceof Item) {
            return [
                'entity_id' => (int) $record->id,
                'name' => (string) $record->item_name,
                'subtitle' => $record->shop?->shop_name,
                'image_url' => $this->imageUrl($record->item_images),
                'detail' => '₱'.number_format((float) $record->effective_price, 2),
            ];
        }

        if ($record instanceof Shop) {
            return [
                'entity_id' => (int) $record->id,
                'name' => (string) $record->shop_name,
                'subtitle' => $this->place($record->shop_city, $record->shop_province),
                'image_url' => $this->imageUrl($record->logo_url),
                'detail' => $this->ratingLabel($record->average_rating, $record->total_reviews),
            ];
        }

        return [
            'entity_id' => (int) $record->id,
            'name' => (string) $record->name,
            'subtitle' => $this->place($record->city, $record->province),
            'image_url' => $this->imageUrl($record->logo_url),
            'detail' => $record->owner_name ? 'Owner: '.$record->owner_name : null,
        ];
    }

    /**
     * @return array{0: bool, 1: ?string}
     */
    private function availability(string $section, Item|Shop|Farm $record): array
    {
        if ($record instanceof Item) {
            if ($record->item_status !== 'active') {
                return [false, 'This product is not active.'];
            }
            $shop = $record->shop;
            if (! $shop || $shop->shop_status !== 'active') {
                return [false, 'Its Agrivet store is not active.'];
            }
            if (! $shop->agrivetIsActive()) {
                return [false, 'Its Agrivet is not active.'];
            }

            return [true, null];
        }

        if ($record instanceof Shop) {
            if ($record->shop_status !== 'active') {
                return [false, 'This Agrivet store is not active.'];
            }
            if (! $record->agrivetIsActive()) {
                return [false, 'Its Agrivet is not active.'];
            }

            return [true, null];
        }

        if ($record->status !== 'active') {
            return [false, 'This farm is not active.'];
        }

        return [true, null];
    }

    private function requireEligibleName(string $section, int $entityId): string
    {
        $record = $this->findRecord($section, $entityId);
        if (! $record) {
            throw ValidationException::withMessages([
                'entity_id' => 'That '.$this->sectionSingular($section).' could not be found.',
            ]);
        }

        [$available, $reason] = $this->availability($section, $record);
        if (! $available) {
            throw ValidationException::withMessages([
                'entity_id' => $reason ?: 'This record cannot be featured.',
            ]);
        }

        return $this->recordCard($section, $record)['name'];
    }

    private function displayName(string $section, int $entityId): string
    {
        $record = $this->findRecord($section, $entityId);

        return $record
            ? $this->recordCard($section, $record)['name']
            : $this->sectionLabel($section).' #'.$entityId;
    }

    private function findRecord(string $section, int $entityId): Item|Shop|Farm|null
    {
        return match ($section) {
            FeaturedEntry::SECTION_PRODUCT => Item::query()->with(['shop.agrivet:id,status'])->find($entityId),
            FeaturedEntry::SECTION_AGRIVET_STORE => Shop::query()->with(['agrivet:id,status'])->find($entityId),
            FeaturedEntry::SECTION_FARM => Farm::query()->find($entityId),
            default => null,
        };
    }

    private function searchProducts(string $term, int $limit): Collection
    {
        $like = $this->likeTerm($term);

        return Item::query()
            ->with(['shop.agrivet:id,status'])
            ->where('item_status', 'active')
            ->whereHas('shop', function (Builder $shop) {
                $shop->where('shop_status', 'active')->whereAgrivetIsActive();
            })
            ->where(function (Builder $query) use ($like) {
                $query->where('item_name', 'like', $like)
                    ->orWhereHas('shop', fn (Builder $shop) => $shop->where('shop_name', 'like', $like));
            })
            ->orderByRaw('CASE WHEN item_name = ? THEN 0 WHEN item_name LIKE ? THEN 1 ELSE 2 END', [$term, $this->prefixTerm($term)])
            ->orderBy('item_name')
            ->limit($limit)
            ->get();
    }

    private function searchStores(string $term, int $limit): Collection
    {
        $like = $this->likeTerm($term);

        return Shop::query()
            ->with(['agrivet:id,status'])
            ->where('shop_status', 'active')
            ->whereAgrivetIsActive()
            ->where(function (Builder $query) use ($like) {
                $query->where('shop_name', 'like', $like)
                    ->orWhere('shop_city', 'like', $like)
                    ->orWhere('shop_address', 'like', $like);
            })
            ->orderByRaw('CASE WHEN shop_name = ? THEN 0 WHEN shop_name LIKE ? THEN 1 ELSE 2 END', [$term, $this->prefixTerm($term)])
            ->orderBy('shop_name')
            ->limit($limit)
            ->get();
    }

    private function searchFarms(string $term, int $limit): Collection
    {
        $like = $this->likeTerm($term);

        return Farm::query()
            ->where('status', 'active')
            ->where(function (Builder $query) use ($like) {
                $query->where('name', 'like', $like)
                    ->orWhere('city', 'like', $like)
                    ->orWhere('address', 'like', $like);
            })
            ->orderByRaw('CASE WHEN name = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END', [$term, $this->prefixTerm($term)])
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }

    private function likeTerm(string $term): string
    {
        return '%'.$this->escapeLike($term).'%';
    }

    private function prefixTerm(string $term): string
    {
        return $this->escapeLike($term).'%';
    }

    private function escapeLike(string $term): string
    {
        return addcslashes($term, '%_\\');
    }

    private function imageUrl(mixed $value): ?string
    {
        if (is_array($value)) {
            $value = $value[0] ?? null;
            if (is_array($value)) {
                $value = $value['url'] ?? $value['path'] ?? null;
            }
        }

        return is_string($value) && trim($value) !== '' ? PublicStorage::url($value) : null;
    }

    private function place(?string $city, ?string $province): ?string
    {
        $parts = array_values(array_filter(
            [$city, $province],
            fn ($value) => is_string($value) && trim($value) !== ''
        ));

        return $parts === [] ? null : implode(', ', $parts);
    }

    private function ratingLabel(mixed $rating, mixed $reviews): ?string
    {
        if ($rating === null) {
            return null;
        }

        $label = number_format((float) $rating, 1);
        $count = (int) $reviews;

        return $count > 0 ? $label.' · '.$count.' '.($count === 1 ? 'review' : 'reviews') : $label;
    }

    private function assertSection(string $section): void
    {
        if (! array_key_exists($section, FeaturedEntry::sections())) {
            throw ValidationException::withMessages([
                'section' => 'Choose Products, Agrivet Stores, or Farms.',
            ]);
        }
    }

    private function sectionLabel(string $section): string
    {
        return FeaturedEntry::sections()[$section] ?? 'Featured';
    }

    private function sectionSingular(string $section): string
    {
        return match ($section) {
            FeaturedEntry::SECTION_PRODUCT => 'product',
            FeaturedEntry::SECTION_AGRIVET_STORE => 'Agrivet store',
            FeaturedEntry::SECTION_FARM => 'farm',
            default => 'record',
        };
    }

    private function isDuplicateKey(QueryException $exception): bool
    {
        $state = (string) ($exception->errorInfo[0] ?? '');

        return $state === '23000' && str_contains(strtolower($exception->getMessage()), 'duplicate');
    }
}
