<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    public function index(string $conversationId): JsonResponse
    {
        $conv = Conversation::with('participants')->find($conversationId);
        if (! $conv) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        $user = auth('api')->user();
        if (! $conv->participants->contains('id', $user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $messages = Message::with('user:id,name,email,role')
            ->where('conversation_id', $conversationId)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'body' => $m->body,
                'user_id' => $m->user_id,
                'user' => $m->user,
                'read_at' => $m->read_at?->toIso8601String(),
                'created_at' => $m->created_at?->toIso8601String(),
                'is_mine' => $m->user_id === $user->id,
            ]);

        return response()->json($messages);
    }

    public function store(Request $request, string $conversationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'body' => ['required', 'string', 'max:5000'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $conv = Conversation::with('participants')->find($conversationId);
        if (! $conv) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        $user = auth('api')->user();
        if (! $conv->participants->contains('id', $user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $message = Message::create([
            'conversation_id' => $conv->id,
            'user_id' => $user->id,
            'body' => $request->body,
        ]);

        $message->load('user:id,name,email,role');
        event(new MessageSent($message));
        return response()->json([
            'id' => $message->id,
            'body' => $message->body,
            'user_id' => $message->user_id,
            'user' => $message->user,
            'read_at' => $message->read_at?->toIso8601String(),
            'created_at' => $message->created_at?->toIso8601String(),
            'is_mine' => true,
        ], 201);
    }

    public function markRead(string $id): JsonResponse
    {
        $message = Message::find($id);
        if (! $message) {
            return response()->json(['message' => 'Message not found'], 404);
        }

        $user = auth('api')->user();
        if ($message->user_id === $user->id) {
            return response()->json($message);
        }

        $conv = $message->conversation;
        if (! $conv->participants->contains('id', $user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $message->update(['read_at' => now()]);
        return response()->json($message);
    }
}
