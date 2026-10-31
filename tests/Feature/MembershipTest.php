<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Membership\database\seeders\MembershipTypeSeeder;
use App\Modules\Membership\Mail\MembershipCardMail;
use App\Modules\Membership\Models\MembershipCard;
use App\Modules\Membership\Models\MembershipType;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MembershipTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Mail::fake();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_view_membership_types_list(): void
    {
        MembershipType::create([
            'name' => 'TÙY DUYÊN',
            'code' => 'TUY_DUYEN',
            'price' => 0,
            'validity_duration' => 6,
            'validity_unit' => 'month',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.membership.types.index'));

        $response->assertOk();
    }

    public function test_admin_can_create_membership_type_with_validity_and_promotion_programs(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.membership.types.store'), [
                'name' => 'DUYÊN KHỞI',
                'description' => '550.000đ / 06 tháng',
                'price' => 550000,
                'validity_duration' => 6,
                'validity_unit' => 'month',
                'is_active' => true,
                'promotion_programs' => [
                    [
                        'name' => '4 lượt tham quan cá nhân',
                        'usage_count' => 4,
                    ],
                    [
                        'name' => 'Khoảng lặng tại Trấn',
                        'usage_count' => 0,
                    ],
                ],
            ]);

        $response->assertRedirect(route('admin.membership.types.index'));

        $this->assertDatabaseHas('membership_types', [
            'name' => 'DUYÊN KHỞI',
            'price' => 550000,
            'validity_duration' => 6,
            'validity_unit' => 'month',
        ]);

        $type = MembershipType::where('name', 'DUYÊN KHỞI')->first();
        $this->assertCount(2, $type->promotion_programs);
        $this->assertEquals(4, $type->promotion_programs[0]['usage_count']);
    }

    public function test_admin_can_update_membership_type(): void
    {
        $type = MembershipType::create([
            'name' => 'Gói Cơ Bản',
            'price' => 100000,
            'validity_duration' => 3,
            'validity_unit' => 'month',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->put(route('admin.membership.types.update', $type), [
                'name' => 'Gói Nâng Cấp',
                'description' => 'Mô tả mới',
                'price' => 200000,
                'validity_duration' => 12,
                'validity_unit' => 'month',
                'is_active' => true,
                'promotion_programs' => [
                    ['name' => '8 lượt tham quan', 'usage_count' => 8],
                ],
            ]);

        $response->assertRedirect(route('admin.membership.types.index'));

        $type->refresh();
        $this->assertEquals('Gói Nâng Cấp', $type->name);
        $this->assertEquals(200000, $type->price);
        $this->assertEquals(12, $type->validity_duration);
    }

    public function test_admin_cannot_delete_membership_type_with_issued_cards(): void
    {
        $type = MembershipType::create([
            'name' => 'AN TRÚ',
            'price' => 999000,
            'validity_duration' => 12,
            'validity_unit' => 'month',
            'is_active' => true,
        ]);

        MembershipCard::create([
            'membership_type_id' => $type->id,
            'card_code' => 'MEM-TEST-001',
            'customer_name' => 'Nguyễn Văn A',
            'customer_phone' => '0901234567',
            'customer_email' => 'customer@example.com',
            'issued_at' => now(),
            'expires_at' => now()->addYear(),
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete(route('admin.membership.types.destroy', $type));

        $response->assertRedirect(route('admin.membership.types.index'));
        $this->assertDatabaseHas('membership_types', ['id' => $type->id]);
    }

    public function test_admin_can_create_membership_card_with_auto_generated_code_and_email(): void
    {
        $type = MembershipType::create([
            'name' => 'DUYÊN KHỞI',
            'price' => 550000,
            'validity_duration' => 6,
            'validity_unit' => 'month',
            'promotion_programs' => [
                ['id' => 'p1', 'name' => '4 lượt tham quan', 'usage_count' => 4],
                ['id' => 'p2', 'name' => 'Ưu đãi mua hàng 5%', 'usage_count' => 0],
            ],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.membership.cards.store'), [
                'customer_name' => 'Trần Thị B',
                'customer_phone' => '0912345678',
                'customer_email' => 'tranthib@example.com',
                'customer_dob' => '1990-05-15',
                'membership_type_id' => $type->id,
                'notes' => 'VIP Member',
            ]);

        $card = MembershipCard::where('customer_phone', '0912345678')->first();
        $this->assertNotNull($card);
        $this->assertStringStartsWith('MEM-', $card->card_code);
        $this->assertEquals('Trần Thị B', $card->customer_name);
        $this->assertEquals('tranthib@example.com', $card->customer_email);
        $this->assertEquals('1990-05-15', $card->customer_dob->toDateString());

        // Verify expiration date is approximately 6 months from now
        $this->assertTrue(Carbon::now()->addMonths(6)->isSameDay($card->expires_at));

        // Verify benefits snapshot
        $this->assertCount(2, $card->card_benefits);
        $this->assertEquals(4, $card->card_benefits[0]['remaining_count']);
        $this->assertEquals(0, $card->card_benefits[0]['used_count']);

        // Verify email was sent with QR code
        Mail::assertSent(MembershipCardMail::class, function ($mail) use ($card) {
            return $mail->hasTo('tranthib@example.com') && $mail->card->id === $card->id;
        });

        // Verify QR code file was stored
        Storage::disk('public')->assertExists('membership-qr/'.$card->card_code.'.png');

        $response->assertRedirect(route('admin.membership.cards.show', $card));
    }

    public function test_admin_can_lookup_card_by_code_and_by_phone(): void
    {
        $type = MembershipType::create([
            'name' => 'TÙY DUYÊN',
            'price' => 0,
            'validity_duration' => 6,
            'validity_unit' => 'month',
        ]);

        $card = MembershipCard::create([
            'membership_type_id' => $type->id,
            'card_code' => 'MEM-20261031-TEST1',
            'customer_name' => 'Lê Văn C',
            'customer_phone' => '0988776655',
            'customer_email' => 'levanc@example.com',
            'issued_at' => now(),
            'expires_at' => now()->addMonths(6),
            'status' => 'active',
            'card_benefits' => [
                ['id' => 'p1', 'name' => 'Ưu đãi chung', 'usage_count' => 0, 'used_count' => 0, 'remaining_count' => 0],
            ],
        ]);

        // Lookup by card code
        $resCode = $this->actingAs($this->adminUser)
            ->postJson(route('admin.membership.scanner.lookup'), [
                'code' => 'MEM-20261031-TEST1',
            ]);

        $resCode->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('card.customer_name', 'Lê Văn C');

        // Lookup by phone number
        $resPhone = $this->actingAs($this->adminUser)
            ->postJson(route('admin.membership.scanner.lookup'), [
                'code' => '0988776655',
            ]);

        $resPhone->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('card.card_code', 'MEM-20261031-TEST1');
    }

    public function test_scanner_checkin_reduces_benefit_usage_count_by_1(): void
    {
        $type = MembershipType::create([
            'name' => 'DUYÊN KHỞI',
            'price' => 550000,
            'validity_duration' => 6,
            'validity_unit' => 'month',
        ]);

        $card = MembershipCard::create([
            'membership_type_id' => $type->id,
            'card_code' => 'MEM-20261031-TEST2',
            'customer_name' => 'Phạm Văn D',
            'customer_phone' => '0933221100',
            'customer_email' => 'phamvand@example.com',
            'issued_at' => now(),
            'expires_at' => now()->addMonths(6),
            'status' => 'active',
            'card_benefits' => [
                [
                    'id' => 'benefit_visits',
                    'name' => '4 lượt tham quan cá nhân',
                    'usage_count' => 4,
                    'used_count' => 0,
                    'remaining_count' => 4,
                ],
            ],
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.membership.scanner.check_in'), [
                'code' => $card->card_code,
                'benefit_id' => 'benefit_visits',
                'notes' => 'Lượt check-in lần 1',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $card->refresh();
        $this->assertEquals(1, $card->card_benefits[0]['used_count']);
        $this->assertEquals(3, $card->card_benefits[0]['remaining_count']);

        // Check check-in record
        $this->assertDatabaseHas('membership_card_checkins', [
            'membership_card_id' => $card->id,
            'benefit_id' => 'benefit_visits',
            'benefit_name' => '4 lượt tham quan cá nhân',
        ]);
    }

    public function test_scanner_checkin_fails_when_benefit_usage_is_depleted(): void
    {
        $type = MembershipType::create([
            'name' => 'DUYÊN KHỞI',
            'price' => 550000,
            'validity_duration' => 6,
            'validity_unit' => 'month',
        ]);

        $card = MembershipCard::create([
            'membership_type_id' => $type->id,
            'card_code' => 'MEM-20261031-DEPLETED',
            'customer_name' => 'Hội Viên Hết Lượt',
            'customer_phone' => '0900000000',
            'customer_email' => 'depleted@example.com',
            'issued_at' => now(),
            'expires_at' => now()->addMonths(6),
            'status' => 'active',
            'card_benefits' => [
                [
                    'id' => 'benefit_visits',
                    'name' => '4 lượt tham quan cá nhân',
                    'usage_count' => 4,
                    'used_count' => 4,
                    'remaining_count' => 0,
                ],
            ],
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.membership.scanner.check_in'), [
                'code' => $card->card_code,
                'benefit_id' => 'benefit_visits',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_scanner_checkin_fails_when_card_is_expired(): void
    {
        $type = MembershipType::create([
            'name' => 'HẾT HẠN',
            'price' => 550000,
            'validity_duration' => 6,
            'validity_unit' => 'month',
        ]);

        $card = MembershipCard::create([
            'membership_type_id' => $type->id,
            'card_code' => 'MEM-20261031-EXPIRED',
            'customer_name' => 'Hội Viên Quá Hạn',
            'customer_phone' => '0911111111',
            'customer_email' => 'expired@example.com',
            'issued_at' => now()->subMonths(7),
            'expires_at' => now()->subDay(),
            'status' => 'active',
            'card_benefits' => [
                [
                    'id' => 'benefit_visits',
                    'name' => '4 lượt tham quan cá nhân',
                    'usage_count' => 4,
                    'used_count' => 0,
                    'remaining_count' => 4,
                ],
            ],
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.membership.scanner.check_in'), [
                'code' => $card->card_code,
                'benefit_id' => 'benefit_visits',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_seeder_creates_the_three_reference_membership_tiers(): void
    {
        $seeder = new MembershipTypeSeeder;
        $seeder->run();

        $this->assertDatabaseHas('membership_types', [
            'code' => 'TUY_DUYEN',
            'price' => 0,
            'validity_duration' => 6,
        ]);

        $this->assertDatabaseHas('membership_types', [
            'code' => 'DUYEN_KHOI',
            'price' => 550000,
            'validity_duration' => 6,
        ]);

        $this->assertDatabaseHas('membership_types', [
            'code' => 'AN_TRU',
            'price' => 999000,
            'validity_duration' => 12,
        ]);

        $duyenKhoi = MembershipType::where('code', 'DUYEN_KHOI')->first();
        $this->assertCount(4, $duyenKhoi->promotion_programs);
        $this->assertEquals(4, $duyenKhoi->promotion_programs[0]['usage_count']);
    }
}
