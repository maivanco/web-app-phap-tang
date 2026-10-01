<?php

namespace App\Modules\CashFlow\Services;

use InvalidArgumentException;

class OrderCalculationService
{
    public const DISCOUNT_RATES = [
        'A' => 0.03, // 3%
        'B' => 0.05, // 5%
        'C' => 0.10, // 10%
        'D' => 0.15, // 15%
        'E' => 0.00, // 0%
    ];

    /**
     * Calculate order totals and allocate discount proportionally across items.
     *
     * @param array<int, array{quantity: int, unit_price: float|int, [product_name]: string, [brand_id]: int}> $items
     * @param string $discountCode (A, B, C, D, E)
     * @return array{
     *     discount_code: string,
     *     discount_rate: float,
     *     gross_amount: float,
     *     discount_amount: float,
     *     net_revenue: float,
     *     items: array<int, array{
     *         line_number: int,
     *         quantity: int,
     *         unit_price: float,
     *         gross_amount: float,
     *         allocated_discount: float,
     *         net_amount: float
     *     }>
     * }
     */
    public function calculate(array $items, string $discountCode = 'E'): array
    {
        $discountCode = strtoupper(trim($discountCode));
        if (!array_key_exists($discountCode, self::DISCOUNT_RATES)) {
            throw new InvalidArgumentException("Invalid discount code: {$discountCode}");
        }

        $discountRate = self::DISCOUNT_RATES[$discountCode];

        $totalGross = 0.0;
        $processedItems = [];

        foreach ($items as $index => $item) {
            $qty = (int) ($item['quantity'] ?? 0);
            $unitPrice = (float) ($item['unit_price'] ?? 0);

            if ($qty <= 0) {
                throw new InvalidArgumentException("Quantity for item " . ($index + 1) . " must be greater than 0");
            }
            if ($unitPrice <= 0) {
                throw new InvalidArgumentException("Unit price for item " . ($index + 1) . " must be greater than 0");
            }

            $lineGross = (float) ($qty * $unitPrice);
            $totalGross += $lineGross;

            $processedItems[] = array_merge($item, [
                'line_number' => $index + 1,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'gross_amount' => $lineGross,
                'allocated_discount' => 0.0,
                'net_amount' => $lineGross,
            ]);
        }

        // Calculate order-level discount and round to nearest whole VND
        $orderDiscountAmount = (float) round($totalGross * $discountRate);
        $netRevenue = (float) ($totalGross - $orderDiscountAmount);

        // Allocate discount across line items proportionally
        $allocatedSoFar = 0.0;
        $totalItems = count($processedItems);

        foreach ($processedItems as $i => &$item) {
            if ($orderDiscountAmount <= 0 || $totalGross <= 0) {
                $item['allocated_discount'] = 0.0;
                $item['net_amount'] = $item['gross_amount'];
                continue;
            }

            if ($i === $totalItems - 1) {
                // Adjust discrepancy on the last item so allocated discounts strictly equal order discount
                $itemAllocated = (float) ($orderDiscountAmount - $allocatedSoFar);
            } else {
                $itemAllocated = (float) round($item['gross_amount'] * ($orderDiscountAmount / $totalGross));
                $allocatedSoFar += $itemAllocated;
            }

            $item['allocated_discount'] = $itemAllocated;
            $item['net_amount'] = (float) ($item['gross_amount'] - $itemAllocated);
        }
        unset($item);

        return [
            'discount_code' => $discountCode,
            'discount_rate' => $discountRate,
            'gross_amount' => $totalGross,
            'discount_amount' => $orderDiscountAmount,
            'net_revenue' => $netRevenue,
            'items' => $processedItems,
        ];
    }
}
