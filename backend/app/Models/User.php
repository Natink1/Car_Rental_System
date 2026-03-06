<?php

namespace App\Models;

use App\Helpers\MediaUrlHelper;
use App\Traits\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject, HasMedia
{
    use HasFactory, HasUuids, InteractsWithMedia, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
    ];

    protected $appends = ['id_image_url'];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('id-image')
            ->useDisk('public')
            ->singleFile();
    }

    public function getIdImageUrlAttribute(): ?string
    {
        return MediaUrlHelper::fullUrl($this->getFirstMedia('id-image'));
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'role' => $this->role,
        ];
    }

    public function cars()
    {
        return $this->hasMany(Car::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_user')->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }
}
