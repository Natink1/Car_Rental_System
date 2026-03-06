<?php

use App\Http\Controllers\Api\AdminCarController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReviewController;
use Illuminate\Support\Facades\Route;
use Illuminate\Broadcasting\BroadcastController;

Route::post('broadcasting/auth', [BroadcastController::class, 'authenticate'])->middleware('auth:api');

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('password', [AuthController::class, 'changePassword']);
    });
});

Route::get('cars', [CarController::class, 'index']);
Route::get('cars/{id}', [CarController::class, 'show']);
Route::get('cars/{carId}/reviews', [ReviewController::class, 'index']);

Route::middleware('auth:api')->group(function () {
    Route::get('admins', fn () => response()->json(\App\Models\User::where('role', 'admin')->get(['id', 'name', 'email'])));
    Route::post('cars', [CarController::class, 'store'])->middleware('role:owner');
    Route::put('cars/{id}', [CarController::class, 'update'])->middleware('role:owner');
    Route::post('cars/{id}', [CarController::class, 'update'])->middleware('role:owner');
    Route::patch('cars/{id}/reapply', [CarController::class, 'reapply'])->middleware('role:owner');
    Route::delete('cars/{id}', [CarController::class, 'destroy'])->middleware('role:owner');
    Route::get('my-cars', [CarController::class, 'myCars'])->middleware('role:owner');

    Route::get('bookings', [BookingController::class, 'index']);
    Route::post('bookings', [BookingController::class, 'store'])->middleware('role:customer,owner');
    Route::get('bookings/{id}', [BookingController::class, 'show']);
    Route::patch('bookings/{id}/cancel', [BookingController::class, 'cancel']);
    Route::patch('bookings/{id}/approve', [BookingController::class, 'approve'])->middleware('role:owner');
    Route::patch('bookings/{id}/reject', [BookingController::class, 'reject'])->middleware('role:owner');

    Route::get('bookings/{bookingId}/payments', [PaymentController::class, 'index']);
    Route::post('bookings/{bookingId}/payments/simulate', [PaymentController::class, 'simulate'])->middleware('role:customer');

    Route::post('cars/{carId}/reviews', [ReviewController::class, 'store']);

    Route::get('conversations', [ConversationController::class, 'index']);
    Route::post('conversations', [ConversationController::class, 'getOrCreate']);
    Route::get('conversations/{id}', [ConversationController::class, 'show']);
    Route::patch('conversations/{id}/mark-read', [ConversationController::class, 'markRead']);
    Route::get('conversations/{conversationId}/messages', [MessageController::class, 'index']);
    Route::post('conversations/{conversationId}/messages', [MessageController::class, 'store']);
    Route::patch('messages/{id}/read', [MessageController::class, 'markRead']);

    Route::get('dashboard/admin', [DashboardController::class, 'admin'])->middleware('role:admin');
    Route::get('dashboard/owner', [DashboardController::class, 'owner'])->middleware('role:owner');
    Route::get('dashboard/customer', [DashboardController::class, 'customer'])->middleware('role:customer');
});

Route::middleware(['auth:api', 'role:admin'])->group(function () {
    Route::get('admin/cars/pending', [AdminCarController::class, 'pending']);
    Route::patch('admin/cars/{id}/approve', [AdminCarController::class, 'approve']);
    Route::patch('admin/cars/{id}/reject', [AdminCarController::class, 'reject']);
    Route::get('admin/users', [AdminUserController::class, 'index']);
    Route::post('admin/users', [AdminUserController::class, 'store']);
});
