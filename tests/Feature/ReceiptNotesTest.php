<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\database\seeders\CashFlowSeeder;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use App\Modules\CashFlow\Models\TelegramSession;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use App\Modules\CashFlow\Services\TelegramBotService;
use App\Modules\ReceiptNotes\Models\ReceiptNote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReceiptNotesTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    protected User $seller;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CashFlowSeeder::class);

        $this->branch = Branch::first() ?? Branch::create([
            'code' => 'A',
            'name' => 'Chi nhánh A',
            'address' => '123 Đường A',
            'status' => 'active',
        ]);

        $this->manager = User::factory()->create([
            'role' => 'manager',
            'name' => 'Manager User',
        ]);

        $this->seller = User::factory()->create([
            'role' => 'seller',
            'name' => 'Seller User',
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/receipt-notes')->assertRedirect('/login');
        $this->get('/admin/receipt-notes/create')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_receipt_notes_index_and_stats(): void
    {
        ReceiptNote::create([
            'note_code' => 'PGN-TEST-0001',
            'received_date' => now()->toDateString(),
            'appointment_date' => now()->addDay()->toDateString(),
            'customer_name' => 'Nguyen Van A',
            'customer_phone' => '0901234567',
            'service_types' => ['thay_day', 'that_lai'],
            'estimated_price' => 50000,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
            'created_by' => $this->seller->id,
        ]);

        $response = $this->actingAs($this->seller)->get('/admin/receipt-notes');
        $response->assertOk();
    }

    public function test_user_can_create_receipt_note_via_web_form(): void
    {
        Http::fake([
            '*' => Http::response(['success' => true], 200),
        ]);

        $payload = [
            'note_code' => '', // Auto generate
            'received_date' => now()->toDateString(),
            'appointment_date' => now()->addDays(2)->toDateString(),
            'customer_name' => 'Tran Thi B',
            'customer_phone' => '0988776655',
            'service_types' => ['thay_day', 'chinh_size'],
            'estimated_price' => 80000,
            'estimated_pickup_time' => '17:00 chiều mai',
            'has_photos_saved' => true,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
            'notes' => 'Vòng trầm hương cẩn thận',
        ];

        $response = $this->actingAs($this->seller)->post('/admin/receipt-notes', $payload);

        $created = ReceiptNote::where('customer_name', 'Tran Thi B')->first();
        $this->assertNotNull($created);
        $this->assertStringStartsWith('PGN-', $created->note_code);
        $this->assertEquals(80000, $created->estimated_price);
        $this->assertEquals(['thay_day', 'chinh_size'], $created->service_types);
        $this->assertStringContainsString('Thay dây', $created->service_labels);
        $this->assertStringContainsString('Chỉnh size', $created->service_labels);

        $response->assertRedirect(route('admin.receipt-notes.show', $created));
    }

    public function test_user_can_view_receipt_note_show_page(): void
    {
        $note = ReceiptNote::create([
            'note_code' => 'PGN-SHOW-0001',
            'received_date' => now()->toDateString(),
            'customer_name' => 'Le Van C',
            'customer_phone' => '0911223344',
            'service_types' => ['that_lai'],
            'estimated_price' => 40000,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
        ]);

        $response = $this->actingAs($this->seller)->get("/admin/receipt-notes/{$note->id}");
        $response->assertOk();
    }

    public function test_user_can_update_receipt_note(): void
    {
        $note = ReceiptNote::create([
            'note_code' => 'PGN-UPD-0001',
            'received_date' => now()->toDateString(),
            'customer_name' => 'Pham Van D',
            'service_types' => ['thay_day'],
            'estimated_price' => 30000,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
        ]);

        $response = $this->actingAs($this->seller)->put("/admin/receipt-notes/{$note->id}", [
            'note_code' => 'PGN-UPD-0001',
            'received_date' => now()->toDateString(),
            'customer_name' => 'Pham Van D Updated',
            'service_types' => ['thay_day', 'khac'],
            'other_service_description' => 'Thêm charm bạc',
            'estimated_price' => 120000,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertRedirect(route('admin.receipt-notes.index'));

        $note->refresh();
        $this->assertEquals('Pham Van D Updated', $note->customer_name);
        $this->assertEquals(120000, $note->estimated_price);
        $this->assertStringContainsString('Thêm charm bạc', $note->service_labels);
    }

    public function test_user_can_mark_receipt_note_as_delivered(): void
    {
        $note = ReceiptNote::create([
            'note_code' => 'PGN-DELIV-0001',
            'received_date' => now()->toDateString(),
            'customer_name' => 'Khach Hang E',
            'service_types' => ['thay_day'],
            'estimated_price' => 50000,
            'final_amount' => 0,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
        ]);

        $response = $this->actingAs($this->seller)->post("/admin/receipt-notes/{$note->id}/deliver", [
            'final_amount' => 50000,
            'delivery_staff_name' => 'Staff Alice',
            'receiver_signature' => 'Khach Hang E',
            'proxy_receiver_info' => 'Chính chủ nhận tại quầy',
        ]);

        $response->assertRedirect();

        $note->refresh();
        $this->assertEquals('da_giao', $note->status);
        $this->assertEquals(50000, $note->final_amount);
        $this->assertTrue($note->inspected_at_counter);
        $this->assertNotNull($note->delivered_at);
        $this->assertEquals('Staff Alice', $note->delivery_staff_name);
    }

    public function test_manager_can_delete_receipt_note(): void
    {
        $note = ReceiptNote::create([
            'note_code' => 'PGN-DEL-0001',
            'received_date' => now()->toDateString(),
            'customer_name' => 'To Be Deleted',
            'service_types' => ['thay_day'],
            'status' => 'chua_giao',
        ]);

        $this->actingAs($this->seller)->delete("/admin/receipt-notes/{$note->id}")
            ->assertForbidden();

        $this->actingAs($this->manager)->delete("/admin/receipt-notes/{$note->id}")
            ->assertRedirect(route('admin.receipt-notes.index'));

        $this->assertDatabaseMissing('receipt_notes', ['id' => $note->id]);
    }

    public function test_user_can_export_receipt_notes_to_excel(): void
    {
        ReceiptNote::create([
            'note_code' => 'PGN-EXP-0001',
            'received_date' => now()->toDateString(),
            'customer_name' => 'Khach Export',
            'customer_phone' => '0933334444',
            'service_types' => ['thay_day'],
            'estimated_price' => 60000,
            'status' => 'chua_giao',
            'branch_id' => $this->branch->id,
        ]);

        $response = $this->actingAs($this->seller)->get('/admin/receipt-notes/export');
        $response->assertOk();
        $this->assertStringContainsString('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $response->headers->get('content-type'));
    }

    public function test_google_sheets_sync_receipt_note_formatting(): void
    {
        $note = ReceiptNote::create([
            'note_code' => 'PGN-SHEET-0001',
            'received_date' => '2026-10-22',
            'appointment_date' => '2026-10-23',
            'customer_name' => 'Tran Thi Sheet',
            'customer_phone' => '0912345678',
            'service_types' => ['thay_day', 'that_lai'],
            'estimated_price' => 70000,
            'estimated_pickup_time' => '15:00',
            'has_photos_saved' => true,
            'inspected_at_counter' => true,
            'final_amount' => 70000,
            'status' => 'da_giao',
            'delivered_at' => '2026-10-23 15:30:00',
            'proxy_receiver_info' => 'Chính chủ',
            'receiver_signature' => 'Tran Thi Sheet',
            'delivery_staff_name' => 'Staff Thu',
            'branch_id' => $this->branch->id,
            'notes' => 'Ghi chú test',
        ]);

        $syncService = app(GoogleSheetsSyncService::class);
        $row = $syncService->formatReceiptNoteRow($note);

        $this->assertEquals('PGN-SHEET-0001', $row['order_id']);
        $this->assertEquals('2026-10-22', $row['received_date']);
        $this->assertEquals('2026-10-23', $row['appointment_date']);
        $this->assertEquals('Tran Thi Sheet', $row['customer_name']);
        $this->assertEquals("'0912345678", $row['customer_phone']);
        $this->assertStringContainsString('Thay dây', $row['services']);
        $this->assertStringContainsString('Thắt lại', $row['services']);
        $this->assertEquals(70000, $row['estimated_price']);
        $this->assertEquals('Có', $row['has_photos_saved']);
        $this->assertEquals('Có', $row['inspected_at_counter']);
        $this->assertEquals('Đã giao', $row['status']);
        $this->assertEquals('Staff Thu', $row['delivery_staff_name']);
        $this->assertEquals($this->branch->name, $row['branch_name']);
    }

    public function test_telegram_bot_receipt_note_full_flow(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true], 200),
            '*' => Http::response(['success' => true], 200),
        ]);

        $telegramUserId = 888999111;
        $chatId = 777666555;

        TelegramAuthorizedUser::create([
            'telegram_user_id' => $telegramUserId,
            'full_name' => 'Telegram Bot Staff',
            'role' => 'seller',
            'is_active' => true,
        ]);

        $botUser = User::factory()->create([
            'telegram_user_id' => $telegramUserId,
            'role' => 'seller',
            'name' => 'Telegram Bot Staff',
        ]);

        $session = TelegramSession::create([
            'telegram_chat_id' => $chatId,
            'telegram_user_id' => $telegramUserId,
            'selected_branch_id' => $this->branch->id,
            'current_mode' => null,
            'current_step' => 0,
            'draft_data' => [],
        ]);

        $botService = app(TelegramBotService::class);

        // 1. Click menu "MODE_RECEIPT_NOTE"
        $botService->handleUpdate([
            'callback_query' => [
                'id' => 'cb-menu',
                'from' => ['id' => $telegramUserId],
                'message' => ['chat' => ['id' => $chatId], 'message_id' => 101],
                'data' => 'MODE_RECEIPT_NOTE',
            ],
        ]);

        $session->refresh();
        $this->assertEquals('receipt_note', $session->current_mode);
        $this->assertEquals(1, $session->current_step);

        // 2. Step 1: Input customer name
        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $telegramUserId],
                'text' => 'Chi Linh Vang',
            ],
        ]);

        $session->refresh();
        $this->assertEquals(2, $session->current_step);
        $this->assertEquals('Chi Linh Vang', $session->draft_data['customer_name']);

        // 3. Step 2: Input customer phone
        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $telegramUserId],
                'text' => '0933221100',
            ],
        ]);

        $session->refresh();
        $this->assertEquals(3, $session->current_step);
        $this->assertEquals('0933221100', $session->draft_data['customer_phone']);

        // 4. Step 3: Toggle services and finish services
        $botService->handleUpdate([
            'callback_query' => [
                'id' => 'cb-svc',
                'from' => ['id' => $telegramUserId],
                'message' => ['chat' => ['id' => $chatId], 'message_id' => 104],
                'data' => 'RN_SVC_TOGGLE_that_lai',
            ],
        ]);

        $botService->handleUpdate([
            'callback_query' => [
                'id' => 'cb-svc-done',
                'from' => ['id' => $telegramUserId],
                'message' => ['chat' => ['id' => $chatId], 'message_id' => 105],
                'data' => 'RN_SVC_DONE',
            ],
        ]);

        $session->refresh();
        $this->assertEquals(4, $session->current_step);
        $this->assertContains('that_lai', $session->draft_data['service_types']);

        // 5. Step 4: Input estimated price (e.g. 50k button)
        $botService->handleUpdate([
            'callback_query' => [
                'id' => 'cb-price',
                'from' => ['id' => $telegramUserId],
                'message' => ['chat' => ['id' => $chatId], 'message_id' => 106],
                'data' => 'RN_PRICE_50000',
            ],
        ]);

        $session->refresh();
        $this->assertEquals(5, $session->current_step);
        $this->assertEquals(50000, $session->draft_data['estimated_price']);

        // 6. Step 5: Input appointment time (e.g. RN_DATE_TODAY)
        $botService->handleUpdate([
            'callback_query' => [
                'id' => 'cb-date',
                'from' => ['id' => $telegramUserId],
                'message' => ['chat' => ['id' => $chatId], 'message_id' => 107],
                'data' => 'RN_DATE_TODAY',
            ],
        ]);

        $session->refresh();
        $this->assertEquals(6, $session->current_step);

        // 7. Step 6: Confirm and save
        $botService->handleUpdate([
            'callback_query' => [
                'id' => 'cb-confirm',
                'from' => ['id' => $telegramUserId],
                'message' => ['chat' => ['id' => $chatId], 'message_id' => 108],
                'data' => 'RN_CONFIRM_SAVE',
            ],
        ]);

        $session->refresh();
        $this->assertNull($session->current_mode);
        $this->assertEquals(0, $session->current_step);

        // Verify ReceiptNote created in DB
        $createdNote = ReceiptNote::where('customer_name', 'Chi Linh Vang')->first();
        $this->assertNotNull($createdNote);
        $this->assertEquals('0933221100', $createdNote->customer_phone);
        $this->assertEquals(50000, $createdNote->estimated_price);
        $this->assertEquals($botUser->id, $createdNote->created_by);
        $this->assertEquals($telegramUserId, $createdNote->telegram_user_id);
        $this->assertEquals('chua_giao', $createdNote->status);
    }
}
