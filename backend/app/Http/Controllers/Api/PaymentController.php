<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Initialize a Chapa transaction for a booking. Returns checkout_url for redirect.
     * See https://developer.chapa.co/integrations/accept-payments
     */
    public function initializeChapa(Request $request, string $bookingId): JsonResponse
    {
        $booking = Booking::with('car')->find($bookingId);
        if (! $booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }
        if ($booking->user_id !== auth('api')->id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($booking->status !== 'approved') {
            return response()->json(['message' => 'Payment is only available after the booking is approved.'], 422);
        }

        $existing = $booking->payments()->where('payment_status', 'completed')->exists();
        if ($existing) {
            return response()->json(['message' => 'Payment already completed for this booking.'], 422);
        }

        $secret = config('services.chapa.secret');
        if (! $secret) {
            return response()->json(['message' => 'Chapa is not configured. Set CHAPA_SECRET in .env.'], 503);
        }

        $user = auth('api')->user();
        $nameParts = preg_split('/\s+/', trim($user->name ?? 'Customer'), 2);
        $firstName = $nameParts[0] ?? 'Customer';
        $lastName = $nameParts[1] ?? '';

        // Chapa: tx_ref max 50 chars; description max 50 chars, only letters, numbers, hyphens, underscores, spaces, dots
        $txRef = 'bk' . strtolower(Str::random(16));
        Cache::put('chapa_tx_' . $txRef, $booking->id, now()->addHours(2));

        $baseUrl = rtrim(config('app.url'), '/');
        $callbackUrl = $baseUrl . '/api/payments/chapa-callback';
        $payload = [
            'amount' => (string) round((float) $booking->total_price, 2),
            'currency' => config('services.chapa.currency', 'ETB'),
            'email' => $user->email ?? 'customer@example.com',
            'first_name' => $firstName,
            'last_name' => $lastName,
            'tx_ref' => $txRef,
            'callback_url' => $callbackUrl,
            'customization' => [
                'title' => 'Booking payment',
                'description' => 'Car rental booking',
            ],
        ];

        try {
            $response = Http::withToken($secret)
                ->acceptJson()
                ->post(config('services.chapa.base_url') . '/transaction/initialize', $payload);

            $data = $response->json();
            if (! $response->successful() || empty($data['data']['checkout_url'])) {
                return response()->json([
                    'message' => $data['message'] ?? 'Could not initialize payment.',
                ], $response->status() ?: 502);
            }

            return response()->json([
                'checkout_url' => $data['data']['checkout_url'],
                'tx_ref' => $txRef,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Could not initialize payment.', 'error' => $e->getMessage()], 502);
        }
    }

    /**
     * Chapa callback: GET with trx_ref, ref_id, status. Verify with Chapa then record payment.
     * See https://developer.chapa.co/integrations/verify-payments
     */
    public function chapaCallback(Request $request): JsonResponse
    {
        $txRef = $request->query('trx_ref') ?? $request->query('tx_ref');
        $refId = $request->query('ref_id');

        if (! $txRef) {
            return response()->json(['message' => 'Missing tx_ref'], 400);
        }

        $booking = $this->resolveBookingByTxRef($txRef);
        if (! $booking) {
            return response()->json(['message' => 'Invalid or expired tx_ref'], 400);
        }

        return $this->verifyAndRecordChapaPayment($booking, $txRef, $refId);
    }

    /**
     * Frontend-triggered verification. Useful in local development where Chapa cannot call localhost callback URLs.
     */
    public function verifyChapa(Request $request): JsonResponse
    {
        $request->validate([
            'tx_ref' => 'required|string',
            'ref_id' => 'nullable|string',
        ]);

        $txRef = $request->input('tx_ref');
        $refId = $request->input('ref_id');
        $booking = $this->resolveBookingByTxRef($txRef);
        if (! $booking) {
            return response()->json(['message' => 'Invalid or expired tx_ref'], 400);
        }

        $user = auth('api')->user();
        $canVerify = $user->isAdmin()
            || $booking->user_id === $user->id
            || ($user->isOwner() && optional($booking->car)->user_id === $user->id);

        if (! $canVerify) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $this->verifyAndRecordChapaPayment($booking, $txRef, $refId);
    }

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
     * Simulate payment completion for a booking (testing).
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

    private function resolveBookingByTxRef(string $txRef): ?Booking
    {
        $bookingId = Cache::get('chapa_tx_' . $txRef);
        if (! $bookingId) {
            return null;
        }

        return Booking::with('car')->find($bookingId);
    }

    private function verifyAndRecordChapaPayment(Booking $booking, string $txRef, ?string $refId = null): JsonResponse
    {
        $secret = config('services.chapa.secret');
        if (! $secret) {
            return response()->json(['message' => 'Chapa not configured'], 503);
        }

        try {
            $verifyResponse = Http::withToken($secret)
                ->get(config('services.chapa.base_url') . '/transaction/verify/' . $txRef);

            $data = $verifyResponse->json();
            $verifyData = $data['data'] ?? null;
            $verifyStatus = $verifyData['status'] ?? null;
            $receiptReference = $verifyData['reference'] ?? $refId ?? $txRef;

            if (! $verifyResponse->successful() || $verifyStatus !== 'success') {
                return response()->json([
                    'message' => 'Transaction not successful',
                    'status' => $verifyStatus ?? 'failed',
                ], 400);
            }

            $existing = $booking->payments()->where('payment_status', 'completed')->latest()->first();
            if ($existing) {
                if ($receiptReference && $existing->transaction_reference !== $receiptReference) {
                    $existing->update(['transaction_reference' => $receiptReference]);
                }
                return response()->json([
                    'message' => 'Payment already recorded.',
                    'status' => 'success',
                    'booking_id' => $booking->id,
                ]);
            }

            Payment::create([
                'booking_id' => $booking->id,
                'amount' => $booking->total_price,
                'payment_status' => 'completed',
                'transaction_reference' => $receiptReference,
            ]);

            Cache::forget('chapa_tx_' . $txRef);

            return response()->json([
                'message' => 'Payment confirmed.',
                'status' => 'success',
                'booking_id' => $booking->id,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Could not verify payment.', 'error' => $e->getMessage()], 502);
        }
    }
}
