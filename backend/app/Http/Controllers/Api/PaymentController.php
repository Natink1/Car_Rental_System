<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request, string $bookingId): JsonResponse
    {
        $booking = Booking::find($bookingId);
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

        $payments = $booking->payments()->orderBy('created_at', 'desc')->get();
        return response()->json($payments);
    }

    /**
     * Simulate payment completion for a booking.
     * TODO: Integrate real payment gateway here
     */
    public function simulate(Request $request, string $bookingId): JsonResponse
    {
        $booking = Booking::find($bookingId);
        if (! $booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }
        if ($booking->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($booking->status !== 'approved') {
            return response()->json(['message' => 'Booking must be approved first.'], 422);
        }

        $existing = $booking->payments()->where('payment_status', 'completed')->exists();
        if ($existing) {
            return response()->json(['message' => 'Payment already completed for this booking.'], 422);
        }

        // TODO: Integrate real payment gateway here
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => $booking->total_price,
            'payment_status' => 'completed',
            'transaction_reference' => 'SIM-' . strtoupper(uniqid()),
        ]);

        return response()->json([
            'message' => 'Payment simulated successfully.',
            'payment' => $payment,
        ], 201);
    }
}
