<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Gamefarm;
use App\Models\User;
use App\Models\UserCredential;
use App\Models\UserDetail;
use App\Models\Zone;
use App\Services\UserWelcomeEmailService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BreederController extends Controller
{
    /**
     * Four-step breeder and gamefarm registration wizard.
     */
    public function create()
    {
        $zones = Zone::where('status', true)->orderBy('name')->get()
            ->map(fn ($z) => [
                'id' => $z->id,
                'name' => $z->name,
                'boundary' => $z->boundary,
            ]);

        return Inertia::render('Dashboard/RegisterBreeder', [
            'zones' => $zones,
        ]);
    }

    /**
     * Create the breeder login and its gamefarm.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:user_details,email',
            'password' => 'required|string|min:6|confirmed',
            'phone_number' => 'required|string|max:30',
            'gamefarm_name' => 'required|string|max:150',
            'bloodlines' => 'nullable|string|max:5000',
            'logo' => 'nullable|file|mimes:jpeg,jpg,png|max:5120',
            'membership_certificate' => 'nullable|file|mimes:jpeg,jpg,png|max:5120',
            'facility_images' => 'required|array|min:1|max:5',
            'facility_images.*' => 'required|file|mimes:jpeg,jpg,png|max:5120',
            'primary_facility_index' => 'required|integer|min:0',
            'street' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'province' => 'required|string|max:100',
            'zip_code' => 'required|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $facilityFiles = array_values($request->file('facility_images', []));
        $primary = (int) $validated['primary_facility_index'];
        if ($primary >= count($facilityFiles)) {
            throw ValidationException::withMessages([
                'primary_facility_index' => 'Select a primary facility image.',
            ]);
        }

        $breeder = null;
        $username = null;

        try {
            DB::transaction(function () use ($request, $validated, $facilityFiles, $primary, &$breeder, &$username) {
                $logoPath = $request->hasFile('logo')
                    ? $request->file('logo')->store('gamefarms/logos', 'public')
                    : null;
                $certificatePath = $request->hasFile('membership_certificate')
                    ? $request->file('membership_certificate')->store('gamefarms/certificates', 'public')
                    : null;

                $facilityPaths = [];
                foreach ($facilityFiles as $file) {
                    $facilityPaths[] = $file->store('gamefarms/facilities', 'public');
                }

                $username = explode('@', $validated['email'])[0].'_'.time();

                $detail = UserDetail::create([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'email' => $validated['email'],
                    'mobile_number' => $validated['phone_number'],
                ]);

                $credential = UserCredential::create([
                    'username' => $username,
                    'password_hash' => Hash::make($validated['password']),
                ]);

                $breeder = User::create([
                    'user_detail_id' => $detail->id,
                    'user_credential_id' => $credential->id,
                    'status' => 'active',
                    'user_type' => User::TYPE_BREEDER,
                ]);

                $lat = $request->filled('latitude') ? (float) $request->latitude : null;
                $lng = $request->filled('longitude') ? (float) $request->longitude : null;

                $gamefarm = Gamefarm::create([
                    'user_id' => $breeder->id,
                    'name' => $validated['gamefarm_name'],
                    'bloodlines' => $validated['bloodlines'] ?? null,
                    'logo_path' => $logoPath,
                    'membership_certificate_path' => $certificatePath,
                    'facility_images' => $facilityPaths,
                    'primary_facility_index' => $primary,
                    'street' => $validated['street'],
                    'barangay' => $validated['barangay'],
                    'city' => $validated['city'],
                    'province' => $validated['province'],
                    'postal_code' => $validated['zip_code'],
                    'latitude' => $lat,
                    'longitude' => $lng,
                ]);

                $breeder->load(['userDetail', 'userCredential']);
                $logPayload = $breeder->toArray();
                if (isset($logPayload['user_credential'])) {
                    $logPayload['user_credential'] = array_diff_key($logPayload['user_credential'], ['password_hash' => 1]);
                }

                ActivityLog::log(
                    'created',
                    "Breeder created: {$validated['email']}",
                    $breeder,
                    null,
                    $logPayload
                );
                ActivityLog::log(
                    'created',
                    "Gamefarm created for breeder {$validated['email']}: {$gamefarm->name}",
                    $gamefarm,
                    null,
                    $gamefarm->toArray()
                );
            });

            $emailSent = $breeder instanceof User && is_string($username)
                ? app(UserWelcomeEmailService::class)->send($breeder, $username, $validated['password'])
                : false;

            $successMessage = UserWelcomeEmailService::successMessage(
                $emailSent,
                'Breeder and gamefarm registered successfully.'
            );

            return redirect()->route($this->accountsRoute())
                ->with('success', $successMessage);
        } catch (\Throwable $e) {
            Log::error('Breeder registration failed', [
                'message' => $e->getMessage(),
                'exception' => $e,
            ]);

            $msg = 'Failed to register the breeder. Please try again.';
            $sql = $e instanceof QueryException ? $e->getMessage() : '';

            if (config('app.debug')) {
                $msg = $e->getMessage();
            } elseif ($sql !== '' && str_contains($sql, 'user_type') && (str_contains($sql, 'Data truncated') || str_contains($sql, 'truncated'))) {
                $msg = 'The database user_type column does not allow breeder yet. Run: php artisan migrate';
            }

            return redirect()->back()
                ->withErrors(['error' => $msg])
                ->withInput();
        }
    }

    private function accountsRoute(): string
    {
        $actor = request()->user();

        return $actor instanceof User && $actor->user_type === User::TYPE_ADMIN
            ? 'dashboard.admin.users.index'
            : 'dashboard.super-admin.users.index';
    }
}
