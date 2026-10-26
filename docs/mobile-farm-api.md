# Mobile farm browsing API

Base path: `/api`. Send `Accept: application/json`. Browsing endpoints are public;
messaging requires an active customer account and a Sanctum bearer token.

## Endpoints

| Method and path | Parameters / response |
| --- | --- |
| `GET /farms` | Optional `search` (farm name, maximum 100 characters). Returns farms newest first. |
| `GET /farms/search` | Required `q` (2–100 characters); optional `limit` (1–50, default 20). Searches name, description, address. Exact names first, then prefixes, then other matches; newest first within each group. |
| `GET /farms/nearby` | Required `lat` (-90–90) and `long` (-180–180). Optional `radius_km` (0.1–500) and `limit` (1–50, default 20). Closest first; farms without coordinates are excluded. Adds `distance_km`, rounded to three decimals, to each farm and top-level `location: {lat, long}`. |
| `GET /farms/{id}` | Farm profile under `data`. |
| `GET /farms/{id}/listings` | Farm profile under `data`, with a `listings` array containing individual and bundle offerings. |
| `GET /farm-gamefowl-listings` | Optional `farm_id` (positive integer), `search` (maximum 100 characters), `is_bundle` (`0` or `1`). Searches bundle name, gamefowl names, and bloodlines, including bundle members. Exact display names first, then prefixes, then other matches. Otherwise newest first. |
| `GET /farm-gamefowl-listings/{id}` | Offering details under `data`, including farm, anchor gamefowl, and bundle members. |

Farm and listing IDs must be numeric. Collections use
`{"success":true,"data":[],"count":0}`; details use `{"success":true,"data":{...}}`.
`count` is the number returned, not a total before limits. Farm search also returns
`query`. Ordinary farm and listing collections have no pagination or default limit,
matching the existing shop collections. Empty collections return HTTP 200.

Only active farms and active listings backed by active catalog entries are returned.
Bundles with empty membership or any missing/inactive member are excluded. A farm
does not need listings to appear in discovery. Zero-stock and future-release
offerings remain visible for inquiries; visibility does not imply immediate availability.
Passing a status parameter does not expose inactive records.

## Public fields

Every farm object includes `id`, `name`, `registered_business_name`, `owner_name`,
`description`, `contact_number`, `email`, `address`, `city`, `province`, `postal_code`,
`latitude`, `longitude`, `operating_days`, `operating_hours`, `logo_url`, `banner_url`,
`cover_url`, and `status`. Nullable values remain `null`. Bank details, account data,
permits, and owner login records are excluded.

Listings include `id`, `farm_id`, `farm` (the public farm object),
`gamefowl_catalog_id`, `name`, `price`, `stock`, `selling_unit`, `release_option`,
`release_date`, `status`, `popularity`, `images`, `primary_image_index`, `image`,
`is_bundle`, `bundle_name`, `bundle_type`, `bundle_catalog_ids`, `gamefowl`, and
`bundle_members`. Prices are JSON numbers; IDs and stock are integers;
`is_bundle` is boolean. Dates use `YYYY-MM-DD`.

`gamefowl` and each bundle member include `id`, `name`, `description`, `sex`,
`hatch_date`, `images`, `primary_image_index`, `status`, and nullable `bloodline`,
`age_type`, and `class` objects (`{id, name}`). Creator/reviewer account data is excluded.
Bundle members follow the order of `bundle_catalog_ids`.

Images retain existing storage paths, such as `gamefowls/example.jpg`. Use the same
storage URL handling as the existing mobile shop API. The listing image comes from
its anchor bird's primary image, falling back to that bird's first image or `null`.

## Examples

These examples abbreviate nested farm and bird objects; their complete field sets
are listed above.

Individual detail, `GET /api/farm-gamefowl-listings/101`:

```json
{
  "success": true,
  "data": {
    "id": 101,
    "farm_id": 7,
    "farm": {"id": 7, "name": "Hill Farm", "status": "active"},
    "gamefowl_catalog_id": 25,
    "name": "Kelso Red",
    "price": 1500,
    "stock": 5,
    "selling_unit": "per head",
    "release_option": "Release Immediately",
    "release_date": null,
    "status": "active",
    "popularity": 0,
    "images": ["gamefowls/kelso.jpg"],
    "primary_image_index": 0,
    "image": "gamefowls/kelso.jpg",
    "is_bundle": false,
    "bundle_name": null,
    "bundle_type": null,
    "bundle_catalog_ids": [],
    "gamefowl": {
      "id": 25,
      "name": "Kelso Red",
      "sex": "male",
      "hatch_date": "2026-01-01",
      "bloodline": {"id": 1, "name": "Kelso"},
      "age_type": {"id": 2, "name": "Stag"},
      "class": null
    },
    "bundle_members": []
  }
}
```

Bundle detail, `GET /api/farm-gamefowl-listings/102`:

```json
{
  "success": true,
  "data": {
    "id": 102,
    "farm_id": 7,
    "farm": {"id": 7, "name": "Hill Farm", "status": "active"},
    "gamefowl_catalog_id": 25,
    "name": "Kelso Breeding Pair",
    "price": 2800,
    "stock": 2,
    "selling_unit": "per pair",
    "release_option": "Set Release Date",
    "release_date": "2026-12-01",
    "status": "active",
    "popularity": 0,
    "images": ["gamefowls/kelso.jpg"],
    "primary_image_index": 0,
    "image": "gamefowls/kelso.jpg",
    "is_bundle": true,
    "bundle_name": "Kelso Breeding Pair",
    "bundle_type": "Pair",
    "bundle_catalog_ids": [25, 26],
    "gamefowl": {"id": 25, "name": "Kelso Red", "sex": "male"},
    "bundle_members": [
      {"id": 25, "name": "Kelso Red", "sex": "male"},
      {"id": 26, "name": "Kelso Hen", "sex": "female"}
    ]
  }
}
```

`gamefowl_catalog_id` identifies the anchor bird even for bundles. Use
`bundle_catalog_ids`/`bundle_members` for complete membership. Supported bundle types
are Pair (1 male, 1 female), Trio (1 male, 2 females), and Quadruplet (1 male, 3 females).

## Messaging handoff

Use `GET /api/farms/{farmId}/messages/products` for the existing authenticated picker.
Start or resume an inquiry with the existing endpoint:

```http
POST /api/farms/7/messages
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json

{"item_id":102,"body":"Is this breeding pair available?"}
```

`item_id` here is the **listing ID** (`102`), never the catalog ID (`25`) or an agrivet
item ID. This works for individuals and bundles. The existing response has
`conversation`, `messages`, and `farm`, with HTTP 201. Read/send further messages
through `GET /api/messages/{conversationId}` and `POST /api/messages/{conversationId}`.
Browsing does not add offerings to the existing cart or create orders.

## Errors and deployment

- Missing/inactive farms, hidden listings, and missing catalog members produce
  HTTP 404 for detail endpoints: `{"success":false,"message":"Listing not found"}`
  (or `Farm not found`).
- Invalid query parameters produce HTTP 422 with `success: false`,
  `message: "Validation error"`, and field-indexed `errors`.
- An unknown `farm_id` filter returns an empty listing collection.
- Existing messaging authentication and ownership rules remain in effect.

The existing farm, catalog, listing, and bundle migrations must be applied,
including `2026_10_14_131700_add_bundle_fields_to_farm_gamefowl_listings`.
No new database migration is introduced by this API. Existing shop endpoints and
the combined `/api/search` contract are unchanged.

Run the isolated browsing tests with:

```sh
php artisan test --compact tests/Feature/FarmApiTest.php
```
