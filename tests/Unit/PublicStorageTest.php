<?php

namespace Tests\Unit;

use App\Support\PublicStorage;
use PHPUnit\Framework\TestCase;

class PublicStorageTest extends TestCase
{
    public function test_relative_disk_paths_become_root_relative_urls(): void
    {
        $this->assertSame('/storage/shops/covers/store.jpg', PublicStorage::url('shops/covers/store.jpg'));
        $this->assertSame('/storage/shops/covers/store.jpg', PublicStorage::url('/storage/shops/covers/store.jpg'));
        $this->assertSame('/storage/shops/covers/store.jpg', PublicStorage::url('storage/shops/covers/store.jpg'));
    }

    public function test_absolute_app_storage_urls_are_rewritten_to_the_current_origin(): void
    {
        $this->assertSame(
            '/storage/klasrum/covers/hero.jpg',
            PublicStorage::url('http://localhost:8000/storage/klasrum/covers/hero.jpg')
        );
        $this->assertSame(
            '/storage/profile-images/me.png',
            PublicStorage::url('https://staging.example.com/storage/profile-images/me.png')
        );
    }

    public function test_external_urls_are_left_unchanged(): void
    {
        $google = 'https://lh3.googleusercontent.com/avatar.png';
        $this->assertSame($google, PublicStorage::url($google));
    }

    public function test_empty_values_return_null(): void
    {
        $this->assertNull(PublicStorage::url(null));
        $this->assertNull(PublicStorage::url(''));
        $this->assertNull(PublicStorage::url('   '));
    }
}
