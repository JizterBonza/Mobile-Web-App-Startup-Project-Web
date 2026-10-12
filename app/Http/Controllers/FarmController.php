<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Farm;
use App\Models\User;
use App\Models\UserCredential;
use App\Models\UserDetail;
use App\Models\Zone;
use App\Services\UserWelcomeEmailService;
use App\Support\PublicStorage;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class FarmController extends Controller
{
    /**
     * Display a listing of farms.
     */
    public function index()
    {
        $farms = Farm::with(['ownerManager.userDetail'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (Farm $farm) {
                $manager = $farm->ownerManager;

                return [
                    'id' => $farm->id,
                    'name' => $farm->name,
                    'registered_business_name' => $farm->registered_business_name,
                    'owner_name' => $farm->owner_name,
                    'description' => $farm->description,
                    'contact_number' => $farm->contact_number,
                    'email' => $farm->email,
                    'permits' => $farm->permits,
                    'logo_url' => $farm->logo_url,
                    'banner_url' => $farm->banner_url,
                    'address' => $farm->address,
                    'city' => $farm->city,
                    'province' => $farm->province,
                    'postal_code' => $farm->postal_code,
                    'latitude' => $farm->latitude,
                    'longitude' => $farm->longitude,
                    'cover_url' => $farm->cover_url,
                    'permit_url' => $farm->permit_url,
                    'operating_days' => $farm->operating_days,
                    'operating_hours' => $farm->operating_hours,
                    'status' => $farm->status,
                    'created_at' => $farm->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $farm->updated_at->format('Y-m-d H:i:s'),
                    'owner_manager_name' => $manager?->userDetail
                        ? trim($manager->userDetail->first_name.' '.$manager->userDetail->last_name)
                        : null,
                    'owner_manager_email' => $manager?->userDetail?->email,
                ];
            });

        return Inertia::render('Dashboard/FarmManagement', [
            'farms' => $farms,
        ]);
    }

    /**
     * Multi-step "Add Farm" wizard. Creates the farm and its owner/manager login.
     */
    public function create()
    {
        $zones = Zone::where('status', true)->orderBy('name')->get()
            ->map(fn ($z) => [
                'id' => $z->id,
                'name' => $z->name,
                'boundary' => $z->boundary,
            ]);

        return Inertia::render('Dashboard/AddFarm', [
            'zones' => $zones,
        ]);
    }

    /**
     * Persist wizard: farm plus owner/manager account.
     */
    public function storeSetupWizard(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:user_details,email',
            'password' => 'required|string|min:6|confirmed',
            'phone_number' => 'required|string|max:30',
            'farm_name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'banner' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'street' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'province' => 'required|string|max:100',
            'zip_code' => 'required|string|max:20',
            'opening_time' => 'required|string|max:10',
            'closing_time' => 'required|string|max:10',
            'operating_days' => 'required|string|max:500',
            'farm_lat' => 'nullable|numeric',
            'farm_long' => 'nullable|numeric',
            'cover_image' => 'required|file|mimes:jpeg,jpg,png,webp|max:10240',
            'permit_image' => 'required|file|mimes:jpeg,jpg,png,webp,pdf|max:10240',
        ]);

        $ownerManager = null;
        $ownerUsername = null;

        try {
            DB::transaction(function () use ($request, $validated, &$ownerManager, &$ownerUsername) {
                $coverPath = $request->file('cover_image')->store('farms/covers', 'public');
                $permitPath = $request->file('permit_image')->store('farms/permits', 'public');

                $logoUrl = $request->hasFile('logo')
                    ? $this->storeFarmImage($request->file('logo'), 'logos')
                    : null;
                $bannerUrl = $request->hasFile('banner')
                    ? $this->storeFarmImage($request->file('banner'), 'banners')
                    : null;

                $ownerParts = array_filter([
                    $validated['first_name'],
                    $validated['middle_name'] ?? null,
                    $validated['last_name'],
                ]);
                $ownerName = implode(' ', $ownerParts);

                $daysLabel = $validated['operating_days'];
                $hoursLabel = $validated['opening_time'].' - '.$validated['closing_time'];

                $permitsPayload = json_encode([
                    'permit_document_url' => PublicStorage::url($permitPath),
                    'operating_days' => $daysLabel,
                    'operating_hours' => $hoursLabel,
                ]);

                $lat = $request->filled('farm_lat') ? (float) $request->farm_lat : null;
                $lng = $request->filled('farm_long') ? (float) $request->farm_long : null;

                $farm = Farm::create([
                    'name' => $validated['farm_name'],
                    'registered_business_name' => $validated['farm_name'],
                    'owner_name' => $ownerName,
                    'description' => $validated['description'] ?? null,
                    'contact_number' => $validated['phone_number'],
                    'email' => $validated['email'],
                    'permits' => $permitsPayload,
                    'logo_url' => $logoUrl,
                    'banner_url' => $bannerUrl,
                    'address' => $validated['street'].', '.$validated['barangay'],
                    'city' => $validated['city'],
                    'province' => $validated['province'],
                    'postal_code' => $validated['zip_code'],
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'cover_url' => $coverPath,
                    'permit_url' => $permitPath,
                    'operating_days' => $daysLabel,
                    'operating_hours' => $hoursLabel,
                    'status' => 'active',
                ]);

                $ownerUsername = explode('@', $validated['email'])[0].'_'.time();

                $ownerDetail = UserDetail::create([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'email' => $validated['email'],
                    'mobile_number' => $validated['phone_number'],
                ]);

                $ownerCredential = UserCredential::create([
                    'username' => $ownerUsername,
                    'password_hash' => Hash::make($validated['password']),
                ]);

                $ownerManager = User::create([
                    'user_detail_id' => $ownerDetail->id,
                    'user_credential_id' => $ownerCredential->id,
                    'status' => 'active',
                    'user_type' => User::TYPE_OWNER_MANAGER,
                    'farm_id' => $farm->id,
                ]);

                $ownerManager->load(['userDetail', 'userCredential']);
                $ownerLogPayload = $ownerManager->toArray();
                if (isset($ownerLogPayload['user_credential'])) {
                    $ownerLogPayload['user_credential'] = array_diff_key($ownerLogPayload['user_credential'], ['password_hash' => 1]);
                }
                ActivityLog::log(
                    'created',
                    "Owner/manager login created for Farm {$farm->name}: {$validated['email']}",
                    $ownerManager,
                    null,
                    $ownerLogPayload
                );

                ActivityLog::log('created', "Farm created (wizard): {$farm->name}", $farm, null, $farm->toArray());
            });

            $emailSent = $ownerManager
                ? app(UserWelcomeEmailService::class)->send($ownerManager, $ownerUsername, $validated['password'])
                : false;

            $successMessage = UserWelcomeEmailService::successMessage(
                $emailSent,
                'Farm and owner/manager login created successfully.'
            );

            return redirect()->route($this->indexRoute())
                ->with('success', $successMessage);
        } catch (\Throwable $e) {
            Log::error('Farm setup wizard failed', [
                'message' => $e->getMessage(),
                'exception' => $e,
            ]);

            $msg = 'Failed to create farm. Please try again.';
            $sql = $e instanceof QueryException ? $e->getMessage() : '';

            if (config('app.debug')) {
                $msg = $e->getMessage();
            } elseif ($sql !== '') {
                if (str_contains($sql, 'farm_id') && str_contains($sql, 'Unknown column')) {
                    $msg = 'The database is missing the farm link on users. Run: php artisan migrate';
                } elseif (str_contains($sql, 'user_type') && (str_contains($sql, 'Data truncated') || str_contains($sql, 'truncated'))) {
                    $msg = 'The database user_type column does not allow owner_manager yet. Run: php artisan migrate';
                } elseif (str_contains($sql, 'foreign key constraint')) {
                    $msg = 'Database constraint failed while saving. Details are in storage/logs/laravel.log.';
                }
            }

            return redirect()->back()
                ->withErrors(['error' => $msg])
                ->withInput();
        }
    }

    /**
     * Update the specified farm.
     */
    public function update(Request $request, $id)
    {
        $farm = Farm::findOrFail($id);
        $oldValues = $farm->toArray();

        $request->validate([
            'name' => 'required|string|max:150',
            'registered_business_name' => 'nullable|string|max:255',
            'owner_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'contact_number' => 'nullable|string|max:30',
            'email' => 'nullable|string|email|max:255',
            'permits' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'banner' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'logo_url' => 'nullable|string|max:255',
            'banner_url' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'operating_days' => 'nullable|string|max:500',
            'operating_hours' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            $updateData = [
                'name' => $request->name,
                'registered_business_name' => $request->registered_business_name ?? null,
                'owner_name' => $request->owner_name ?? null,
                'description' => $request->description ?? null,
                'contact_number' => $request->filled('contact_number') ? $request->contact_number : null,
                'email' => $request->filled('email') ? $request->email : null,
                'permits' => $request->has('permits') ? $request->permits : $farm->permits,
                'address' => $request->has('address') ? $request->address : $farm->address,
                'city' => $request->has('city') ? $request->city : $farm->city,
                'province' => $request->has('province') ? $request->province : $farm->province,
                'postal_code' => $request->has('postal_code') ? $request->postal_code : $farm->postal_code,
                'operating_days' => $request->has('operating_days') ? $request->operating_days : $farm->operating_days,
                'operating_hours' => $request->has('operating_hours') ? $request->operating_hours : $farm->operating_hours,
                'status' => $request->status ?? $farm->status,
            ];

            if ($request->hasFile('logo')) {
                $updateData['logo_url'] = $this->storeFarmImage($request->file('logo'), 'logos');
            } elseif ($request->has('logo_url')) {
                $updateData['logo_url'] = $request->logo_url;
            }

            if ($request->hasFile('banner')) {
                $updateData['banner_url'] = $this->storeFarmImage($request->file('banner'), 'banners');
            } elseif ($request->has('banner_url')) {
                $updateData['banner_url'] = $request->banner_url;
            }

            $farm->update($updateData);

            ActivityLog::log('updated', "Farm updated: {$farm->name}", $farm, $oldValues, $farm->fresh()->toArray());

            return redirect()->route($this->indexRoute())
                ->with('success', 'Farm updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update farm. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Deactivate the specified farm.
     */
    public function destroy($id)
    {
        $farm = Farm::findOrFail($id);

        try {
            $farm->update([
                'status' => 'inactive',
            ]);

            ActivityLog::log('deactivated', "Farm deactivated: {$farm->name}", $farm, $farm->toArray(), null);

            return redirect()->route($this->indexRoute())
                ->with('success', 'Farm deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to deactivate farm. Please try again.']);
        }
    }

    private function indexRoute(): string
    {
        return auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.farms.index'
            : 'dashboard.super-admin.farms.index';
    }

    private function storeFarmImage(UploadedFile $file, string $folder): string
    {
        return $file->store("farms/{$folder}", 'public');
    }
}
