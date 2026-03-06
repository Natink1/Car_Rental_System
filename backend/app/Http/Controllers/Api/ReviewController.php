<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    public function index(string $carId): JsonResponse
    {
        $car = Car::find($carId);
        if (! $car) {
            return response()->json(['message' => 'Car not found'], 404);
        }
        if ($car->status !== 'approved') {
            return response()->json(['message' => 'Car not found'], 404);
        }

        $reviews = Review::with('user:id,name')
            ->where('car_id', $carId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'user' => $r->user,
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        return response()->json($reviews);
    }

    public function store(Request $request, string $carId): JsonResponse
    {
        $validator = Validator::make(array_merge($request->all(), ['car_id' => $carId]), [
            'car_id' => ['required', 'uuid', 'exists:cars,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $car = Car::find($carId);
        if (! $car || $car->status !== 'approved') {
            return response()->json(['message' => 'Car not found'], 404);
        }

        $exists = Review::where('car_id', $carId)->where('user_id', auth('api')->id())->exists();
        if ($exists) {
            return response()->json(['message' => 'You have already reviewed this car.'], 422);
        }

        $review = Review::create([
            'user_id' => auth('api')->id(),
            'car_id' => $carId,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        $review->load('user:id,name');
        return response()->json([
            'id' => $review->id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'user' => $review->user,
            'created_at' => $review->created_at?->toIso8601String(),
        ], 201);
    }
}
