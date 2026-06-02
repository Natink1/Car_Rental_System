<?php

namespace App\Http\Controllers\Api;

use App\Helpers\MediaUrlHelper;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Car;
use App\Services\NotificationEmailService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        if ($user->isAdmin()) {
            $query = Booking::with(['user:id,name,email', 'car.media', 'car.owner:id,name,email', 'payments']);
            if ($request->filled('owner_id')) {
                $ownerId = $request->query('owner_id');
                $query->whereHas('car', fn($q) => $q->where('user_id', $ownerId));
            }
        } elseif ($user->isOwner()) {
            $query = Booking::with(['user:id,name,email', 'car.media', 'payments'])
                ->whereHas('car', fn($q) => $q->where('user_id', $user->id));
        } else {
            $query = Booking::with(['car.media', 'car.owner:id,name,email', 'payments'])->where('user_id', $user->id);
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->whereHas('car', function ($carQuery) use ($search) {
                    $carQuery->where('brand', 'like', "%{$search}%")
                        ->orWhere('model', 'like', "%{$search}%")
                        ->orWhereHas('owner', function ($ownerQuery) use ($search) {
                            $ownerQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                })->orWhereHas('user', function ($userQuery) use ($search) {
                    $userQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });
        }

        $bookings = $query->orderBy('created_at', 'desc')->get()->map(fn($b) => $this->formatBooking($b));

        return response()->json($bookings);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Admin cannot book cars.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'car_id' => ['required', 'uuid', 'exists:cars,id'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $car = Car::find($request->car_id);
        if (! $car || $car->status !== 'approved') {
            return response()->json(['message' => 'Car not available for booking.'], 422);
        }

        $start = Carbon::parse($request->start_date);
        $end = Carbon::parse($request->end_date);

        $overlap = Booking::where('car_id', $car->id)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_date', [$start, $end])
                    ->orWhereBetween('end_date', [$start, $end])
                    ->orWhere(fn($q2) => $q2->where('start_date', '<=', $start)->where('end_date', '>=', $end));
            })
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'This car is already booked for the selected dates.',
                'errors' => ['dates' => ['Date conflict with existing booking.']],
            ], 422);
        }

        $days = $start->diffInDays($end) + 1;
        $totalPrice = $days * (float) $car->price_per_day;

        $booking = Booking::create([
            'user_id' => $user->id,
            'car_id' => $car->id,
            'start_date' => $start,
            'end_date' => $end,
            'total_price' => $totalPrice,
            'status' => 'pending',
        ]);

        $booking->load(['car.media', 'car.owner:id,name,email', 'user:id,name,email']);
        app(NotificationEmailService::class)->notifyOwnerBookingNeedsApproval($booking);

        return response()->json($this->formatBooking($booking), 201);
    }

    public function show(string $id): JsonResponse
    {
        $booking = Booking::with(['car.media', 'user:id,name,email', 'payments'])->find($id);
        if (! $booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $user = auth('api')->user();
        $canView = $user->isAdmin()
            || $booking->user_id === $user->id
            || ($user->isOwner() && $booking->car->user_id === $user->id);

        if (! $canView) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($this->formatBooking($booking));
    }

    public function cancel(string $id): JsonResponse
    {
        $booking = Booking::with('car')->find($id);
        if (! $booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $user = auth('api')->user();
        $canCancel = $user->isAdmin()
            || $booking->user_id === $user->id
            || ($user->isOwner() && $booking->car->user_id === $user->id);

        if (! $canCancel) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if (! in_array($booking->status, ['pending', 'approved'], true)) {
            return response()->json(['message' => 'Booking cannot be cancelled.'], 422);
        }

        $hasCompletedPayment = $booking->payments()->where('payment_status', 'completed')->exists();
        if ($hasCompletedPayment) {
            return response()->json(['message' => 'Booking has completed payment and cannot be cancelled.'], 422);
        }

        $booking->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Booking cancelled.', 'booking' => $this->formatBooking($booking->fresh(['car.media']))]);
    }

    public function approve(string $id): JsonResponse
    {
        $booking = Booking::with(['car', 'user:id,name,email'])->find($id);
        if (! $booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $user = auth('api')->user();
        if (! $user->isOwner() && ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Admin cannot manage booking approval.'], 403);
        }
        if ($booking->car->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Booking is not pending.'], 422);
        }

        $booking->update(['status' => 'approved']);

        // Payment is recorded when the customer completes payment via Chapa (PaymentController::chapaCallback).
        app(NotificationEmailService::class)->notifyCustomerPaymentRequired($booking->fresh(['car', 'user:id,name,email']));

        return response()->json(['message' => 'Booking approved.', 'booking' => $this->formatBooking($booking->fresh(['car.media', 'payments']))]);
    }

    public function reject(string $id): JsonResponse
    {
        $booking = Booking::with('car')->find($id);
        if (! $booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $user = auth('api')->user();
        if (! $user->isOwner()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($booking->car->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Booking is not pending.'], 422);
        }

        $booking->update(['status' => 'rejected']);

        return response()->json(['message' => 'Booking rejected.', 'booking' => $this->formatBooking($booking->fresh(['car.media']))]);
    }

    private function formatBooking(Booking $booking): array
    {
        $car = $booking->car;
        $firstImage = $car && $car->relationLoaded('media') ? MediaUrlHelper::fullUrl($car->getFirstMedia('car-images')) : null;

        return [
            'id' => $booking->id,
            'user_id' => $booking->user_id,
            'car_id' => $booking->car_id,
            'start_date' => $booking->start_date?->format('Y-m-d'),
            'end_date' => $booking->end_date?->format('Y-m-d'),
            'total_price' => (float) $booking->total_price,
            'status' => $booking->status,
            'car' => $car ? [
                'id' => $car->id,
                'brand' => $car->brand,
                'model' => $car->model,
                'image' => $firstImage,
                'owner' => $car->relationLoaded('owner') && $car->owner ? [
                    'id' => $car->owner->id,
                    'name' => $car->owner->name,
                    'email' => $car->owner->email,
                ] : null,
            ] : null,
            'user' => $booking->relationLoaded('user') ? $booking->user : null,
            'payments' => $booking->relationLoaded('payments') ? $booking->payments : null,
            'created_at' => $booking->created_at?->toIso8601String(),
        ];
    }
}
