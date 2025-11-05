<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create user detail
        $userDetail = UserDetail::create([
            'first_name' => 'Test',
            'middle_name' => null,
            'last_name' => 'User',
            'email' => 'test@example.com',
            'email_confirmed' => true,
            'mobile_number' => '+1234567890',
            'shipping_address' => '123 Test Street, Test City, TC 12345',
            'profile_image_url' => null,
        ]);

        // Create user credential
        $userCredential = UserCredential::create([
            'username' => 'testuser',
            'password_hash' => Hash::make('password'),
            'reset_token' => null,
            'reset_token_expires' => null,
            'last_login' => null,
        ]);

        // Create user
        User::create([
            'user_detail_id' => $userDetail->id,
            'user_credential_id' => $userCredential->id,
            'status' => 'active',
            'user_type' => 'vendor',
        ]);
    }
}
