<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserCredential;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SettingsLastLoginTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $this->createSchema();
        Carbon::setTestNow(Carbon::parse('2026-09-03 18:11:00', 'UTC'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_security_settings_session_information_shows_the_most_recent_login(): void
    {
        $this->createAdminUser(
            'admin@example.test',
            'password',
            Carbon::parse('2026-08-01 10:00:00', 'UTC'),
        );

        $this->post('/login', [
            'email' => 'admin@example.test',
            'password' => 'password',
        ])->assertRedirect('/dashboard/admin');

        $credential = UserCredential::query()->first();
        $this->assertNotNull($credential->last_login);
        $this->assertTrue(
            Carbon::parse('2026-09-03 18:11:00', 'UTC')->equalTo($credential->last_login)
        );

        $expectedIso = Carbon::parse('2026-09-03 18:11:00', 'UTC')->toIso8601String();

        $this->get('/settings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Settings')
                ->where('userData.last_login', $expectedIso)
                ->where('userData.session_login_time', $expectedIso)
            );
    }

    public function test_session_information_uses_current_session_login_time(): void
    {
        $user = $this->createAdminUser(
            'admin@example.test',
            'password',
            Carbon::parse('2026-08-01 10:00:00', 'UTC'),
        );

        $this->actingAs($user);
        $this->withSession([
            'user_id' => $user->id,
            'login_time' => Carbon::parse('2026-09-03 18:11:00', 'UTC'),
            'last_activity' => now(),
            'session_timeout' => now()->addHours(2),
        ]);

        $expectedIso = Carbon::parse('2026-09-03 18:11:00', 'UTC')->toIso8601String();

        $this->get('/settings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Settings')
                ->where('userData.session_login_time', $expectedIso)
            );
    }

    private function createAdminUser(string $email, string $password, Carbon $lastLogin): User
    {
        $detailId = DB::table('user_details')->insertGetId([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => $email,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $credentialId = DB::table('user_credentials')->insertGetId([
            'username' => 'admin_user',
            'password_hash' => Hash::make($password),
            'last_login' => $lastLogin,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'user_detail_id' => $detailId,
            'user_credential_id' => $credentialId,
            'status' => 'active',
            'user_type' => User::TYPE_ADMIN,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($userId);
    }

    private function createSchema(): void
    {
        Schema::create('user_details', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('email');
            $table->timestamps();
        });

        Schema::create('user_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('username');
            $table->string('password_hash');
            $table->string('reset_token')->nullable();
            $table->timestamp('reset_token_expires')->nullable();
            $table->timestamp('last_login')->nullable();
            $table->timestamps();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_detail_id')->nullable();
            $table->unsignedBigInteger('user_credential_id')->nullable();
            $table->string('status')->nullable();
            $table->string('user_type')->nullable();
            $table->string('remember_token')->nullable();
            $table->timestamps();
        });
    }
}
