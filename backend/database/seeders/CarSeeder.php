<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\User;
use Illuminate\Database\Seeder;

class CarSeeder extends Seeder
{
    private const CARS_PER_OWNER = 8;

    /** @var array<int, array{brand: string, models: array<string>}> */
    private static array $brandsModels = [
        ['brand' => 'Toyota', 'models' => ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Land Cruiser', 'Yaris', 'Prius', 'Hilux', 'Fortuner']],
        ['brand' => 'Honda', 'models' => ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Jazz', 'City', 'BR-V']],
        ['brand' => 'Ford', 'models' => ['Focus', 'Fiesta', 'Mustang', 'Explorer', 'Ranger', 'Escape', 'Edge', 'F-150']],
        ['brand' => 'BMW', 'models' => ['3 Series', '5 Series', 'X3', 'X5', '1 Series', 'X1', 'M3']],
        ['brand' => 'Mercedes-Benz', 'models' => ['C-Class', 'E-Class', 'A-Class', 'GLC', 'GLE', 'CLA', 'GLA']],
        ['brand' => 'Volkswagen', 'models' => ['Golf', 'Passat', 'Polo', 'Tiguan', 'Touareg', 'Arteon', 'T-Roc']],
        ['brand' => 'Hyundai', 'models' => ['i20', 'i30', 'Tucson', 'Santa Fe', 'Kona', 'Elantra', 'Creta', 'Palisade']],
        ['brand' => 'Kia', 'models' => ['Sportage', 'Sorento', 'Picanto', 'Rio', 'Ceed', 'Niro', 'EV6', 'Stonic']],
        ['brand' => 'Nissan', 'models' => ['Qashqai', 'Juke', 'X-Trail', 'Leaf', 'Micra', 'Navara', 'Ariya']],
        ['brand' => 'Mazda', 'models' => ['Mazda3', 'Mazda6', 'CX-5', 'CX-30', 'CX-60', 'MX-5', '2']],
        ['brand' => 'Audi', 'models' => ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'e-tron']],
        ['brand' => 'Tesla', 'models' => ['Model 3', 'Model Y', 'Model S', 'Model X']],
        ['brand' => 'Suzuki', 'models' => ['Swift', 'Vitara', 'Jimny', 'Baleno', 'S-Cross', 'Ignis']],
    ];

    private static array $transmissions = ['automatic', 'manual'];
    private static array $fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid'];

    /** Car image URLs for variety (Unsplash) */
    private static array $carImageUrls = [
        'https://images.unsplash.com/photo-1621007947382-b97c98406315?w=800',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
        'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800',
        'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800',
        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800',
        'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800',
        'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800',
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
        'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800',
        'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800',
    ];

    public function run(): void
    {
        $owners = User::where('role', 'owner')->get();
        if ($owners->isEmpty()) {
            $this->command->warn('No owner user found. Run UserSeeder first.');
            return;
        }

        $imageIndex = 0;
        $totalCars = 0;
        $pendingCount = 0;
        $pendingToApprove = 2; // exactly 2 cars pending for admin to approve

        foreach ($owners as $owner) {
            for ($i = 0; $i < self::CARS_PER_OWNER; $i++) {
                $brandData = self::$brandsModels[array_rand(self::$brandsModels)];
                $model = $brandData['models'][array_rand($brandData['models'])];
                $status = $pendingCount < $pendingToApprove ? 'pending' : 'approved';
                if ($status === 'pending') {
                    $pendingCount++;
                }

                $car = Car::create([
                    'user_id' => $owner->id,
                    'brand' => $brandData['brand'],
                    'model' => $model,
                    'year' => (int) fake()->numberBetween(2018, 2025),
                    'transmission' => self::$transmissions[array_rand(self::$transmissions)],
                    'fuel_type' => self::$fuelTypes[array_rand(self::$fuelTypes)],
                    'seats' => (int) fake()->randomElement([2, 4, 5, 5, 5, 7, 7, 8]),
                    'price_per_day' => (float) fake()->randomElement([25, 35, 45, 55, 65, 80, 95, 120, 150, 200]),
                    'status' => $status,
                ]);

                $url = self::$carImageUrls[$imageIndex % count(self::$carImageUrls)];
                $imageIndex++;
                try {
                    $car->addMediaFromUrl($url)->toMediaCollection('car-images', 'public');
                } catch (\Throwable $e) {
                    // Skip if URL fails (e.g. no network)
                }
                $totalCars++;
            }
        }

        $this->command->info('Seeded ' . $totalCars . ' cars (' . self::CARS_PER_OWNER . ' per owner).');
    }
}
