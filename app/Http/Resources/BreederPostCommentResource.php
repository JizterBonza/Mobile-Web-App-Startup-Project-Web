<?php

namespace App\Http\Resources;

use App\Support\BreederFeedIdentity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class BreederPostCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'post_id' => $this->breeder_post_id,
            'author' => BreederFeedIdentity::author($this->author),
            'body' => $this->body,
            'created_at' => $this->created_at?->utc()->toISOString(),
            'updated_at' => $this->updated_at?->utc()->toISOString(),
            'can_edit' => Gate::forUser($request->user())->allows('update', $this->resource),
            'can_delete' => Gate::forUser($request->user())->allows('delete', $this->resource),
        ];
    }
}
