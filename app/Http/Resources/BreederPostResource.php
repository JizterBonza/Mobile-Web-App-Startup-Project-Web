<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\BreederFeedIdentity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class BreederPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $visible = $this->resource->isPubliclyVisible();

        return [
            'id' => $this->id,
            'author' => [
                ...BreederFeedIdentity::author($this->author),
                'is_following' => (bool) $this->author->is_following,
                'can_follow' => (int) $viewer->id !== (int) $this->author->id
                    && $this->author->isActive() && $this->author->user_type === User::TYPE_BREEDER,
            ],
            'title' => $this->title,
            'body' => $this->body,
            'status' => $this->status,
            'published_at' => $this->published_at?->utc()->toISOString(),
            'updated_at' => $this->updated_at?->utc()->toISOString(),
            'images' => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => BreederFeedIdentity::url($image->path),
                'position' => $image->position,
            ])->values()->all(),
            'likes_count' => (int) $this->likes_count,
            'comments_count' => (int) $this->comments_count,
            'is_liked' => (bool) $this->is_liked,
            'can_edit' => Gate::forUser($viewer)->allows('update', $this->resource),
            'can_delete' => Gate::forUser($viewer)->allows('delete', $this->resource),
            'can_like' => $visible,
            'can_comment' => $visible,
        ];
    }
}
