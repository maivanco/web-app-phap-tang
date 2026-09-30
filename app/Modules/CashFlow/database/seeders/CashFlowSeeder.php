<?php

namespace App\Modules\CashFlow\database\seeders;

use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Brand;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InitialBalance;
use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use Illuminate\Database\Seeder;

class CashFlowSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Branches
        $branches = [
            ['code' => 'A', 'name' => '240 Xã Đàn, Thanh Xuân, Hà Nội', 'address' => '240 Xã Đàn, Thanh Xuân, Hà Nội'],
            ['code' => 'B', 'name' => '764 Nguyễn Chí Thanh, Phường Minh Phụng, TP Hồ Chí Minh', 'address' => '764 Nguyễn Chí Thanh, Phường Minh Phụng, TP Hồ Chí Minh'],
            ['code' => 'C', 'name' => '11A Tôn Đức Thắng, Phường Sài Gòn, Quận 1, Hồ Chí Minh', 'address' => '11A Tôn Đức Thắng, Phường Sài Gòn, Quận 1, Hồ Chí Minh'],
        ];

        $branchModels = [];
        foreach ($branches as $branch) {
            $branchModels[$branch['code']] = Branch::updateOrCreate(
                ['code' => $branch['code']],
                ['name' => $branch['name'], 'address' => $branch['address'], 'status' => 'active']
            );
        }

        // 2. Customer Sources
        $sources = [
            ['code' => 'A', 'name' => 'Tiktok'],
            ['code' => 'B', 'name' => 'Facebook'],
            ['code' => 'C', 'name' => 'Vãng lai'],
            ['code' => 'D', 'name' => 'Đạo tràng'],
            ['code' => 'E', 'name' => 'Cũ'],
            ['code' => 'F', 'name' => 'Khác'],
        ];

        foreach ($sources as $source) {
            CustomerSource::updateOrCreate(
                ['code' => $source['code']],
                ['name' => $source['name'], 'status' => 'active']
            );
        }

        // 3. Brands
        $brands = [
            ['code' => 'a', 'name' => 'Pháp Tạng'],
            ['code' => 'b', 'name' => 'MGEMS'],
            ['code' => 'c', 'name' => 'MJADE'],
        ];

        foreach ($brands as $brand) {
            Brand::updateOrCreate(
                ['code' => $brand['code']],
                ['name' => $brand['name'], 'status' => 'active']
            );
        }

        // 4. Financial Accounts (Cash funds per branch)
        foreach (['A', 'B', 'C'] as $code) {
            $branch = $branchModels[$code];
            $fundName = 'Quỹ Tiền Mặt - ' . ($code === 'A' ? 'Xã Đàn' : ($code === 'B' ? 'Nguyễn Chí Thanh' : 'Tôn Đức Thắng'));
            $account = FinancialAccount::updateOrCreate(
                ['code' => 'CASH_' . $code],
                [
                    'letter_code' => $code,
                    'name' => $fundName,
                    'type' => 'cash',
                    'branch_id' => $branch->id,
                    'status' => 'active',
                ]
            );

            // Seed initial balance if not exists
            InitialBalance::firstOrCreate(
                ['account_id' => $account->id],
                [
                    'effective_date' => now()->startOfYear()->toDateString(),
                    'initial_amount' => 0,
                    'note' => 'Initial balance ' . $fundName,
                ]
            );
        }

        // 5. Bank Accounts & Gateway F
        $bankAccounts = [
            ['letter_code' => 'A', 'code' => 'BANK_A', 'name' => 'CK PHÚ', 'type' => 'bank'],
            ['letter_code' => 'B', 'code' => 'BANK_B', 'name' => 'CK TRUNG', 'type' => 'bank'],
            ['letter_code' => 'C', 'code' => 'BANK_C', 'name' => 'CK HKD MGEMS', 'type' => 'bank'],
            ['letter_code' => 'D', 'code' => 'BANK_D', 'name' => 'CK HKD PT', 'type' => 'bank'],
            ['letter_code' => 'E', 'code' => 'BANK_E', 'name' => 'CK BẢO YẾN', 'type' => 'bank'],
            ['letter_code' => 'F', 'code' => 'GATEWAY_F', 'name' => 'QUẸT THẺ', 'type' => 'card_gateway'],
            ['letter_code' => 'G', 'code' => 'BANK_G', 'name' => 'CK ĐST', 'type' => 'bank'],
        ];

        foreach ($bankAccounts as $acc) {
            $account = FinancialAccount::updateOrCreate(
                ['code' => $acc['code']],
                [
                    'letter_code' => $acc['letter_code'],
                    'name' => $acc['name'],
                    'type' => $acc['type'],
                    'branch_id' => null,
                    'status' => 'active',
                ]
            );

            if ($acc['type'] !== 'card_gateway') {
                InitialBalance::firstOrCreate(
                    ['account_id' => $account->id],
                    [
                        'effective_date' => now()->startOfYear()->toDateString(),
                        'initial_amount' => 0,
                        'note' => 'Initial balance ' . $acc['name'],
                    ]
                );
            }
        }

        // 6. Telegram Authorized Users demo
        TelegramAuthorizedUser::updateOrCreate(
            ['telegram_user_id' => 999999999],
            [
                'full_name' => 'Quản Lý Demo',
                'role' => 'manager',
                'is_active' => true,
            ]
        );
    }
}
