<?php

namespace App\Policies;

use App\Models\BreederPost;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BreederPostPolicy
{
    public function create(User $user): bool
    {
        return $user->isActive() && $user->user_type === User::TYPE_BREEDER;
    }

    public function view(User $user, BreederPost $post): Response
    {
        return $user->isActive() && ((int) $post->breeder_id === (int) $user->id || $post->isPubliclyVisible())
            ? Response::allow() : Response::denyAsNotFound();
    }

    public function update(User $user, BreederPost $post): bool
    {
        return $this->create($user) && (int) $post->breeder_id === (int) $user->id;
    }

    public function delete(User $user, BreederPost $post): bool
    {
        return $user->isActive() && ((int) $post->breeder_id === (int) $user->id
            || in_array($user->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true));
    }
}
