<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FuzzySearch
{
    public const CANDIDATE_LIMIT = 200;

    /**
     * Loose SQL prefilter. PHP ranking drops rows that are not actually close.
     *
     * @param  array<int, string>  $columns
     */
    public static function constrain(Builder $query, string $term, array $columns): void
    {
        [$contains, $prefixes] = self::sqlNeedles($term);
        $columns = array_values(array_filter($columns, [self::class, 'isColumn']));

        if ($columns === [] || ($contains === [] && $prefixes === [])) {
            $query->whereRaw('0 = 1');

            return;
        }

        $query->where(function (Builder $query) use ($columns, $contains, $prefixes) {
            foreach ($columns as $column) {
                foreach ($contains as $needle) {
                    $query->orWhereRaw('LOWER('.$column.') LIKE ?', ['%'.$needle.'%']);
                }
                foreach ($prefixes as $needle) {
                    $query->orWhereRaw('LOWER('.$column.') LIKE ?', [$needle.'%']);
                }
            }
        });
    }

    /**
     * Exact name, then prefix, then substring, then a shared 2-character prefix.
     * The last bucket keeps a misspelling inside the candidate cap.
     */
    public static function orderByNameRelevance(Builder $query, string $term, string $nameColumn): void
    {
        if (! self::isColumn($nameColumn)) {
            return;
        }

        $normalized = self::likeLiteral(self::normalize($term));
        $head = mb_substr($normalized, 0, 2);

        $query->orderByRaw(
            'CASE
                WHEN LOWER('.$nameColumn.') = ? THEN 0
                WHEN LOWER('.$nameColumn.') LIKE ? THEN 1
                WHEN LOWER('.$nameColumn.') LIKE ? THEN 2
                WHEN LOWER('.$nameColumn.') LIKE ? THEN 3
                ELSE 4
            END',
            [$normalized, $normalized.'%', '%'.$normalized.'%', $head.'%']
        );
    }

    /**
     * Keep substring hits and close typos, with the closest name first.
     *
     * @param  array<int, string>  $extraFields
     */
    public static function rank(Collection $rows, string $term, string $nameField, array $extraFields = []): Collection
    {
        return $rows->values()
            ->map(function ($row, int $index) use ($term, $nameField, $extraFields) {
                $name = self::normalize((string) data_get($row, $nameField, ''));
                $extras = array_map(
                    fn (string $field) => self::normalize((string) data_get($row, $field, '')),
                    $extraFields
                );

                return [
                    'row' => $row,
                    'score' => self::score(self::normalize($term), $name, $extras),
                    'index' => $index,
                ];
            })
            ->filter(fn (array $item) => $item['score'] !== null)
            ->sortBy([
                ['score', 'desc'],
                ['index', 'asc'],
            ])
            ->map(fn (array $item) => $item['row'])
            ->values();
    }

    /**
     * @param  array<int, string>  $extras
     */
    private static function score(string $term, string $name, array $extras): ?int
    {
        $texts = array_values(array_filter(array_merge([$name], $extras), fn (string $text) => $text !== ''));
        if ($term === '' || $texts === [] || ! self::qualifies($term, $texts)) {
            return null;
        }

        $nameScore = self::fieldScore($term, $name, true);
        if ($nameScore !== null) {
            return $nameScore;
        }

        $best = null;
        foreach ($extras as $extra) {
            $score = self::fieldScore($term, $extra, false);
            if ($score !== null && ($best === null || $score > $best)) {
                $best = $score;
            }
        }
        if ($best !== null) {
            return $best;
        }

        $distance = self::worstTokenDistance($term, $texts);

        return $distance === null ? null : 50 - $distance;
    }

    /**
     * @param  array<int, string>  $texts
     */
    private static function qualifies(string $term, array $texts): bool
    {
        foreach (self::tokens($term) as $token) {
            $matched = false;
            foreach ($texts as $text) {
                if (self::tokenMatches($token, $text)) {
                    $matched = true;
                    break;
                }
            }
            if (! $matched) {
                return false;
            }
        }

        return true;
    }

    private static function fieldScore(string $term, string $field, bool $isName): ?int
    {
        if ($field === '') {
            return null;
        }

        if ($isName && $field === $term) {
            return 6000;
        }

        if ($isName && str_starts_with($field, $term)) {
            return 5000;
        }

        if (str_contains($field, $term)) {
            return $isName ? 4000 : 2000;
        }

        $distance = self::worstTokenDistance($term, [$field]);
        if ($distance === null) {
            return null;
        }

        return ($isName ? 3000 : 1000) - $distance;
    }

    private static function tokenMatches(string $token, string $text): bool
    {
        return self::tokenDistance($token, $text) !== null;
    }

    /**
     * @param  array<int, string>  $texts
     */
    private static function worstTokenDistance(string $term, array $texts): ?int
    {
        $worst = 0;
        foreach (self::tokens($term) as $token) {
            $best = null;
            foreach ($texts as $text) {
                $distance = self::tokenDistance($token, $text);
                if ($distance !== null && ($best === null || $distance < $best)) {
                    $best = $distance;
                }
            }
            if ($best === null) {
                return null;
            }
            $worst = max($worst, $best);
        }

        return $worst;
    }

    private static function tokenDistance(string $token, string $text): ?int
    {
        if ($text === '') {
            return null;
        }

        if (str_contains($text, $token)) {
            return 0;
        }

        $best = null;
        foreach (array_merge([$text], self::words($text)) as $candidate) {
            $allowed = self::maxDistance(max(mb_strlen($token), mb_strlen($candidate)));
            if (abs(mb_strlen($token) - mb_strlen($candidate)) > $allowed) {
                continue;
            }

            $distance = self::editDistance($token, $candidate);
            if ($distance <= $allowed && ($best === null || $distance < $best)) {
                $best = $distance;
            }
        }

        return $best;
    }

    private static function maxDistance(int $length): int
    {
        if ($length <= 1) {
            return 0;
        }

        if ($length <= 4) {
            return 1;
        }

        if ($length <= 8) {
            return 2;
        }

        return 3;
    }

    private static function editDistance(string $left, string $right): int
    {
        if ($left === $right) {
            return 0;
        }

        if (strlen($left) === mb_strlen($left) && strlen($right) === mb_strlen($right) && strlen($left) <= 255 && strlen($right) <= 255) {
            return levenshtein($left, $right);
        }

        $leftChars = preg_split('//u', $left, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $rightChars = preg_split('//u', $right, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $leftCount = count($leftChars);
        $rightCount = count($rightChars);
        $previous = range(0, $rightCount);

        for ($i = 1; $i <= $leftCount; $i++) {
            $current = [$i];
            for ($j = 1; $j <= $rightCount; $j++) {
                $cost = $leftChars[$i - 1] === $rightChars[$j - 1] ? 0 : 1;
                $current[$j] = min(
                    $current[$j - 1] + 1,
                    $previous[$j] + 1,
                    $previous[$j - 1] + $cost
                );
            }
            $previous = $current;
        }

        return $previous[$rightCount];
    }

    /**
     * @return array{0: array<int, string>, 1: array<int, string>}
     */
    private static function sqlNeedles(string $term): array
    {
        $normalized = self::normalize($term);
        $parts = array_unique(array_merge(self::tokens($normalized), [$normalized]));
        $contains = [];
        $prefixes = [];

        foreach ($parts as $part) {
            $part = self::likeLiteral($part);
            $length = mb_strlen($part);
            if ($length < 2) {
                continue;
            }

            $contains[] = $part;
            $prefixes[] = mb_substr($part, 0, 2);
            if ($length >= 3) {
                for ($offset = 0; $offset <= $length - 3; $offset++) {
                    $contains[] = mb_substr($part, $offset, 3);
                }
            }
        }

        return [array_values(array_unique($contains)), array_values(array_unique($prefixes))];
    }

    /**
     * @return array<int, string>
     */
    private static function tokens(string $normalized): array
    {
        $parts = preg_split('/\s+/u', $normalized, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($parts === [] && mb_strlen($normalized) >= 2) {
            return [$normalized];
        }

        return array_values($parts);
    }

    /**
     * @return array<int, string>
     */
    private static function words(string $text): array
    {
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_filter($parts, fn (string $part) => mb_strlen($part) >= 2));
    }

    private static function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return $value;
    }

    private static function likeLiteral(string $value): string
    {
        return str_replace(['%', '_'], '', $value);
    }

    private static function isColumn(string $column): bool
    {
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $column) === 1;
    }
}
