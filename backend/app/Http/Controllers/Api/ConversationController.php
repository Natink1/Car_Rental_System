<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ConversationController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth('api')->user();
        $conversations = $user->conversations()
            ->with(['participants:id,name,email,role', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->get();

        $list = $conversations->map(function ($conv) use ($user) {
            $other = $conv->participants->first(fn ($p) => $p->id !== $user->id);
            $lastMessage = $conv->messages->first();
            $unread = Message::where('conversation_id', $conv->id)
                ->where('user_id', '!=', $user->id)
                ->whereNull('read_at')
                ->count();

            return [
                'id' => $conv->id,
                'other' => $other ? ['id' => $other->id, 'name' => $other->name, 'email' => $other->email, 'role' => $other->role] : null,
                'last_message' => $lastMessage ? [
                    'body' => \Str::limit($lastMessage->body, 50),
                    'created_at' => $lastMessage->created_at?->toIso8601String(),
                ] : null,
                'unread_count' => $unread,
            ];
        });

        return response()->json($list);
    }

    public function getOrCreate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => ['required', 'uuid', 'exists:users,id'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $otherUserId = $request->user_id;
        $currentUserId = auth('api')->id();
        if ($otherUserId === $currentUserId) {
            return response()->json(['message' => 'Cannot start conversation with yourself.'], 422);
        }

        $conversation = Conversation::whereHas('participants', fn ($q) => $q->where('user_id', $currentUserId))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $otherUserId))
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create();
            $conversation->participants()->attach([$currentUserId, $otherUserId]);
        }

        $conversation->load('participants:id,name,email,role');
        return response()->json([
            'id' => $conversation->id,
            'participants' => $conversation->participants,
        ], $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function show(string $id): JsonResponse
    {
        $conv = Conversation::with('participants:id,name,email,role')->find($id);
        if (! $conv) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }
        $user = auth('api')->user();
        if (! $conv->participants->contains('id', $user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'id' => $conv->id,
            'participants' => $conv->participants,
        ]);
    }

    /**
     * Mark all messages in this conversation (sent by others to me) as read.
     */
    public function markRead(string $id): JsonResponse
    {
        $conv = Conversation::with('participants')->find($id);
        if (! $conv) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }
        $user = auth('api')->user();
        if (! $conv->participants->contains('id', $user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        Message::where('conversation_id', $conv->id)
            ->where('user_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }
}
