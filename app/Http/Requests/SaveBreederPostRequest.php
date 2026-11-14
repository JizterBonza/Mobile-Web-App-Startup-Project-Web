<?php

namespace App\Http\Requests;

use App\Models\BreederPost;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SaveBreederPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        $post = $this->route('post');

        return $post instanceof BreederPost
            ? Gate::allows('update', $post) : Gate::allows('create', BreederPost::class);
    }

    protected function prepareForValidation(): void
    {
        $values = [];
        foreach (['title', 'body'] as $field) {
            if (is_string($this->input($field))) {
                $values[$field] = trim($this->input($field));
            }
        }

        // Multipart clients can send "[]" to explicitly remove every image.
        if (is_string($this->input('keep_image_ids'))) {
            $ids = json_decode($this->input('keep_image_ids'), true);
            if (is_array($ids) && array_is_list($ids)) {
                $values['keep_image_ids'] = $ids;
            }
        }
        $this->merge($values);
    }

    public function rules(): array
    {
        $presence = $this->route('post') ? 'sometimes' : 'required';

        return [
            'title' => [$presence, 'required', 'string', 'max:255'],
            'body' => [$presence, 'required', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', Rule::in([BreederPost::STATUS_DRAFT, BreederPost::STATUS_PUBLISHED])],
            'images' => ['sometimes', 'array', 'max:'.BreederPost::MAX_IMAGES],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'keep_image_ids' => ['sometimes', 'array', 'max:'.BreederPost::MAX_IMAGES],
            'keep_image_ids.*' => ['required', 'integer', 'min:1', 'distinct'],
            'breeder_id' => ['prohibited'],
            'user_id' => ['prohibited'],
            'author' => ['prohibited'],
            'published_at' => ['prohibited'],
            'created_at' => ['prohibited'],
            'updated_at' => ['prohibited'],
            'deleted_at' => ['prohibited'],
            'likes_count' => ['prohibited'],
            'comments_count' => ['prohibited'],
            'path' => ['prohibited'],
        ];
    }
}
