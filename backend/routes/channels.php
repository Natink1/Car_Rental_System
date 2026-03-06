<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('conversation.{id}', function ($user, string $id) {
    $conv = Conversation::with('participants')->find($id);
    if (! $conv) {
        return false;
    }

    return $conv->participants->contains('id', $user->id);
});
