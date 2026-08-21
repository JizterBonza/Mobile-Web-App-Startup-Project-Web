<?php

namespace Tests\Unit;

use App\Models\OrderItem;
use App\Services\PayoutInstructionService;
use App\Services\ShopWalletService;
use App\Support\BankBicDirectory;
use InvalidArgumentException;
use Tests\TestCase;

class PayoutInstructionServiceTest extends TestCase
{
    private PayoutInstructionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PayoutInstructionService(new ShopWalletService());
    }

    public function test_maps_bank_and_ewallet_names_to_bic_codes(): void
    {
        $this->assertSame('BNORPHMM', BankBicDirectory::find('BDO')['bic']);
        $this->assertSame('BOPIPHMM', BankBicDirectory::find('BPI')['bic']);
        $this->assertSame('GXCHPHM2', BankBicDirectory::find('GCash')['bic']);
        $this->assertSame('PAPHPHM1', BankBicDirectory::find('Maya')['bic']);
        $this->assertTrue(BankBicDirectory::isEwallet('GCash'));
        $this->assertFalse(BankBicDirectory::isEwallet('BDO'));
    }

    public function test_vendor_share_is_the_full_sale_total(): void
    {
        $item = new OrderItem([
            'quantity' => 3,
            'price_at_purchase' => 980.00,
            'platform_fee' => 0,
        ]);

        $this->assertSame(2940.00, ShopWalletService::vendorShare($item));
    }

    public function test_build_returns_paymongo_disbursement_payload(): void
    {
        $instruction = $this->service->build([
            'amount' => 2500.50,
            'account_number' => '09171234567',
            'account_name' => 'Juan Dela Cruz',
            'bank_name' => 'GCash',
        ]);

        $this->assertSame('09171234567', $instruction['destination_account']['number']);
        $this->assertSame('Juan Dela Cruz', $instruction['destination_account']['name']);
        $this->assertSame('GXCHPHM2', $instruction['destination_account']['bic']);
        $this->assertSame(2500.50, $instruction['amount']);
        $this->assertSame('PHP', $instruction['currency']);
        $this->assertSame('paymongo', $instruction['provider']);
        $this->assertMatchesRegularExpression('/^AGFPO-\d{8}-SX-[A-Z0-9]{6}$/', $instruction['reference_number']);
        $this->assertSame('125900219450', $instruction['source_account']['number']);
        $this->assertSame('Agrify Connect Philippines Corporation', $instruction['source_account']['name']);
        $this->assertSame('PABIPHMM', $instruction['source_account']['bic']);
    }

    public function test_build_requires_a_resolvable_bic(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->build([
            'amount' => 1000,
            'account_number' => '1234567890',
            'account_name' => 'Unknown Holder',
            'bank_name' => 'Unknown Bank XYZ',
        ]);
    }
}
