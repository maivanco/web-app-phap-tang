<?php

namespace App\Modules\CashFlow\Services;

use App\Modules\CashFlow\Models\TransactionAudit;
use Illuminate\Database\Eloquent\Model;

class AuditService
{
    /**
     * Record an audit entry with before and after state snapshots.
     */
    public function recordAudit(
        Model $auditable,
        string $action,
        int $version,
        string $reason,
        array $beforePayload,
        ?array $afterPayload = null,
        ?int $userId = null,
        ?int $telegramUserId = null
    ): TransactionAudit {
        return TransactionAudit::create([
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->getKey(),
            'action' => $action,
            'version' => $version,
            'reason' => trim($reason),
            'before_payload' => $beforePayload,
            'after_payload' => $afterPayload,
            'user_id' => $userId,
            'telegram_user_id' => $telegramUserId,
        ]);
    }
}
