<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_details', function (Blueprint $table) {
            $table->string('vet_license_number', 100)->nullable();
            $table->date('vet_license_expiration')->nullable();
            $table->string('vet_issuing_authority', 100)->nullable();
            $table->string('vet_service_area', 255)->nullable();
            $table->string('vet_specialization', 255)->nullable();
            $table->string('vet_clinic_name', 255)->nullable();
            $table->text('vet_clinic_address')->nullable();
            $table->string('vet_license_front_path', 500)->nullable();
            $table->string('vet_license_back_path', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('user_details', function (Blueprint $table) {
            $table->dropColumn([
                'vet_license_number',
                'vet_license_expiration',
                'vet_issuing_authority',
                'vet_service_area',
                'vet_specialization',
                'vet_clinic_name',
                'vet_clinic_address',
                'vet_license_front_path',
                'vet_license_back_path',
            ]);
        });
    }
};
