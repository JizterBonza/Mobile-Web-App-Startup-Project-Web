<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicStorageTest extends TestCase
{
    public function test_uploaded_files_are_served_when_the_public_symlink_is_missing(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('klasrum/covers/hero.jpg', 'fake-image-bytes');

        $this->get('/storage/klasrum/covers/hero.jpg')
            ->assertOk();
    }

    public function test_missing_uploaded_files_return_not_found(): void
    {
        Storage::fake('public');

        $this->get('/storage/klasrum/covers/missing.jpg')->assertNotFound();
    }

    public function test_parent_directory_segments_are_rejected(): void
    {
        Storage::fake('public');

        $this->get('/storage/'.rawurlencode('../.env'))->assertNotFound();
    }
}
