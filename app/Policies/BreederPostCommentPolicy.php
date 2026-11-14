<?php

namespace App\Policies;

use App\Models\BreederPostComment;
use App\Models\User;

class BreederPostCommentPolicy
{
    public function update(User $user, BreederPostComment $comment): bool
    {
        return $user->isActive() && (int) $comment->user_id === (int) $user->id;
    }

    public function delete(User $user, BreederPostComment $comment): bool
    {
        return $user->isActive() && ($this->update($user, $comment)
            || in_array($user->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true));
    }
}
