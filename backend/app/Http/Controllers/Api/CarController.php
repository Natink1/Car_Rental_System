<?php

namespace App\Http\Controllers\Api;

use App\Helpers\MediaUrlHelper;
use App\Http\Controllers\Controller;
use App\Models\Car;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Car::with(['owner:id,name,email', 'media'])
            ->where('status', 'approved');

        $q = $request->input('q');
        if ($q && is_string($q)) {
            $query->where(function ($qb) use ($q) {
                $qb->where('brand', 'like', '%' . $q . '%')
                    ->orWhere('model', 'like', '%' . $q . '%');
            });
        }
        if ($request->filled('brand')) {
            $query->where('brand', 'like', '%' . $request->brand . '%');
        }
        if ($request->filled('min_price')) {
            $query->where('price_per_day', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price_per_day', '<=', $request->max_price);
        }
        if ($request->filled('transmission')) {
            $query->where('transmission', $request->transmission);
        }
        if ($request->filled('fuel_type')) {
            $query->where('fuel_type', $request->fuel_type);
        }
        if ($request->filled('seats')) {
            $query->where('seats', '>=', $request->seats);
        }
        if ($request->has('featured') && $request->boolean('featured')) {
            $cars = $query->inRandomOrder()->limit(6)->get();
            $cars = $cars->map(fn ($car) => $this->formatCar($car));
            return response()->json($cars);
        }

        $cars = $query->orderBy('created_at', 'desc')->paginate(6);

        $cars->getCollection()->transform(function ($car) {
            return $this->formatCar($car);
        });

        return response()->json($cars);
    }

    public function show(string $id): JsonResponse
    {
        $car = Car::with(['owner:id,name,email', 'media', 'reviews.user:id,name'])
            ->find($id);

        if (! $car) {
            return response()->json(['message' => 'Car not found'], 404);
        }

        $user = auth('api')->user();
        if (! $user) {
            if ($car->status !== 'approved') {
                return response()->json(['message' => 'Car not found'], 404);
            }
        } elseif (! $user->isAdmin()) {
            if ($car->status !== 'approved' && $car->user_id !== $user->id) {
                return response()->json(['message' => 'Car not found'], 404);
            }
        }

        $forOwner = $user && $car->user_id === $user->id;
        return response()->json($this->formatCar($car, $forOwner));
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'brand' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:2100'],
            'transmission' => ['required', 'in:automatic,manual'],
            'fuel_type' => ['required', 'in:petrol,diesel,electric,hybrid'],
            'seats' => ['required', 'integer', 'min:1', 'max:20'],
            'price_per_day' => ['required', 'numeric', 'min:0'],
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ], [
            'images.required' => 'At least one image is required.',
            'images.min' => 'At least one image is required.',
            'images.*.mimes' => 'Each image must be jpg, png or jpeg.',
            'images.*.max' => 'Each image must not exceed 2MB.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $car = Car::create([
            'user_id' => auth('api')->id(),
            'brand' => $request->brand,
            'model' => $request->model,
            'year' => $request->year,
            'transmission' => $request->transmission,
            'fuel_type' => $request->fuel_type,
            'seats' => $request->seats,
            'price_per_day' => $request->price_per_day,
            'status' => 'pending',
        ]);

        $files = $request->file('images');
        if (is_array($files)) {
            foreach ($files as $image) {
                if ($image && $image->isValid()) {
                    $car->addMedia($image)->toMediaCollection('car-images', 'public');
                }
            }
        }

        $car->load(['owner:id,name,email', 'media']);
        return response()->json($this->formatCar($car), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $car = Car::find($id);
        if (! $car || $car->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Car not found'], 404);
        }

        if ($car->hasActiveOrUpcomingBooking()) {
            return response()->json(['message' => 'Cannot edit car that is currently rented or has upcoming bookings.'], 422);
        }

        $rules = [
            'brand' => ['sometimes', 'string', 'max:100'],
            'model' => ['sometimes', 'string', 'max:100'],
            'year' => ['sometimes', 'integer', 'min:1900', 'max:2100'],
            'transmission' => ['sometimes', 'in:automatic,manual'],
            'fuel_type' => ['sometimes', 'in:petrol,diesel,electric,hybrid'],
            'seats' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'price_per_day' => ['sometimes', 'numeric', 'min:0'],
            'images' => ['sometimes', 'array'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png', 'max:2048'],
            'remove_media_ids' => ['sometimes', 'array'],
            'remove_media_ids.*' => ['integer'],
            'replace_images' => ['sometimes', 'boolean'],
        ];

        $validator = Validator::make($request->all(), $rules, [
            'images.*.mimes' => 'Each image must be jpg, png or jpeg.',
            'images.*.max' => 'Each image must not exceed 2MB.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $car->fill($request->only([
            'brand', 'model', 'year', 'transmission', 'fuel_type', 'seats', 'price_per_day',
        ]));
        $car->save();

        $removeIds = $request->input('remove_media_ids', []);
        if (is_array($removeIds) && count($removeIds) > 0) {
            $car->media()->whereIn('id', array_map('intval', $removeIds))->get()->each(fn ($m) => $m->delete());
        }

        if ($request->hasFile('images')) {
            $newFiles = $request->file('images');
            if (is_array($newFiles) && count($newFiles) > 0) {
                $replaceAll = $request->boolean('replace_images');
                if ($replaceAll) {
                    $car->clearMediaCollection('car-images');
                }
                foreach ($newFiles as $image) {
                    if ($image && $image->isValid()) {
                        $car->addMedia($image)->toMediaCollection('car-images', 'public');
                    }
                }
            }
        }

        $car->load(['owner:id,name,email', 'media']);
        return response()->json($this->formatCar($car));
    }

    public function destroy(string $id): JsonResponse
    {
        $car = Car::find($id);
        if (! $car || $car->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Car not found'], 404);
        }

        if ($car->hasActiveOrUpcomingBooking()) {
            return response()->json(['message' => 'Cannot delete car that is currently rented or has upcoming bookings.'], 422);
        }

        $car->delete();
        return response()->json(['message' => 'Car deleted.']);
    }

    public function myCars(): JsonResponse
    {
        $cars = Car::with(['media'])
            ->where('user_id', auth('api')->id())
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($car) => $this->formatCar($car, true));

        return response()->json($cars);
    }

    private function formatCar(Car $car, bool $forOwner = false): array
    {
        $media = $car->getMedia('car-images');
        $images = $media->map(fn ($m) => MediaUrlHelper::fullUrl($m))->filter()->values()->all();
        $firstImage = MediaUrlHelper::fullUrl($media->first());

        $data = [
            'id' => $car->id,
            'user_id' => $car->user_id,
            'brand' => $car->brand,
            'model' => $car->model,
            'year' => $car->year,
            'transmission' => $car->transmission,
            'fuel_type' => $car->fuel_type,
            'seats' => $car->seats,
            'price_per_day' => (float) $car->price_per_day,
            'status' => $car->status,
            'image' => $firstImage,
            'images' => $images,
            'owner' => $car->relationLoaded('owner') ? $car->owner : null,
            'reviews' => $car->relationLoaded('reviews') ? $car->reviews : null,
            'created_at' => $car->created_at?->toIso8601String(),
            'updated_at' => $car->updated_at?->toIso8601String(),
        ];

        if ($forOwner) {
            $data['can_owner_edit'] = ! $car->hasActiveOrUpcomingBooking();
            $data['media'] = $media->map(fn ($m) => ['id' => $m->id, 'url' => MediaUrlHelper::fullUrl($m)])->values()->all();
        }

        return $data;
    }
}
