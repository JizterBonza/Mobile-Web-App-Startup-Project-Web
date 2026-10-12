<?php

namespace App\Http\Requests;

use App\Models\AppRelease;
use App\Services\AppReleaseService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppReleaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->user_type === 'super_admin';
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'app_key' => $this->input('app_key') ?: AppRelease::DEFAULT_APP_KEY,
            'platform' => $this->input('platform') ?: AppRelease::DEFAULT_PLATFORM,
            'is_force_update' => $this->boolean('is_force_update'),
            'min_supported_version_code' => $this->filled('min_supported_version_code')
                ? $this->input('min_supported_version_code')
                : null,
        ]);
    }

    public function rules(): array
    {
        $maxVersionCode = app(AppReleaseService::class)
            ->maxVersionCode($this->input('app_key'), $this->input('platform'));

        return [
            // 153600 KB = 150 MB
            'apk' => ['required', 'file', 'extensions:apk', 'max:153600'],
            'app_key' => ['required', 'string', 'max:50'],
            'platform' => ['required', Rule::in(['android'])],
            'version_name' => ['required', 'string', 'max:30', 'regex:/^[0-9A-Za-z.\-+_]+$/'],
            'version_code' => [
                'required',
                'integer',
                'min:'.max(1, $maxVersionCode + 1),
                Rule::unique('app_releases', 'version_code')
                    ->where('app_key', $this->input('app_key'))
                    ->where('platform', $this->input('platform')),
            ],
            'release_notes' => ['required', 'string', 'max:5000'],
            'is_force_update' => ['boolean'],
            'min_supported_version_code' => ['nullable', 'integer', 'min:1', 'lte:version_code'],
            'channel' => ['required', Rule::in([AppRelease::CHANNEL_STAGING, AppRelease::CHANNEL_PRODUCTION])],
        ];
    }

    public function messages(): array
    {
        return [
            'apk.extensions' => 'Choose an Android package with the .apk extension.',
            'apk.max' => 'The APK must be 150 MB or smaller.',
            'version_code.min' => 'The build number must be higher than every previous build (:min or more).',
            'version_code.unique' => 'This build number has already been used.',
            'version_name.regex' => 'Use only letters, numbers, dots, dashes, plus signs and underscores.',
            'min_supported_version_code.lte' => 'The minimum supported build cannot be higher than this build.',
        ];
    }
}
