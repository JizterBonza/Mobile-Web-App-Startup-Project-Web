<?php

namespace App\Services;

use App\Models\Payout;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PayoutStatusService
{
    public function __construct(protected ShopWalletService $wallets)
    {
    }

    /**
     * @return array{payout: Payout, previous_status: string, changed: bool}
     */
    public function apply(Payout $payout, string $status, ?string $reason = null): array
    {
        $status = $this->normalizeStatus($status);
        $this->assertCanTransition($payout, $status);

        return DB::transaction(function () use ($payout, $status, $reason) {
            $fresh = Payout::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();
            $previous = (string) $fresh->status;

            $this->assertCanTransition($fresh, $status);

            if ($previous === $status) {
                return [
                    'payout' => $fresh,
                    'previous_status' => $previous,
                    'changed' => false,
                ];
            }

            $payload = is_array($fresh->payload) ? $fresh->payload : [];
            $payload['status_update'] = array_filter([
                'status' => $status,
                'reason' => $reason !== null && trim($reason) !== '' ? trim($reason) : null,
                'updated_at' => now()->toIso8601String(),
            ]);

            $fresh->forceFill([
                'status' => $status,
                'payload' => $payload,
            ])->save();

            if ($status === Payout::STATUS_FAILED) {
                $this->wallets->creditForFailedPayout($fresh);
            }

            return [
                'payout' => $fresh->refresh(),
                'previous_status' => $previous,
                'changed' => true,
            ];
        });
    }

    public function normalizeStatus(string $status): string
    {
        $normalized = strtolower(trim($status));

        return match ($normalized) {
            Payout::STATUS_SUCCESS, 'completed', 'paid' => Payout::STATUS_SUCCESS,
            Payout::STATUS_FAILED, 'fail', 'failure' => Payout::STATUS_FAILED,
            default => throw new InvalidArgumentException(
                'Status must be success or failed.'
            ),
        };
    }

    public function assertCanTransition(Payout $payout, string $status): void
    {
        $current = (string) $payout->status;

        if ($current === $status) {
            return;
        }

        if ($current !== Payout::STATUS_PENDING) {
            throw new InvalidArgumentException(
                sprintf('Payout is already %s and cannot be changed to %s.', $current, $status)
            );
        }
    }
}
