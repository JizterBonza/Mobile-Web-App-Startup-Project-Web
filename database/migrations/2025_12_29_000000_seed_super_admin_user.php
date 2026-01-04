<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if super admin already exists
        $existingAdmin = DB::table('user_credentials')
            ->where('username', 'superadmin')
            ->first();

        if (!$existingAdmin) {
            // Create user detail for super admin
            $userDetailId = DB::table('user_details')->insertGetId([
                'first_name' => 'Super',
                'middle_name' => null,
                'last_name' => 'Admin',
                'email' => 'superadmin@agrify.com',
                'email_confirmed' => true,
                'mobile_number' => null,
                'shipping_address' => null,
                'profile_image_url' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create user credential for super admin
            $userCredentialId = DB::table('user_credentials')->insertGetId([
                'username' => 'superadmin',
                'password_hash' => Hash::make('SuperAdmin@123'),
                'reset_token' => null,
                'reset_token_expires' => null,
                'last_login' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create the super admin user
            DB::table('users')->insert([
                'user_detail_id' => $userDetailId,
                'user_credential_id' => $userCredentialId,
                'status' => 'active',
                'user_type' => 'super_admin',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Find and delete the super admin user
        $credential = DB::table('user_credentials')
            ->where('username', 'superadmin')
            ->first();

        if ($credential) {
            $user = DB::table('users')
                ->where('user_credential_id', $credential->id)
                ->first();

            if ($user) {
                // Delete user
                DB::table('users')->where('id', $user->id)->delete();
                
                // Delete user detail
                DB::table('user_details')->where('id', $user->user_detail_id)->delete();
                
                // Delete user credential
                DB::table('user_credentials')->where('id', $credential->id)->delete();
            }
        }
    }
};

