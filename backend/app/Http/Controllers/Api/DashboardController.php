<?php

namespace App\Http\Controllers\Api;

use App\Helpers\MediaUrlHelper;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Car;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function admin(): JsonResponse
    {
        $totalUsers = User::count();
        $totalCars = Car::count();
        $pendingCars = Car::where('status', 'pending')->count();
        $totalBookings = Booking::count();
        $totalRevenue = Payment::where('payment_status', 'completed')->sum('amount');

        return response()->json([
            'total_users' => $totalUsers,
            'total_cars' => $totalCars,
            'pending_approvals' => $pendingCars,
            'total_bookings' => $totalBookings,
            'total_revenue' => (float) $totalRevenue,
        ]);
    }

    public function owner(): JsonResponse
    {
        $user = auth('api')->user();
        $cars = Car::with('media')->where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
        $carIds = $cars->pluck('id');

        $activeBookings = Booking::with(['car.media', 'user:id,name,email', 'payments'])
            ->whereIn('car_id', $carIds)
            ->whereIn('status', ['pending', 'approved'])
            ->where('end_date', '>=', now()->toDateString())
            ->orderBy('start_date')
            ->get()
            ->map(function ($b) {
                if ($b->car) {
                    $b->car->image = MediaUrlHelper::fullUrl($b->car->getFirstMedia('car-images'));
                }
                return $b;
            });

        $earnings = Payment::whereHas('booking', fn ($q) => $q->whereIn('car_id', $carIds))
            ->where('payment_status', 'completed')
            ->sum('amount');

        $formatCar = function ($car) {
            $media = $car->getMedia('car-images');
            return [
                'id' => $car->id,
                'brand' => $car->brand,
                'model' => $car->model,
                'status' => $car->status,
                'image' => MediaUrlHelper::fullUrl($media->first()),
                'can_owner_edit' => ! $car->hasActiveOrUpcomingBooking(),
            ];
        };

        $carsApproved = $cars->where('status', 'approved')->map($formatCar)->values()->all();
        $carsPending = $cars->whereIn('status', ['pending', 'rejected'])->map($formatCar)->values()->all();
        $rejectedCount = $cars->where('status', 'rejected')->count();

        return response()->json([
            'cars' => $cars->map($formatCar)->values()->all(),
            'cars_approved' => $carsApproved,
            'cars_pending' => $carsPending,
            'active_bookings' => $activeBookings,
            'earnings' => (float) $earnings,
            'rejected_count' => $rejectedCount,
        ]);
    }

    public function customer(): JsonResponse
    {
        $user = auth('api')->user();
        $activeBookings = Booking::with(['car.media', 'car.owner:id,name,email', 'payments'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where('end_date', '>=', now()->toDateString())
            ->orderBy('start_date')
            ->get()
            ->map(fn ($b) => $this->formatBookingForDashboard($b));

        $history = Booking::with(['car.media', 'car.owner:id,name,email', 'payments'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($b) => $this->formatBookingForDashboard($b));

        return response()->json([
            'active_bookings' => $activeBookings->values()->all(),
            'booking_history' => $history->values()->all(),
        ]);
    }

    private function formatBookingForDashboard(Booking $booking): array
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
            'payments' => $booking->relationLoaded('payments') ? $booking->payments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_status' => $p->payment_status,
                'transaction_reference' => $p->transaction_reference,
                'created_at' => $p->created_at?->toIso8601String(),
            ])->values()->all() : [],
        ];
    }
}
