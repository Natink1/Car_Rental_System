<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Car;
use App\Models\User;
use App\Notifications\CarRentalEmailNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Carbon\Carbon;

class NotificationEmailService
{
    public function notifyAdminsCarNeedsApproval(Car $car): void
    {
        $admins = User::where('role', 'admin')->whereNotNull('email')->get();

        $this->sendToMany($admins, new CarRentalEmailNotification(
            'New car listing needs approval',
            'Hello Admin,',
            [
                $this->carLabel($car) . ' was submitted for approval.',
                'Please review the pending approval list in the admin dashboard.',
            ],
        ));
    }

    public function notifyOwnerCarPendingApproval(Car $car): void
    {
        $car->loadMissing('owner');

        if (! $car->owner) {
            return;
        }

        $this->sendToUser($car->owner, new CarRentalEmailNotification(
            'Your car listing is pending approval',
            'Hello ' . $car->owner->name . ',',
            [
                $this->carLabel($car) . ' has been submitted successfully.',
                'Your listing is pending admin approval before customers can book it.',
            ],
        ));
    }

    public function notifyOwnerCarApproved(Car $car): void
    {
        $car->loadMissing('owner');

        if (! $car->owner) {
            return;
        }

        $this->sendToUser($car->owner, new CarRentalEmailNotification(
            'Your car listing is approved',
            'Hello ' . $car->owner->name . ',',
            [
                $this->carLabel($car) . ' has been approved and is now listed for customers.',
                'Customers can now view and book this car.',
            ],
        ));
    }

    public function notifyOwnerBookingNeedsApproval(Booking $booking): void
    {
        $booking->loadMissing(['car.owner', 'user']);

        if (! $booking->car?->owner) {
            return;
        }

        $this->sendToUser($booking->car->owner, new CarRentalEmailNotification(
            'Booking request pending approval',
            'Hello ' . $booking->car->owner->name . ',',
            [
                ($booking->user?->name ?? 'A customer') . ' requested to book ' . $this->carLabel($booking->car) . '.',
                'Rental dates: ' . $this->bookingDateRange($booking) . '.',
                'Please approve or reject this request from your owner dashboard.',
            ],
        ));
    }
    public function notifyCustomerPaymentRequired(Booking $booking): void
    {
        $booking->loadMissing(['car', 'user']);

        if (! $booking->user) {
            return;
        }

        $this->sendToUser($booking->user, new CarRentalEmailNotification(
            'Payment required for your booking',
            'Hello ' . $booking->user->name . ',',
            [
                'Your booking for ' . $this->carLabel($booking->car) . ' has been approved.',
                'Please complete payment to confirm the booking.',
                'Rental duration: ' . $this->bookingDaysLabel($booking),
                'Amount due: ' . number_format((float) $booking->total_price, 2) . ' ETB.',
            ],
        ));
    }

    public function notifyBookingSuccessful(Booking $booking): void
    {
        $booking->loadMissing(['car.owner', 'user']);

        $customer = $booking->user;
        $owner = $booking->car?->owner;

        if ($customer) {
            $this->sendToUser($customer, new CarRentalEmailNotification(
                'Booking successful',
                'Hello ' . $customer->name . ',',
                [
                    'Your booking for ' . $this->carLabel($booking->car) . ' is successful.',
                    'Rental dates: ' . $this->bookingDateRange($booking) . '.',
                    'Rental duration: ' . $this->bookingDaysLabel($booking),
                ],
            ));
        }

        if ($owner) {
            $this->sendToUser($owner, new CarRentalEmailNotification(
                'Booking successful',
                'Hello ' . $owner->name . ',',
                [
                    ($customer?->name ?? 'A customer') . ' completed payment for ' . $this->carLabel($booking->car) . '.',
                    'Rental dates: ' . $this->bookingDateRange($booking) . '.',
                ],
            ));
        }
    }

    private function sendToUser(User $user, CarRentalEmailNotification $notification): void
    {
        if (! $user->email) {
            return;
        }

        try {
            $user->notify($notification);
        } catch (\Throwable $e) {
            Log::warning('Could not send notification email.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function sendToMany($users, CarRentalEmailNotification $notification): void
    {
        if ($users->isEmpty()) {
            return;
        }

        try {
            Notification::send($users, $notification);
        } catch (\Throwable $e) {
            Log::warning('Could not send notification emails.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function carLabel(?Car $car): string
    {
        if (! $car) {
            return 'the car';
        }

        return trim($car->year . ' ' . $car->brand . ' ' . $car->model);
    }

    private function bookingDateRange(Booking $booking): string
    {
        return $booking->start_date?->format('Y-m-d') . ' to ' . $booking->end_date?->format('Y-m-d');
    }

    private function bookingDays(Booking $booking): int
    {
        if (! $booking->start_date || ! $booking->end_date) {
            return 0;
        }

        $start = $booking->start_date instanceof Carbon ? $booking->start_date : Carbon::parse($booking->start_date);
        $end = $booking->end_date instanceof Carbon ? $booking->end_date : Carbon::parse($booking->end_date);

        return $start->diffInDays($end) + 1;
    }

    private function bookingDaysLabel(Booking $booking): string
    {
        $days = $this->bookingDays($booking);
        if ($days <= 0) {
            return 'N/A';
        }

        return $days . ' day' . ($days === 1 ? '' : 's');
    }
}
