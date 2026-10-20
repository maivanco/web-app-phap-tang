---
name: excel-exporter
description: Guidelines and patterns for creating and reusing the general ExcelExportService for XLSX exports across all modules in this project.
---

# General Excel Exporter Service (`ExcelExportService`)

## Overview

The `App\Services\ExcelExportService` is a centralized, modular, and fluent XLSX exporter service powered by `phpoffice/phpspreadsheet`. It is designed to be easily reused across any Laravel module (e.g. `CashFlow`, `ProjectBuilder`, `Settings`, etc.) to export Eloquent queries, collections, or raw arrays.

## Key Features

1. **Fluent Interface**: Build exports with chainable methods (`make()`, `title()`, `sheetName()`, `columns()`, `fromQuery()`, `download()`).
2. **Memory Efficiency**: Chunked querying (`fromQuery($query, $chunkSize = 500)`) prevents out-of-memory errors on large datasets.
3. **Data Type Handling**:
   - `'string'` / `'text'`: Explicitly formatted as text (prevents Excel from stripping leading zeroes from phone numbers, ID codes, etc.).
   - `'currency'` / `'money'`: Formatted as numeric `#,#00` with right alignment.
   - `'number'` / `'integer'`: Formatted as numeric `#,#00`.
   - `'decimal'`: Formatted as `#,#00.00`.
   - `'percentage'`: Formatted as `0.0%` with center alignment.
   - `'date'`: Formatted as `Y-m-d` or `d/m/Y` with center alignment.
   - `'datetime'`: Formatted as `Y-m-d H:i:s` with center alignment.
4. **Professional Modern Styling**:
   - Header: Dark slate background (`#1E293B`), white bold text, centered, auto-height.
   - Auto-filter on header columns.
   - Freeze pane on header row for easy scrolling.
   - Zebra striping (`#F8FAFC` alternating rows).
   - Clean thin gray grid borders (`#E2E8F0`).
   - Auto-calculated column widths or custom explicit widths.
5. **Direct Streaming Download**: Native Laravel `streamDownload` without disk overhead.

---

## Backend Usage Pattern

### 1. In a Controller Action

```php
use App\Services\ExcelExportService;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Http\Request;

public function export(Request $request): StreamedResponse
{
    // 1. Reuse existing filter query
    $query = $this->buildFilterQuery($request);

    $filename = 'Orders_' . now()->format('Ymd_His') . '.xlsx';

    // 2. Configure exporter
    return ExcelExportService::make()
        ->title('SALES ORDERS REPORT')
        ->sheetName('Orders')
        ->columns([
            [
                'header' => 'Order Code',
                'key' => 'order_code',
                'format' => 'string',
                'width' => 18,
            ],
            [
                'header' => 'Date',
                'key' => 'sale_date',
                'format' => 'date',
                'width' => 14,
            ],
            [
                'header' => 'Customer',
                'key' => 'customer_name',
                'width' => 20,
            ],
            [
                'header' => 'Phone',
                'key' => 'customer_phone',
                'format' => 'string',
                'width' => 16,
            ],
            [
                'header' => 'Branch',
                'key' => fn($item) => $item->branch?->name ?? 'N/A',
                'width' => 18,
            ],
            [
                'header' => 'Net Revenue',
                'key' => 'net_revenue',
                'format' => 'currency',
                'width' => 18,
            ],
            [
                'header' => 'Status',
                'key' => fn($item) => $item->status === 'completed' ? 'Completed' : 'Cancelled',
                'align' => 'center',
                'width' => 14,
            ],
        ])
        ->fromQuery($query)
        ->download($filename);
}
```

### 2. Supported Output Methods

- `->download('filename.xlsx')`: Returns a `Symfony\Component\HttpFoundation\StreamedResponse` for direct browser download.
- `->store('exports/file.xlsx', 'local')`: Saves the file to a Laravel Storage disk.
- `->raw()`: Returns binary string content (useful for email attachments or Telegram bot document uploads).
- `->buildSpreadsheet()`: Returns the underlying `PhpOffice\PhpSpreadsheet\Spreadsheet` instance for advanced custom operations.

---

## Route Configuration Rules

When defining the export route in `routes.php` or `app/Modules/{Module}/routes.php`:

```php
// IMPORTANT: Place the export route BEFORE parameterized wildcard routes (e.g. /orders/{order})
Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
Route::get('/orders/export', [OrderController::class, 'export'])->name('orders.export');
Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
```

---

## Frontend Integration Pattern (Inertia + React)

In your React/Inertia page component (e.g. `Index.tsx`):

1. Construct the export URL with all current active filters using Ziggy:

```tsx
const exportUrl = route('admin.cashflow.orders.export', {
    search: search || undefined,
    product_name: productName || undefined,
    branch_id: branchId || undefined,
    status: status || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
});
```

2. Render the Export button:

```tsx
<a
    href={exportUrl}
    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-md font-medium transition shadow-sm flex items-center gap-1.5 text-xs"
    title="Export current filtered data to Excel (.xlsx)"
>
    <span>📊</span> Export Excel (.xlsx)
</a>
```

> **Note**: Always use standard anchor tags `<a>` or `window.location.href` for file downloads instead of Inertia `<Link>` or `router.get`, so the browser handles it as a file attachment download instead of an Inertia JSON request.
