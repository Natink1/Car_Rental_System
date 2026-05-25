<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {

        User::create([
            'name' => 'Admin User',
            'email' => 'natink4825@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Kaleab User',
            'email' => 'yenekal199@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'owner',
        ]);

        User::create([
            'name' => 'Habtamu User',
            'email' => 'habtamugirma1oleo@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'customer',
        ]);
        // User::create([
        //     'name' => 'Car Owner',
        //     'email' => 'owner@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'owner',
        // ]);

        // User::create([
        //     'name' => 'Car Owner 2',
        //     'email' => 'owner2@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'owner',
        // ]);

        // User::create([
        //     'name' => 'Car Owner 3',
        //     'email' => 'owner3@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'owner',
        // ]);

        // User::create([
        //     'name' => 'Customer User',
        //     'email' => 'customer@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'customer',
        // ]);


        // User::create([
        //     'name' => 'Customer User 2',
        //     'email' => 'customer2@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'customer',
        // ]);

        // User::create([
        //     'name' => 'Natanel Deribe',
        //     'email' => 'nataneld@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'admin',
        // ]);

        // User::create([
        //     'name' => 'kaleab Mulugeta',
        //     'email' => 'kaleabm@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'customer',
        // ]);

        // User::create([
        //     'name' => 'Habtamu Girma',
        //     'email' => 'habtamug@nhk.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'owner',
        // ]);

        // User::create([
        //     'name' => 'Natnael Customer',
        //     'email' => 'natnael4825@gmail.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'customer',
        // ]);

        // User::create([
        //     'name' => 'Natnael Owner User 2',
        //     'email' => 'Natiman591591@gmail.com',
        //     'password' => Hash::make('password'),
        //     'role' => 'owner',
        // ]);

    }
}
