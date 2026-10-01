<?php

namespace App\Modules\CashFlow\Services;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Brand;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use App\Modules\CashFlow\Models\TelegramSession;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBotService
{
    protected ?string $botToken;

    public function __construct(
        protected OrderService $orderService,
        protected ExpenseService $expenseService
    ) {
        $this->botToken = config('services.telegram.bot_token', env('TELEGRAM_BOT_TOKEN'));
    }

    /**
     * Handle incoming Telegram webhook update.
     */
    public function handleUpdate(array $update): void
    {
        $message = $update['message'] ?? $update['callback_query']['message'] ?? null;
        $from = $update['message']['from'] ?? $update['callback_query']['from'] ?? null;
        $callbackData = $update['callback_query']['data'] ?? null;
        $text = trim($update['message']['text'] ?? '');

        if (!$message || !$from) {
            return;
        }

        $chatId = $message['chat']['id'];
        $userId = $from['id'];
        $username = $from['username'] ?? null;

        // Check user authorization
        $authorizedUser = TelegramAuthorizedUser::where('telegram_user_id', $userId)
            ->where('is_active', true)
            ->first();

        if (!$authorizedUser) {
            $this->sendMessage($chatId, "⚠️ Bạn chưa được cấp quyền sử dụng bot này. Vui lòng liên hệ Quản lý hệ thống (Telegram ID của bạn: `{$userId}`).", [
                'parse_mode' => 'Markdown',
            ]);
            return;
        }

        // Get or initialize user session
        $session = TelegramSession::firstOrCreate(
            ['telegram_chat_id' => $chatId],
            [
                'telegram_user_id' => $userId,
                'username' => $username,
                'current_mode' => null,
                'current_step' => 0,
                'draft_data' => [],
            ]
        );

        // Command: /huy or huy -> discard draft
        if (strtolower($text) === '/huy' || strtolower($text) === 'huy' || $callbackData === 'CMD_HUY') {
            $session->update([
                'current_mode' => null,
                'current_step' => 0,
                'draft_data' => [],
            ]);
            $this->sendMessage($chatId, "❌ Đã hủy bản nháp hiện tại. Bạn có thể bấm /start để bắt đầu lại.", [
                'reply_markup' => json_encode([
                    'inline_keyboard' => [
                        [['text' => '🔄 Bắt đầu (/start)', 'callback_data' => 'CMD_START']],
                    ],
                ]),
            ]);
            return;
        }

        // Command: /start or start
        if (strtolower($text) === '/start' || strtolower($text) === 'start' || $callbackData === 'CMD_START') {
            $session->update([
                'current_mode' => null,
                'current_step' => 0,
                'draft_data' => [],
            ]);
            $this->sendMainMenu($chatId, $session);
            return;
        }

        // Handle button clicks or text input based on mode
        $input = $callbackData ?: $text;

        if ($session->current_mode === 'order') {
            $this->handleOrderFlow($session, $input, $chatId, $userId);
        } elseif ($session->current_mode === 'expense') {
            $this->handleExpenseFlow($session, $input, $chatId, $userId);
        } else {
            $this->handleMainMenuSelection($session, $input, $chatId);
        }
    }

    /**
     * Send Main Menu.
     */
    protected function sendMainMenu(int $chatId, TelegramSession $session): void
    {
        $branchInfo = $session->selectedBranch ? "📍 Chi nhánh hiện tại: *{$session->selectedBranch->name}*\n\n" : "";

        $this->sendMessage($chatId, "👋 *HỆ THỐNG PHÁP TẠNG*\n\n{$branchInfo}Chọn thao tác để tiếp tục:", [
            'parse_mode' => 'Markdown',
            'reply_markup' => json_encode([
                'inline_keyboard' => [
                    [
                        ['text' => '🛍️ A. Đơn hàng', 'callback_data' => 'MODE_ORDER'],
                        ['text' => '💸 B. Chi tiêu', 'callback_data' => 'MODE_EXPENSE'],
                    ],
                    [
                        ['text' => '🏢 Đổi chi nhánh', 'callback_data' => 'SELECT_BRANCH'],
                    ],
                ],
            ]),
        ]);
    }

    protected function handleMainMenuSelection(TelegramSession $session, string $input, int $chatId): void
    {
        if ($input === 'SELECT_BRANCH' || str_starts_with($input, 'SET_BRANCH_')) {
            if (str_starts_with($input, 'SET_BRANCH_')) {
                $code = substr($input, strlen('SET_BRANCH_'));
                $branch = Branch::where('code', $code)->first();
                if ($branch) {
                    $session->update(['selected_branch_id' => $branch->id]);
                    $this->sendMessage($chatId, "✅ Đã chọn chi nhánh: *{$branch->name}*", ['parse_mode' => 'Markdown']);
                    $this->sendMainMenu($chatId, $session->fresh());
                    return;
                }
            }
            $this->promptBranchSelection($chatId);
            return;
        }

        if ($input === 'MODE_ORDER' || strtoupper($input) === 'A') {
            if (!$session->selected_branch_id) {
                $session->update(['current_mode' => 'order', 'current_step' => 1, 'draft_data' => []]);
                $this->promptBranchSelection($chatId);
                return;
            }
            $session->update([
                'current_mode' => 'order',
                'current_step' => 2,
                'draft_data' => ['items' => []],
            ]);
            $this->promptConsultantSelection($chatId, "📝 *NHẬP ĐƠN BÁN HÀNG*");
            return;
        }

        if ($input === 'MODE_EXPENSE' || strtoupper($input) === 'B') {
            if (!$session->selected_branch_id) {
                $session->update(['current_mode' => 'expense', 'current_step' => 1, 'draft_data' => []]);
                $this->promptBranchSelection($chatId);
                return;
            }
            $session->update([
                'current_mode' => 'expense',
                'current_step' => 2,
                'draft_data' => [],
            ]);
            $this->sendMessage($chatId, "💸 *NHẬP CHI TIÊU*\n\nBước 1: Nhập *Người chi*:", ['parse_mode' => 'Markdown']);
            return;
        }

        $this->sendMainMenu($chatId, $session);
    }

    protected function promptBranchSelection(int $chatId): void
    {
        $branches = Branch::where('status', 'active')->orderBy('code')->get();
        $buttons = [];
        foreach ($branches as $b) {
            $buttons[] = [['text' => "{$b->code}. {$b->name}", 'callback_data' => "SET_BRANCH_{$b->code}"]];
        }

        $this->sendMessage($chatId, "📍 *Chọn chi nhánh làm việc:*", [
            'parse_mode' => 'Markdown',
            'reply_markup' => json_encode(['inline_keyboard' => $buttons]),
        ]);
    }

    protected function promptConsultantSelection(int $chatId, ?string $prefix = null): void
    {
        $users = User::orderBy('name')->get();
        $buttons = [];
        foreach ($users as $user) {
            $buttons[] = [['text' => "👤 {$user->name}" . ($user->role ? " ({$user->role})" : ""), 'callback_data' => "CONSULTANT_{$user->id}"]];
        }

        $msg = ($prefix ? "{$prefix}\n\n" : "") . "👤 *Bước 2: Chọn tư vấn viên từ danh sách:*";
        $this->sendMessage($chatId, $msg, [
            'parse_mode' => 'Markdown',
            'reply_markup' => json_encode(['inline_keyboard' => $buttons]),
        ]);
    }

    /**
     * Handle Step-by-Step Order Flow.
     */
    protected function handleOrderFlow(TelegramSession $session, string $input, int $chatId, int $userId): void
    {
        $draft = $session->draft_data ?? [];
        $step = $session->current_step;

        switch ($step) {
            case 1: // Branch selection
                $code = str_replace('SET_BRANCH_', '', $input);
                $branch = Branch::where('code', strtoupper($code))->first();
                if (!$branch) {
                    $this->promptBranchSelection($chatId);
                    return;
                }
                $session->update([
                    'selected_branch_id' => $branch->id,
                    'current_step' => 2,
                ]);
                $this->promptConsultantSelection($chatId, "✅ Đã chọn chi nhánh: *{$branch->name}*");
                break;

            case 2: // Consultant selection
                $consultant = null;
                if (str_starts_with($input, 'CONSULTANT_')) {
                    $consultantId = (int) substr($input, strlen('CONSULTANT_'));
                    $consultant = User::find($consultantId);
                } else {
                    $inputName = trim($input);
                    $consultant = User::where('name', $inputName)
                        ->orWhere('name', 'like', "%{$inputName}%")
                        ->first();
                }

                if (!$consultant) {
                    $this->promptConsultantSelection($chatId, "⚠️ Vui lòng chọn tư vấn viên từ danh sách bên dưới:");
                    return;
                }

                $draft['consultant_id'] = $consultant->id;
                $draft['consultant_name'] = $consultant->name;
                $session->update(['draft_data' => $draft, 'current_step' => 3]);
                $this->sendMessage($chatId, "✅ Đã chọn tư vấn viên: *{$consultant->name}*\n\nBước 3: Nhập *Tên khách hàng*:", ['parse_mode' => 'Markdown']);
                break;

            case 3: // Customer name
                $draft['customer_name'] = trim($input);
                $session->update(['draft_data' => $draft, 'current_step' => 4]);
                $this->sendMessage($chatId, "📱 Nhập *Số điện thoại khách* (dạng text, giữ số 0 đầu):", ['parse_mode' => 'Markdown']);
                break;

            case 4: // Customer phone
                $phone = trim($input);
                if (!preg_match('/^0[0-9]{8,11}$/', $phone)) {
                    $this->sendMessage($chatId, "⚠️ Số điện thoại không hợp lệ (cần bắt đầu bằng số 0 và có 9-12 chữ số). Vui lòng nhập lại:", ['parse_mode' => 'Markdown']);
                    return;
                }
                $draft['customer_phone'] = $phone;
                $session->update(['draft_data' => $draft, 'current_step' => 5]);
                $this->sendMessage($chatId, "⚧ Chọn *Giới tính khách hàng*:", [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => json_encode([
                        'inline_keyboard' => [
                            [
                                ['text' => 'Nam', 'callback_data' => 'GENDER_Nam'],
                                ['text' => 'Nữ', 'callback_data' => 'GENDER_Nữ'],
                            ],
                        ],
                    ]),
                ]);
                break;

            case 5: // Gender
                $gender = str_replace('GENDER_', '', $input);
                if (!in_array($gender, ['Nam', 'Nữ'])) {
                    $gender = 'Nam';
                }
                $draft['customer_gender'] = $gender;
                $session->update(['draft_data' => $draft, 'current_step' => 6]);

                // Prompt customer source A-F
                $sources = CustomerSource::where('status', 'active')->orderBy('code')->get();
                $keyboard = [];
                foreach ($sources as $s) {
                    $keyboard[] = [['text' => "{$s->code}. {$s->name}", 'callback_data' => "SOURCE_{$s->id}"]];
                }
                $this->sendMessage($chatId, "🌐 Chọn *Nguồn khách hàng* (A-F):", [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
                ]);
                break;

            case 6: // Customer source
                $sourceId = (int) str_replace('SOURCE_', '', $input);
                $draft['customer_source_id'] = $sourceId;
                $draft['items'] = [];
                $session->update(['draft_data' => $draft, 'current_step' => 7]);
                $this->sendMessage($chatId, "📦 *Nhập sản phẩm 1:*\nNhập *Tên sản phẩm* (ví dụ: Nhang Nag, Vòng Băng Chủng):", ['parse_mode' => 'Markdown']);
                break;

            case 7: // Product name
                $draft['current_item']['product_name'] = trim($input);
                $session->update(['draft_data' => $draft, 'current_step' => 8]);

                // Brand selection a/b/c
                $brands = Brand::where('status', 'active')->orderBy('code')->get();
                $keyboard = [];
                foreach ($brands as $b) {
                    $keyboard[] = [['text' => "{$b->code}. {$b->name}", 'callback_data' => "BRAND_{$b->id}"]];
                }
                $this->sendMessage($chatId, "🏷️ Chọn *Thương hiệu / Nhà phân phối* (a/b/c):", [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
                ]);
                break;

            case 8: // Brand
                $brandId = (int) str_replace('BRAND_', '', $input);
                $draft['current_item']['brand_id'] = $brandId;
                $session->update(['draft_data' => $draft, 'current_step' => 9]);
                $this->sendMessage($chatId, "🔢 Nhập *Số lượng* (số nguyên dương, ví dụ: 1):", ['parse_mode' => 'Markdown']);
                break;

            case 9: // Quantity
                $qty = (int) trim($input);
                if ($qty <= 0) {
                    $this->sendMessage($chatId, "⚠️ Số lượng phải lớn hơn 0. Vui lòng nhập lại số lượng:");
                    return;
                }
                $draft['current_item']['quantity'] = $qty;
                $session->update(['draft_data' => $draft, 'current_step' => 10]);
                $this->sendMessage($chatId, "💰 Nhập *Đơn giá 1 sản phẩm* (VND nguyên đồng, không nhập chữ ví dụ 150000):", ['parse_mode' => 'Markdown']);
                break;

            case 10: // Unit price
                $price = (float) trim($input);
                if ($price <= 0) {
                    $this->sendMessage($chatId, "⚠️ Đơn giá phải lớn hơn 0. Vui lòng nhập lại:");
                    return;
                }
                $draft['current_item']['unit_price'] = $price;
                $draft['items'][] = $draft['current_item'];
                unset($draft['current_item']);
                $session->update(['draft_data' => $draft, 'current_step' => 11]);

                $totalItems = count($draft['items']);
                $this->sendMessage($chatId, "✅ Đã thêm sản phẩm {$totalItems}!\n\nBạn có muốn thêm sản phẩm khác hay kết thúc?", [
                    'reply_markup' => json_encode([
                        'inline_keyboard' => [
                            [
                                ['text' => '➕ Thêm sản phẩm', 'callback_data' => 'ITEM_ADD_MORE'],
                                ['text' => '🏁 Xong, lưu đơn', 'callback_data' => 'ITEM_FINISH'],
                            ],
                        ],
                    ]),
                ]);
                break;

            case 11: // Add more items or finish
                if ($input === 'ITEM_ADD_MORE') {
                    $nextIndex = count($draft['items']) + 1;
                    $session->update(['current_step' => 7]);
                    $this->sendMessage($chatId, "📦 *Nhập sản phẩm {$nextIndex}:*\nNhập *Tên sản phẩm*:", ['parse_mode' => 'Markdown']);
                    return;
                }

                // Prompt Discount A-E
                $session->update(['current_step' => 12]);
                $this->sendMessage($chatId, "🏷️ Chọn *Mức chiết khấu toàn đơn* (A-E):", [
                    'reply_markup' => json_encode([
                        'inline_keyboard' => [
                            [['text' => 'A. Giảm 3%', 'callback_data' => 'DISC_A'], ['text' => 'B. Giảm 5%', 'callback_data' => 'DISC_B']],
                            [['text' => 'C. Giảm 10%', 'callback_data' => 'DISC_C'], ['text' => 'D. Giảm 15%', 'callback_data' => 'DISC_D']],
                            [['text' => 'E. Không giảm (0%)', 'callback_data' => 'DISC_E']],
                        ],
                    ]),
                ]);
                break;

            case 12: // Discount
                $discCode = str_replace('DISC_', '', strtoupper($input));
                if (!in_array($discCode, ['A', 'B', 'C', 'D', 'E'])) {
                    $discCode = 'E';
                }
                $draft['discount_code'] = $discCode;
                $session->update(['draft_data' => $draft, 'current_step' => 13]);
                $this->sendMessage($chatId, "📝 Nhập *Ghi chú cho đơn* (nhập dấu `-` nếu không có):", ['parse_mode' => 'Markdown']);
                break;

            case 13: // Note
                $draft['note'] = trim($input);
                $session->update(['draft_data' => $draft, 'current_step' => 14]);
                $this->sendMessage($chatId, "💳 Chọn *Hình thức thanh toán*:", [
                    'reply_markup' => json_encode([
                        'inline_keyboard' => [
                            [
                                ['text' => '💵 Tiền mặt', 'callback_data' => 'PAY_cash'],
                                ['text' => '🏦 CK (Chuyển khoản)', 'callback_data' => 'PAY_bank'],
                            ],
                            [
                                ['text' => '⏳ Chưa thanh toán', 'callback_data' => 'PAY_unpaid'],
                            ],
                        ],
                    ]),
                ]);
                break;

            case 14: // Payment method
                $cleanInput = trim($input);
                if ($cleanInput === 'PAY_cash' || mb_strtolower($cleanInput) === 'tiền mặt') {
                    $draft['payment_method'] = 'cash';
                    $this->finalizeOrderCreation($session, $draft, $chatId, $userId);
                    return;
                }

                if ($cleanInput === 'PAY_unpaid' || mb_strtolower($cleanInput) === 'chưa thanh toán') {
                    $draft['payment_method'] = 'unpaid';
                    $this->finalizeOrderCreation($session, $draft, $chatId, $userId);
                    return;
                }

                // Bank transfer / Card swipe selection
                $accounts = FinancialAccount::where('status', 'active')
                    ->whereIn('type', ['bank', 'card_gateway'])
                    ->orderBy('letter_code')
                    ->get();

                $keyboard = [];
                foreach ($accounts as $acc) {
                    $keyboard[] = [['text' => "{$acc->letter_code}. {$acc->name}", 'callback_data' => "ACC_{$acc->id}_{$acc->letter_code}"]];
                }

                $session->update(['current_step' => 15]);
                $this->sendMessage($chatId, "🏦 Chọn *Tài khoản thanh toán / Quẹt thẻ* (A-G):", [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
                ]);
                break;

            case 15: // Account selection
                preg_match('/ACC_(\d+)_([A-G])/', $input, $matches);
                $accId = (int) ($matches[1] ?? 0);
                $letter = $matches[2] ?? '';

                if ($letter === 'F') { // Quẹt thẻ
                    $draft['payment_method'] = 'card_swipe';
                    $session->update(['draft_data' => $draft, 'current_step' => 16]);
                    $this->sendMessage($chatId, "💳 Bạn đã chọn *QUẸT THẺ*.\nNhập *Ngày quẹt* (YYYY-MM-DD) hoặc bấm nút bên dưới để chọn *Hôm nay*:", [
                        'parse_mode' => 'Markdown',
                        'reply_markup' => json_encode([
                            'inline_keyboard' => [
                                [['text' => '📅 Hôm nay (' . now()->toDateString() . ')', 'callback_data' => 'DATE_TODAY']],
                            ],
                        ]),
                    ]);
                    return;
                }

                $draft['payment_method'] = 'bank_transfer';
                $draft['payment_account_id'] = $accId;
                $this->finalizeOrderCreation($session, $draft, $chatId, $userId);
                break;

            case 16: // Card swipe date
                $date = $input === 'DATE_TODAY' ? now()->toDateString() : trim($input);
                $draft['card_swipe_date'] = $date;
                $this->finalizeOrderCreation($session, $draft, $chatId, $userId);
                break;
        }
    }

    /**
     * Finalize Order and send receipt summary.
     */
    protected function finalizeOrderCreation(TelegramSession $session, array $draft, int $chatId, int $userId): void
    {
        try {
            $draft['branch_id'] = $session->selected_branch_id;
            $draft['telegram_user_id'] = $userId;

            $order = $this->orderService->createOrder($draft);

            // Reset session state
            $session->update([
                'current_mode' => null,
                'current_step' => 0,
                'draft_data' => [],
            ]);

            // Format receipt
            $itemRows = "";
            foreach ($order->items as $idx => $it) {
                $brandName = $it->brand?->name ?? '';
                $itemRows .= sprintf(
                    "%d. %s (%s) - SL: %d x %s = %sđ\n",
                    $idx + 1,
                    $it->product_name,
                    $brandName,
                    $it->quantity,
                    number_format($it->unit_price),
                    number_format($it->gross_amount)
                );
            }

            $paymentMethod = $order->payment?->method;
            $paymentText = match ($paymentMethod) {
                'cash' => "Tiền mặt ({$order->branch->name})",
                'card_swipe' => "QUẸT THẺ (Chờ tiền về - Ngày quẹt: {$order->payment->card_swipe_date})",
                'unpaid' => "Chưa thanh toán",
                default => "Chuyển khoản ({$order->payment?->account?->name})",
            };

            $msg = "✅ *ĐÃ LƯU ĐƠN HÀNG THÀNH CÔNG!*\n\n" .
                "📄 Mã đơn: `{$order->order_code}`\n" .
                "📅 Ngày bán: {$order->sale_date->format('d/m/Y')}\n" .
                "🏢 Chi nhánh: {$order->branch->name}\n" .
                "👤 Tư vấn viên: " . ($order->consultant?->name ?? $order->consultant_name) . "\n" .
                "👥 Khách hàng: {$order->customer_name} ({$order->customer_phone}) - {$order->customer_gender}\n" .
                "🌐 Nguồn: {$order->customerSource->name}\n\n" .
                "📦 *Chi tiết sản phẩm:*\n{$itemRows}\n" .
                "💰 Tổng trước giảm: *" . number_format($order->gross_amount) . "đ*\n" .
                "🏷️ Chiết khấu: *" . number_format($order->discount_amount) . "đ* (" . ($order->discount_rate * 100) . "%)\n" .
                "💵 Doanh thu sau giảm: *" . number_format($order->net_revenue) . "đ*\n" .
                "💳 Thanh toán: {$paymentText}\n" .
                "📝 Ghi chú: " . ($order->note ?: 'Không có') . "\n";

            $this->sendMessage($chatId, $msg, [
                'parse_mode' => 'Markdown',
                'reply_markup' => json_encode([
                    'inline_keyboard' => [
                        [['text' => '🔄 Nhập tiếp / Start', 'callback_data' => 'CMD_START']],
                    ],
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error("Failed to create order via Telegram: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $this->sendMessage($chatId, "❌ Lỗi lưu đơn hàng: " . $e->getMessage() . "\nVui lòng thử lại hoặc gõ /huy.");
        }
    }

    /**
     * Handle Expense Flow.
     */
    protected function handleExpenseFlow(TelegramSession $session, string $input, int $chatId, int $userId): void
    {
        $draft = $session->draft_data ?? [];
        $step = $session->current_step;

        switch ($step) {
            case 2: // Spender name
                $draft['spender_name'] = trim($input);
                $session->update(['draft_data' => $draft, 'current_step' => 3]);
                $this->sendMessage($chatId, "📝 Nhập *Nội dung chi*:", ['parse_mode' => 'Markdown']);
                break;

            case 3: // Content
                $draft['content'] = trim($input);
                $session->update(['draft_data' => $draft, 'current_step' => 4]);
                $this->sendMessage($chatId, "🔢 Nhập *Số lượng* (nhập 1 nếu là tổng hóa đơn):", ['parse_mode' => 'Markdown']);
                break;

            case 4: // Quantity
                $qty = (int) trim($input);
                if ($qty <= 0) {
                    $this->sendMessage($chatId, "⚠️ Số lượng phải lớn hơn 0. Vui lòng nhập lại:");
                    return;
                }
                $draft['quantity'] = $qty;
                $session->update(['draft_data' => $draft, 'current_step' => 5]);
                $this->sendMessage($chatId, "💰 Nhập *Giá tiền / Đơn giá* (VND nguyên đồng, ví dụ: 200000):", ['parse_mode' => 'Markdown']);
                break;

            case 5: // Unit price
                $price = (float) trim($input);
                if ($price < 0) {
                    $this->sendMessage($chatId, "⚠️ Giá tiền không được âm. Vui lòng nhập lại:");
                    return;
                }
                $draft['unit_price'] = $price;
                $draft['total_amount'] = $draft['quantity'] * $price;
                $session->update(['draft_data' => $draft, 'current_step' => 6]);

                $this->sendMessage($chatId, "💳 Chọn *Hình thức thanh toán*:", [
                    'reply_markup' => json_encode([
                        'inline_keyboard' => [
                            [
                                ['text' => '💵 Tiền mặt (Quỹ chi nhánh)', 'callback_data' => 'EXP_PAY_cash'],
                                ['text' => '🏦 Chuyển khoản ngân hàng', 'callback_data' => 'EXP_PAY_bank'],
                            ],
                        ],
                    ]),
                ]);
                break;

            case 6: // Payment method
                if ($input === 'EXP_PAY_cash') {
                    $draft['payment_method'] = 'cash';
                    $session->update(['draft_data' => $draft, 'current_step' => 8]);
                    $this->sendMessage($chatId, "📝 Nhập *Ghi chú khoản chi* (nhập dấu `-` nếu không có):", ['parse_mode' => 'Markdown']);
                    return;
                }

                // Bank accounts A-G (F is prohibited!)
                $accounts = FinancialAccount::where('status', 'active')
                    ->where('type', 'bank') // Strictly excluding F
                    ->orderBy('letter_code')
                    ->get();

                $keyboard = [];
                foreach ($accounts as $acc) {
                    $keyboard[] = [['text' => "{$acc->letter_code}. {$acc->name}", 'callback_data' => "EXP_ACC_{$acc->id}"]];
                }

                $session->update(['current_step' => 7]);
                $this->sendMessage($chatId, "🏦 Chi từ *Tài khoản ngân hàng nào* (chọn A-G, F không dùng cho chi):", [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
                ]);
                break;

            case 7: // Bank account
                $accId = (int) str_replace('EXP_ACC_', '', $input);
                $draft['payment_method'] = 'bank_transfer';
                $draft['account_id'] = $accId;
                $session->update(['draft_data' => $draft, 'current_step' => 8]);
                $this->sendMessage($chatId, "📝 Nhập *Ghi chú khoản chi* (nhập dấu `-` nếu không có):", ['parse_mode' => 'Markdown']);
                break;

            case 8: // Note & Finalize
                $draft['note'] = trim($input);
                $this->finalizeExpenseCreation($session, $draft, $chatId, $userId);
                break;
        }
    }

    /**
     * Finalize Expense and send receipt summary.
     */
    protected function finalizeExpenseCreation(TelegramSession $session, array $draft, int $chatId, int $userId): void
    {
        try {
            $draft['branch_id'] = $session->selected_branch_id;
            $draft['telegram_user_id'] = $userId;

            $expense = $this->expenseService->createExpense($draft);

            // Reset session
            $session->update([
                'current_mode' => null,
                'current_step' => 0,
                'draft_data' => [],
            ]);

            $sourceText = $expense->method === 'cash' ? "Quỹ tiền mặt ({$expense->branch->name})" :
                "Tài khoản ({$expense->account?->name})";

            $msg = "✅ *ĐÃ LƯU ĐƠN CHI TIÊU!*\n\n" .
                "📄 Mã chi: `{$expense->expense_code}`\n" .
                "📅 Ngày chi: {$expense->expense_date->format('d/m/Y')}\n" .
                "🏢 Chi nhánh: {$expense->branch->name}\n" .
                "👤 Người chi: {$expense->spender_name}\n" .
                "📝 Nội dung: {$expense->content}\n" .
                "🔢 Số lượng: {$expense->quantity}\n" .
                "💰 Đơn giá: " . number_format($expense->unit_price) . "đ\n" .
                "💸 *Tổng chi:* *" . number_format($expense->total_amount) . "đ*\n" .
                "💳 Nguồn tiền: {$sourceText}\n" .
                "📌 Ghi chú: " . ($expense->note ?: 'Không có') . "\n";

            $this->sendMessage($chatId, $msg, [
                'parse_mode' => 'Markdown',
                'reply_markup' => json_encode([
                    'inline_keyboard' => [
                        [['text' => '🔄 Nhập tiếp / Start', 'callback_data' => 'CMD_START']],
                    ],
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error("Failed to create expense via Telegram: " . $e->getMessage());
            $this->sendMessage($chatId, "❌ Lỗi lưu chi tiêu: " . $e->getMessage() . "\nVui lòng thử lại hoặc gõ /huy.");
        }
    }

    /**
     * Send message via Telegram Bot API.
     */
    public function sendMessage(int $chatId, string $text, array $extra = []): ?array
    {
        if (!$this->botToken) {
            Log::info("Telegram Bot Token not configured. Simulated sending to {$chatId}: {$text}");
            return null;
        }

        try {
            $payload = array_merge([
                'chat_id' => $chatId,
                'text' => $text,
            ], $extra);

            $response = Http::post("https://api.telegram.org/bot{$this->botToken}/sendMessage", $payload);
            return $response->json();
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message: " . $e->getMessage());
            return null;
        }
    }
}
