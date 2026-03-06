<?php

namespace App\Http\Controllers\Api;

use App\Helpers\MediaUrlHelper;
use App\Http\Controllers\Controller;
use App\Models\Car;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCarController extends Controller
{
    public function pending(): JsonResponse
    {
        $cars = Car::with(['owner:id,name,email', 'media'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($car) {
                $media = $car->getMedia('car-images');
                return [
                    'id' => $car->id,
                    'brand' => $car->brand,
                    'model' => $car->model,
                    'year' => $car->year,
                    'transmission' => $car->transmission,
                    'fuel_type' => $car->fuel_type,
                    'seats' => $car->seats,
                    'price_per_day' => (float) $car->price_per_day,
                    'status' => $car->status,
                    'image' => MediaUrlHelper::fullUrl($media->first()),
                    'images' => $media->map(fn ($m) => MediaUrlHelper::fullUrl($m))->filter()->values()->all(),
                    'owner' => $car->owner ? [
                        'id' => $car->owner->id,
                        'name' => $car->owner->name,
                        'email' => $car->owner->email,
                    ] : null,
                ];
            });

        return response()->json($cars);
    }

    public function approve(string $id): JsonResponse
    {
        $car = Car::find($id);
        if (! $car) {
            return response()->json(['message' => 'Car not found'], 404);
        }
        if ($car->user_id === auth('api')->id()) {
            return response()->json(['message' => 'Owner cannot approve their own car.'], 403);
        }
        if ($car->status !== 'pending') {
            return response()->json(['message' => 'Car is not pending.'], 422);
        }

        $car->update(['status' => 'approved']);
        return response()->json(['message' => 'Car approved.', 'car' => $car->fresh()]);
    }

    public function reject(string $id): JsonResponse
    {
        $car = Car::find($id);
        if (! $car) {
            return response()->json(['message' => 'Car not found'], 404);
        }
        if ($car->user_id === auth('api')->id()) {
            return response()->json(['message' => 'Owner cannot reject their own car.'], 403);
        }
        if ($car->status !== 'pending') {
            return response()->json(['message' => 'Car is not pending.'], 422);
        }

        $car->update(['status' => 'rejected']);
        return response()->json(['message' => 'Car rejected.', 'car' => $car->fresh()]);
    }
}
