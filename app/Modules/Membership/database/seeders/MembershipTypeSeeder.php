<?php

namespace App\Modules\Membership\database\seeders;

use App\Modules\Membership\Models\MembershipType;
use Illuminate\Database\Seeder;

class MembershipTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tiers = [
            [
                'name' => 'TÙY DUYÊN',
                'code' => 'TUY_DUYEN',
                'description' => 'Miễn phí đăng ký - Thẻ cá nhân, trải nghiệm tham quan và tích luỹ lượt.',
                'price' => 0,
                'validity_duration' => 6,
                'validity_unit' => 'month',
                'is_active' => true,
                'promotion_programs' => [
                    [
                        'id' => 'tuy_duyen_1',
                        'name' => 'Mã hội viên điện tử: Mua vé tham quan theo từng lượt',
                        'usage_count' => 0,
                    ],
                    [
                        'id' => 'tuy_duyen_2',
                        'name' => 'Tích lượt để nhận vé tặng: Đi đủ 5 lượt hợp lệ, tặng 1 vé',
                        'usage_count' => 0,
                    ],
                    [
                        'id' => 'tuy_duyen_3',
                        'name' => 'Thời hạn sử dụng: 6 tháng; Vé tặng dùng trong 15 ngày',
                        'usage_count' => 0,
                    ],
                    [
                        'id' => 'tuy_duyen_4',
                        'name' => 'Ưu đãi mua hàng: Áp dụng chương trình chung',
                        'usage_count' => 0,
                    ],
                ],
            ],
            [
                'name' => 'DUYÊN KHỞI',
                'code' => 'DUYEN_KHOI',
                'description' => '550.000đ / 06 tháng - 4 lượt tham quan cá nhân và trải nghiệm khoảng lặng tại Trấn.',
                'price' => 550000,
                'validity_duration' => 6,
                'validity_unit' => 'month',
                'is_active' => true,
                'promotion_programs' => [
                    [
                        'id' => 'duyen_khoi_1',
                        'name' => '4 lượt tham quan cá nhân (Có hiệu lực 06 tháng từ kích hoạt)',
                        'usage_count' => 4,
                    ],
                    [
                        'id' => 'duyen_khoi_2',
                        'name' => '“Khoảng lặng tại Trấn” (Mở cửa 17h30–18h30: tĩnh toạ, ngồi thiền hoặc chiêm bái)',
                        'usage_count' => 0,
                    ],
                    [
                        'id' => 'duyen_khoi_3',
                        'name' => 'Ưu đãi mua hàng 5% (Chỉ trên danh mục được phê duyệt)',
                        'usage_count' => 0,
                    ],
                    [
                        'id' => 'duyen_khoi_4',
                        'name' => 'Tri ân sinh nhật: Nhận lời chúc riêng từ Trấn',
                        'usage_count' => 1,
                    ],
                ],
            ],
            [
                'name' => 'AN TRÚ',
                'code' => 'AN_TRU',
                'description' => '999.000đ / 12 tháng - Tổng 8 lượt cá nhân, vé mời người thân và quà tri ân trang trọng hàng năm.',
                'price' => 999000,
                'validity_duration' => 12,
                'validity_unit' => 'month',
                'is_active' => true,
                'promotion_programs' => [
                    [
                        'id' => 'an_tru_1',
                        'name' => 'Tổng 8 lượt cá nhân (Trong 12 tháng)',
                        'usage_count' => 8,
                    ],
                    [
                        'id' => 'an_tru_2',
                        'name' => '1 vé mời người thân/năm (Người được mời đi cùng hội viên)',
                        'usage_count' => 1,
                    ],
                    [
                        'id' => 'an_tru_3',
                        'name' => '“Khoảng lặng tại Trấn” (Mở cửa 17h30–18h30: tĩnh toạ, ngồi thiền hoặc chiêm bái)',
                        'usage_count' => 0,
                    ],
                    [
                        'id' => 'an_tru_4',
                        'name' => 'Quà tri ân 1 lần/năm (Sổ tay thiền định + bút hoặc ấn phẩm giới hạn)',
                        'usage_count' => 1,
                    ],
                    [
                        'id' => 'an_tru_5',
                        'name' => 'Ưu đãi mua hàng 5% (Chỉ trên danh mục được phê duyệt)',
                        'usage_count' => 0,
                    ],
                ],
            ],
        ];

        foreach ($tiers as $tier) {
            MembershipType::updateOrCreate(
                ['code' => $tier['code']],
                $tier
            );
        }
    }
}
