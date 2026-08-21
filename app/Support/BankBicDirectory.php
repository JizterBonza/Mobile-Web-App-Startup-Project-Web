<?php

namespace App\Support;

class BankBicDirectory
{
    public const TYPE_BANK = 'bank';

    public const TYPE_EWALLET = 'ewallet';

    /**
     * InstaPay/PESONet participant BIC codes keyed by normalized alias.
     *
     * @return array<string, array{bic: string, type: string, name: string}>
     */
    public static function institutions(): array
    {
        return [
            'bdo' => ['bic' => 'BNORPHMM', 'type' => self::TYPE_BANK, 'name' => 'BDO Unibank'],
            'bdo unibank' => ['bic' => 'BNORPHMM', 'type' => self::TYPE_BANK, 'name' => 'BDO Unibank'],
            'banco de oro' => ['bic' => 'BNORPHMM', 'type' => self::TYPE_BANK, 'name' => 'BDO Unibank'],
            'bpi' => ['bic' => 'BOPIPHMM', 'type' => self::TYPE_BANK, 'name' => 'Bank of the Philippine Islands'],
            'bank of the philippine islands' => ['bic' => 'BOPIPHMM', 'type' => self::TYPE_BANK, 'name' => 'Bank of the Philippine Islands'],
            'metrobank' => ['bic' => 'MBTCPHMM', 'type' => self::TYPE_BANK, 'name' => 'Metropolitan Bank and Trust Company'],
            'metro bank' => ['bic' => 'MBTCPHMM', 'type' => self::TYPE_BANK, 'name' => 'Metropolitan Bank and Trust Company'],
            'unionbank' => ['bic' => 'UBPHPHMM', 'type' => self::TYPE_BANK, 'name' => 'Union Bank of the Philippines'],
            'union bank' => ['bic' => 'UBPHPHMM', 'type' => self::TYPE_BANK, 'name' => 'Union Bank of the Philippines'],
            'pnb' => ['bic' => 'PNBMPHMM', 'type' => self::TYPE_BANK, 'name' => 'Philippine National Bank'],
            'philippine national bank' => ['bic' => 'PNBMPHMM', 'type' => self::TYPE_BANK, 'name' => 'Philippine National Bank'],
            'landbank' => ['bic' => 'TLBMPHMM', 'type' => self::TYPE_BANK, 'name' => 'Land Bank of the Philippines'],
            'land bank' => ['bic' => 'TLBMPHMM', 'type' => self::TYPE_BANK, 'name' => 'Land Bank of the Philippines'],
            'lanbank' => ['bic' => 'TLBMPHMM', 'type' => self::TYPE_BANK, 'name' => 'Land Bank of the Philippines'],
            'security bank' => ['bic' => 'SETCPHMM', 'type' => self::TYPE_BANK, 'name' => 'Security Bank'],
            'rcbc' => ['bic' => 'RCBCPHMM', 'type' => self::TYPE_BANK, 'name' => 'RCBC'],
            'chinabank' => ['bic' => 'CHBKPHMM', 'type' => self::TYPE_BANK, 'name' => 'China Banking Corporation'],
            'china bank' => ['bic' => 'CHBKPHMM', 'type' => self::TYPE_BANK, 'name' => 'China Banking Corporation'],
            'eastwest' => ['bic' => 'EWBCPHMM', 'type' => self::TYPE_BANK, 'name' => 'EastWest Bank'],
            'east west' => ['bic' => 'EWBCPHMM', 'type' => self::TYPE_BANK, 'name' => 'EastWest Bank'],
            'eastwest bank' => ['bic' => 'EWBCPHMM', 'type' => self::TYPE_BANK, 'name' => 'EastWest Bank'],
            'aub' => ['bic' => 'AUBKPHMM', 'type' => self::TYPE_BANK, 'name' => 'Asia United Bank'],
            'asia united bank' => ['bic' => 'AUBKPHMM', 'type' => self::TYPE_BANK, 'name' => 'Asia United Bank'],
            'psbank' => ['bic' => 'PHSBPHMM', 'type' => self::TYPE_BANK, 'name' => 'PSBank'],
            'bank of commerce' => ['bic' => 'PABIPHMM', 'type' => self::TYPE_BANK, 'name' => 'Bank of Commerce'],
            'boc' => ['bic' => 'PABIPHMM', 'type' => self::TYPE_BANK, 'name' => 'Bank of Commerce'],
            'pbcom' => ['bic' => 'BPHIPHMM', 'type' => self::TYPE_BANK, 'name' => 'Philippine Bank of Communications'],
            'maybank' => ['bic' => 'MBBEPHMM', 'type' => self::TYPE_BANK, 'name' => 'Maybank Philippines'],
            'cimb' => ['bic' => 'CIPHPHMM', 'type' => self::TYPE_BANK, 'name' => 'CIMB Bank Philippines'],
            'cimb bank' => ['bic' => 'CIPHPHMM', 'type' => self::TYPE_BANK, 'name' => 'CIMB Bank Philippines'],
            'gotyme' => ['bic' => 'GOTYPHM2', 'type' => self::TYPE_BANK, 'name' => 'GoTyme Bank'],
            'gotyme bank' => ['bic' => 'GOTYPHM2', 'type' => self::TYPE_BANK, 'name' => 'GoTyme Bank'],
            'seabank' => ['bic' => 'SEABPHM2', 'type' => self::TYPE_BANK, 'name' => 'SeaBank Philippines'],
            'sea bank' => ['bic' => 'SEABPHM2', 'type' => self::TYPE_BANK, 'name' => 'SeaBank Philippines'],
            'tonik' => ['bic' => 'TONKPHM2', 'type' => self::TYPE_BANK, 'name' => 'Tonik Digital Bank'],
            'uniondigital' => ['bic' => 'UNODPHM2', 'type' => self::TYPE_BANK, 'name' => 'UnionDigital Bank'],
            'union digital' => ['bic' => 'UNODPHM2', 'type' => self::TYPE_BANK, 'name' => 'UnionDigital Bank'],
            'maya bank' => ['bic' => 'MAYAPHM2', 'type' => self::TYPE_BANK, 'name' => 'Maya Bank'],
            'gcash' => ['bic' => 'GXCHPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'GCash'],
            'globe gcash' => ['bic' => 'GXCHPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'GCash'],
            'maya' => ['bic' => 'PAPHPHM1', 'type' => self::TYPE_EWALLET, 'name' => 'Maya'],
            'paymaya' => ['bic' => 'PAPHPHM1', 'type' => self::TYPE_EWALLET, 'name' => 'Maya'],
            'pay maya' => ['bic' => 'PAPHPHM1', 'type' => self::TYPE_EWALLET, 'name' => 'Maya'],
            'grabpay' => ['bic' => 'GRABPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'GrabPay'],
            'grab pay' => ['bic' => 'GRABPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'GrabPay'],
            'shopeepay' => ['bic' => 'SHPEPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'ShopeePay'],
            'shopee pay' => ['bic' => 'SHPEPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'ShopeePay'],
            'coins.ph' => ['bic' => 'CAIHPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'Coins.ph'],
            'coinsph' => ['bic' => 'CAIHPHM2', 'type' => self::TYPE_EWALLET, 'name' => 'Coins.ph'],
        ];
    }

    public static function normalize(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9.]+/', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }

    /**
     * @return array{bic: string, type: string, name: string}|null
     */
    public static function find(?string $bankName, ?string $bic = null): ?array
    {
        if (is_string($bic) && $bic !== '') {
            $normalizedBic = strtoupper(trim($bic));
            foreach (self::institutions() as $institution) {
                if ($institution['bic'] === $normalizedBic) {
                    return $institution;
                }
            }

            return [
                'bic' => $normalizedBic,
                'type' => self::TYPE_BANK,
                'name' => $bankName ?: $normalizedBic,
            ];
        }

        if (! is_string($bankName) || trim($bankName) === '') {
            return null;
        }

        $normalized = self::normalize($bankName);
        $institutions = self::institutions();

        if (isset($institutions[$normalized])) {
            return $institutions[$normalized];
        }

        foreach ($institutions as $alias => $institution) {
            if (str_contains($normalized, $alias) || str_contains($alias, $normalized)) {
                return $institution;
            }
        }

        return null;
    }

    public static function isEwallet(?string $bankName, ?string $bic = null): bool
    {
        $institution = self::find($bankName, $bic);

        return $institution !== null && $institution['type'] === self::TYPE_EWALLET;
    }
}
