<?php

namespace App\Modules\ReceiptNotes\Services;

use App\Models\User;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use App\Modules\ReceiptNotes\Models\ReceiptNote;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReceiptNoteService
{
    public function __construct(
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    /**
     * Generate next unique note code (e.g. PGN-261022-0001).
     */
    public function generateNoteCode(): string
    {
        $prefix = 'PGN-'.date('ymd').'-';

        return DB::transaction(function () use ($prefix) {
            $latest = ReceiptNote::where('note_code', 'like', "{$prefix}%")
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('note_code');

            if ($latest && preg_match('/(\d{4})$/', $latest, $matches)) {
                $seq = (int) $matches[1] + 1;
            } else {
                $seq = 1;
            }

            return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        });
    }

    /**
     * Create a new Receipt Note.
     */
    public function createReceiptNote(array $data, ?User $user = null, ?int $telegramUserId = null): ReceiptNote
    {
        $noteCode = ! empty($data['note_code']) ? trim($data['note_code']) : $this->generateNoteCode();

        $receiptNote = new ReceiptNote;
        $receiptNote->note_code = $noteCode;
        $receiptNote->received_date = ! empty($data['received_date']) ? Carbon::parse($data['received_date']) : now()->toDateString();
        $receiptNote->appointment_date = ! empty($data['appointment_date']) ? Carbon::parse($data['appointment_date']) : null;
        $receiptNote->customer_name = $data['customer_name'] ?? '';
        $receiptNote->customer_phone = $data['customer_phone'] ?? null;

        $receiptNote->service_types = $data['service_types'] ?? [];
        $receiptNote->other_service_description = $data['other_service_description'] ?? null;
        $receiptNote->estimated_price = (float) ($data['estimated_price'] ?? 0);
        $receiptNote->estimated_pickup_time = $data['estimated_pickup_time'] ?? null;
        $receiptNote->has_photos_saved = (bool) ($data['has_photos_saved'] ?? false);

        $receiptNote->inspected_at_counter = (bool) ($data['inspected_at_counter'] ?? false);
        $receiptNote->final_amount = (float) ($data['final_amount'] ?? 0);
        $receiptNote->status = $data['status'] ?? 'chua_giao';

        if (! empty($data['delivered_at'])) {
            $receiptNote->delivered_at = Carbon::parse($data['delivered_at']);
        } elseif ($receiptNote->status === 'da_giao') {
            $receiptNote->delivered_at = now();
        }

        $receiptNote->proxy_receiver_info = $data['proxy_receiver_info'] ?? null;
        $receiptNote->receiver_signature = $data['receiver_signature'] ?? null;
        $receiptNote->delivery_staff_name = $data['delivery_staff_name'] ?? null;

        $receiptNote->branch_id = $data['branch_id'] ?? null;
        $receiptNote->created_by = $user?->id ?? ($data['created_by'] ?? null);
        $receiptNote->telegram_user_id = $telegramUserId ?? ($data['telegram_user_id'] ?? null);
        $receiptNote->notes = $data['notes'] ?? null;

        $receiptNote->save();

        // Sync to Google Sheets
        try {
            $this->sheetsSyncService->syncReceiptNote($receiptNote, 'append');
        } catch (\Throwable $e) {
            Log::error('Google Sheets sync failed for ReceiptNote: '.$e->getMessage());
        }

        return $receiptNote;
    }

    /**
     * Update an existing Receipt Note.
     */
    public function updateReceiptNote(ReceiptNote $receiptNote, array $data): ReceiptNote
    {
        if (isset($data['note_code']) && ! empty($data['note_code'])) {
            $receiptNote->note_code = trim($data['note_code']);
        }
        if (isset($data['received_date'])) {
            $receiptNote->received_date = Carbon::parse($data['received_date']);
        }
        if (array_key_exists('appointment_date', $data)) {
            $receiptNote->appointment_date = ! empty($data['appointment_date']) ? Carbon::parse($data['appointment_date']) : null;
        }
        if (isset($data['customer_name'])) {
            $receiptNote->customer_name = $data['customer_name'];
        }
        if (array_key_exists('customer_phone', $data)) {
            $receiptNote->customer_phone = $data['customer_phone'];
        }
        if (isset($data['service_types'])) {
            $receiptNote->service_types = $data['service_types'];
        }
        if (array_key_exists('other_service_description', $data)) {
            $receiptNote->other_service_description = $data['other_service_description'];
        }
        if (isset($data['estimated_price'])) {
            $receiptNote->estimated_price = (float) $data['estimated_price'];
        }
        if (array_key_exists('estimated_pickup_time', $data)) {
            $receiptNote->estimated_pickup_time = $data['estimated_pickup_time'];
        }
        if (isset($data['has_photos_saved'])) {
            $receiptNote->has_photos_saved = (bool) $data['has_photos_saved'];
        }
        if (isset($data['inspected_at_counter'])) {
            $receiptNote->inspected_at_counter = (bool) $data['inspected_at_counter'];
        }
        if (isset($data['final_amount'])) {
            $receiptNote->final_amount = (float) $data['final_amount'];
        }
        if (isset($data['status'])) {
            $receiptNote->status = $data['status'];
            if ($receiptNote->status === 'da_giao' && empty($receiptNote->delivered_at)) {
                $receiptNote->delivered_at = now();
            }
        }
        if (array_key_exists('delivered_at', $data)) {
            $receiptNote->delivered_at = ! empty($data['delivered_at']) ? Carbon::parse($data['delivered_at']) : null;
        }
        if (array_key_exists('proxy_receiver_info', $data)) {
            $receiptNote->proxy_receiver_info = $data['proxy_receiver_info'];
        }
        if (array_key_exists('receiver_signature', $data)) {
            $receiptNote->receiver_signature = $data['receiver_signature'];
        }
        if (array_key_exists('delivery_staff_name', $data)) {
            $receiptNote->delivery_staff_name = $data['delivery_staff_name'];
        }
        if (array_key_exists('branch_id', $data)) {
            $receiptNote->branch_id = $data['branch_id'];
        }
        if (array_key_exists('notes', $data)) {
            $receiptNote->notes = $data['notes'];
        }

        $receiptNote->save();

        // Sync to Google Sheets
        try {
            $this->sheetsSyncService->syncReceiptNote($receiptNote, 'append');
        } catch (\Throwable $e) {
            Log::error('Google Sheets sync failed on update for ReceiptNote: '.$e->getMessage());
        }

        return $receiptNote;
    }

    /**
     * Mark note as delivered quickly.
     */
    public function markAsDelivered(ReceiptNote $receiptNote, array $data = []): ReceiptNote
    {
        $receiptNote->status = 'da_giao';
        $receiptNote->delivered_at = ! empty($data['delivered_at']) ? Carbon::parse($data['delivered_at']) : now();
        $receiptNote->inspected_at_counter = true;

        if (isset($data['final_amount'])) {
            $receiptNote->final_amount = (float) $data['final_amount'];
        } elseif ($receiptNote->final_amount <= 0 && $receiptNote->estimated_price > 0) {
            $receiptNote->final_amount = $receiptNote->estimated_price;
        }

        if (! empty($data['delivery_staff_name'])) {
            $receiptNote->delivery_staff_name = $data['delivery_staff_name'];
        }
        if (! empty($data['receiver_signature'])) {
            $receiptNote->receiver_signature = $data['receiver_signature'];
        }
        if (! empty($data['proxy_receiver_info'])) {
            $receiptNote->proxy_receiver_info = $data['proxy_receiver_info'];
        }

        $receiptNote->save();

        try {
            $this->sheetsSyncService->syncReceiptNote($receiptNote, 'append');
        } catch (\Throwable $e) {
            Log::error('Google Sheets sync failed on mark delivered: '.$e->getMessage());
        }

        return $receiptNote;
    }
}
