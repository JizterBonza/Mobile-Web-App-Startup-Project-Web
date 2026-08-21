<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TITLES = [
        'Choosing the Right Feed for Layers and Growers',
        'A Simple Vaccination Schedule for Backyard Flocks',
        'Heat Stress Advisory: Keep Poultry Cool This Season',
    ];

    public function up(): void
    {
        $adminId = DB::table('users')->where('user_type', 'super_admin')->value('id');
        $categoryIds = DB::table('klasrum_categories')->pluck('id', 'name');
        $now = now();

        $articles = [
            [
                'title' => self::TITLES[0],
                'description' => 'Match feed type to age and purpose so birds grow well without wasting mash.',
                'heading' => 'Feed that fits the flock',
                'body' => '<p>Grower feeds support muscle and frame. Layer feeds add calcium for shell quality. Switching too early or too late cuts production.</p><ul><li>Starter: day 1 to week 6</li><li>Grower: week 7 until point of lay</li><li>Layer: at first egg, not before</li></ul>',
                'category' => 'Nutrition',
                'published_at' => '2026-08-12 00:00:00',
            ],
            [
                'title' => self::TITLES[1],
                'description' => 'Follow a basic calendar for Newcastle, fowl pox, and IBD so small flocks stay protected.',
                'heading' => 'Vaccinate on time',
                'body' => '<p>Record every dose. Missed boosters are a common reason outbreaks still happen after a first shot.</p><ol><li>Day 1 to 7: Newcastle (as advised by your vet)</li><li>Week 2: IBD if the area is high-risk</li><li>Week 6 to 8: fowl pox wing-web</li></ol>',
                'category' => 'Training',
                'published_at' => '2026-08-14 00:00:00',
            ],
            [
                'title' => self::TITLES[2],
                'description' => 'High heat cuts appetite and egg output. Shade, water, and airflow matter more than extra feed.',
                'heading' => 'What to do in a heat wave',
                'body' => '<p>Offer cool, clean water all day. Avoid crowding. Feed more in the early morning and late afternoon when birds eat better.</p><p>Watch for panting, wings held out, and sudden drops in lay. Those are early heat-stress signs.</p>',
                'category' => 'News',
                'published_at' => '2026-08-16 00:00:00',
            ],
        ];

        foreach ($articles as $article) {
            $title = $article['title'];
            $exists = DB::table('klasrum_contents')->where('title', $title)->exists();
            if ($exists) {
                continue;
            }

            DB::table('klasrum_contents')->insert([
                'title' => $title,
                'description' => $article['description'],
                'heading' => $article['heading'],
                'body' => $article['body'],
                'category_id' => $categoryIds[$article['category']] ?? null,
                'caption' => null,
                'cover_path' => null,
                'media_path' => null,
                'media_type' => null,
                'status' => 'published',
                'published_at' => $article['published_at'],
                'created_by' => $adminId,
                'updated_by' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('klasrum_contents')->whereIn('title', self::TITLES)->delete();
    }
};
