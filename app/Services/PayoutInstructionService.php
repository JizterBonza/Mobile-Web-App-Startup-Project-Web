<?php

namespace App\Services;

use App\Models\Payout;
use App\Models\Shop;
use App\Models\User;
use App\Support\BankBicDirectory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class PayoutInstructionService
{
    public const PROVIDER_PAYMONGO = 'paymongo';

    public function __construct(protected ShopWalletService $wallets)
    {
    }

    /**
     * @param  array{
     *     shop?: Shop|null,
     *     user?: User|null,
     *     amount?: float|int|string|null,
     *     account_number?: string|null,
     *     account_name?: string|null,
     *     bank_name?: string|null,
     *     bic?: string|null
     * }  $input
     * @return array{
     *     destination_account: array{number: string, name: string, bic: string},
     *     amount: float,
     *     currency: string,
     *     provider: string,
     *     reference_number: string,
     *     source_account: array{number: string, name: string, bic: string}
     * }
     */
    public function build(array $input): array
    {
        $shop = $input['shop'] ?? null;
        $user = $input['user'] ?? null;
        $destination = $this->resolveDestination($shop, $user, $input);
        $amount = round((float) ($input['amount'] ?? 0), 2);

        if ($amount < 1) {
            throw new InvalidArgumentException('Payout amount must be at least 1.00 PHP.');
        }

        return [
            'destination_account' => [
                'number' => $destination['number'],
                'name' => $destination['name'],
                'bic' => $destination['bic'],
            ],
            'amount' => $amount,
            'currency' => (string) config('payout.currency', 'PHP'),
            'provider' => (string) config('payout.provider', self::PROVIDER_PAYMONGO),
            'reference_number' => $this->generateReferenceNumber($shop),
            'source_account' => $this->sourceAccount(),
        ];
    }

    /**
     * Credit completed sales into shop wallets, then record a PayMongo disbursement
     * for each shop with a payable wallet balance.
     *
     * @param  array<int, int>|null  $shopIds
     * @return array{ready: array<int, array<string, mixed>>, skipped: array<int, array<string, mixed>>}
     */
    public function disbursements(?array $shopIds = null): array
    {
        return DB::transaction(function () use ($shopIds) {
            $this->wallets->syncUncreditedSales($shopIds);

            $query = Shop::query()
                ->where('wallet_balance', '>=', 1)
                ->whereNotNull('account_number')
                ->where('account_number', '!=', '')
                ->whereNotNull('account_name')
                ->where('account_name', '!=', '');

            if ($shopIds !== null) {
                $query->whereIn('id', $shopIds);
            }

            $payloads = [];
            $skipped = [];

            foreach ($query->orderBy('id')->lockForUpdate()->get() as $shop) {
                $amount = round((float) $shop->wallet_balance, 2);
                if ($amount < 1) {
                    continue;
                }

                try {
                    $payload = $this->build([
                        'shop' => $shop,
                        'amount' => $amount,
                    ]);
                } catch (InvalidArgumentException $e) {
                    $skipped[] = [
                        'shop_id' => $shop->id,
                        'shop_name' => $shop->shop_name,
                        'amount' => $amount,
                        'bank_name' => $shop->bank_name,
                        'reason' => $e->getMessage(),
                    ];
                    continue;
                }

                $payout = Payout::create([
                    'reference_number' => $payload['reference_number'],
                    'shop_id' => $shop->id,
                    'amount' => $payload['amount'],
                    'currency' => $payload['currency'],
                    'provider' => $payload['provider'],
                    'destination_account_number' => $payload['destination_account']['number'],
                    'destination_account_name' => $payload['destination_account']['name'],
                    'destination_account_bic' => $payload['destination_account']['bic'],
                    'source_account_number' => $payload['source_account']['number'],
                    'source_account_name' => $payload['source_account']['name'],
                    'source_account_bic' => $payload['source_account']['bic'],
                    'payload' => $payload,
                    'status' => Payout::STATUS_PENDING,
                ]);

                $this->wallets->debitForPayout($shop, $amount, $payout);
                $payloads[] = $payload;
            }

            return [
                'ready' => $payloads,
                'skipped' => $skipped,
            ];
        });
    }

    public function generateReferenceNumber(?Shop $shop = null): string
    {
        $prefix = (string) config('payout.reference_prefix', 'AGFPO');

        return sprintf(
            '%s-%s-S%s-%s',
            $prefix,
            now()->format('Ymd'),
            $shop?->id ?: 'X',
            Str::upper(Str::random(6))
        );
    }

    /**
     * @return array{number: string, name: string, bic: string}
     */
    public function sourceAccount(): array
    {
        $source = config('payout.source_account');

        return [
            'number' => (string) ($source['number'] ?? '125900219450'),
            'name' => (string) ($source['name'] ?? 'Agrify Connect Philippines Corporation'),
            'bic' => (string) ($source['bic'] ?? 'PABIPHMM'),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{number: string, name: string, bic: string, bank_name: string}
     */
    private function resolveDestination(?Shop $shop, ?User $user, array $input): array
    {
        $accountNumber = $this->firstNonEmpty([
            $input['account_number'] ?? null,
            $shop?->account_number,
        ]);
        $accountName = $this->firstNonEmpty([
            $input['account_name'] ?? null,
            $shop?->account_name,
        ]);
        $bankName = $this->firstNonEmpty([
            $input['bank_name'] ?? null,
            $shop?->bank_name,
        ]);
        $explicitBic = $this->firstNonEmpty([$input['bic'] ?? null]);

        if ($accountNumber === null) {
            throw new InvalidArgumentException('Destination account number is required.');
        }

        if ($accountName === null) {
            throw new InvalidArgumentException('Destination account holder name is required.');
        }

        $institution = BankBicDirectory::find($bankName, $explicitBic);
        $bic = $explicitBic ?? $institution['bic'] ?? null;

        if ($bic === null) {
            throw new InvalidArgumentException(
                'Destination BIC could not be resolved. Provide bic or a recognized bank/e-wallet name.'
            );
        }

        return [
            'number' => $accountNumber,
            'name' => $accountName,
            'bic' => strtoupper($bic),
            'bank_name' => $bankName ?? ($institution['name'] ?? ''),
        ];
    }

    /**
     * @param  array<int, mixed>  $values
     */
    private function firstNonEmpty(array $values): ?string
    {
        foreach ($values as $value) {
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }
}
