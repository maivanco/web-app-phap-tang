<?php

namespace App\Services;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Universal Excel Export Service.
 *
 * Provides a fluent, reusable engine for exporting Eloquent queries,
 * collections, or arrays into beautifully styled XLSX spreadsheets.
 *
 * Example:
 * ```php
 * return ExcelExportService::make()
 *     ->title('Danh sách đơn hàng')
 *     ->columns([
 *         ['header' => 'Mã đơn', 'key' => 'order_code', 'format' => 'string'],
 *         ['header' => 'Khách hàng', 'key' => 'customer_name'],
 *         ['header' => 'SĐT', 'key' => 'customer_phone', 'format' => 'string'],
 *         ['header' => 'Tổng tiền', 'key' => 'net_revenue', 'format' => 'currency'],
 *     ])
 *     ->fromQuery($query)
 *     ->download('orders.xlsx');
 * ```
 */
class ExcelExportService
{
    protected ?string $title = null;
    protected ?string $sheetName = null;
    protected array $columns = [];
    protected mixed $dataSource = null;
    protected string $sourceType = 'array'; // 'query', 'collection', 'array'
    protected int $chunkSize = 500;
    protected bool $showFilter = true;
    protected bool $freezeHeader = true;
    protected bool $zebraStriping = true;

    public function __construct() {}

    /**
     * Create a new instance fluently.
     */
    public static function make(): static
    {
        return new static();
    }

    /**
     * Set the main sheet title (displayed as a header banner).
     */
    public function title(?string $title): static
    {
        $this->title = $title;
        return $this;
    }

    /**
     * Set the worksheet tab name.
     */
    public function sheetName(?string $name): static
    {
        $this->sheetName = $name;
        return $this;
    }

    /**
     * Set the column definitions.
     *
     * Each column can have:
     * - `header` (string, required): Header text
     * - `key` (string|callable, optional): Attribute name, dot notation (e.g. 'branch.name'), or callback fn($row, $index)
     * - `format` (string, optional): 'string', 'text', 'currency', 'number', 'integer', 'decimal', 'date', 'datetime', 'percentage'
     * - `width` (float|int, optional): Fixed column width (if omitted, auto-sizes)
     * - `align` (string, optional): 'left', 'center', 'right'
     * - `wrap` (bool, optional): Enable text wrapping
     */
    public function columns(array $columns): static
    {
        $this->columns = $columns;
        return $this;
    }

    /**
     * Source data from an Eloquent query builder (chunked for memory efficiency).
     */
    public function fromQuery(Builder $query, int $chunkSize = 500): static
    {
        $this->dataSource = $query;
        $this->sourceType = 'query';
        $this->chunkSize = $chunkSize;
        return $this;
    }

    /**
     * Source data from a Collection.
     */
    public function fromCollection(Collection $collection): static
    {
        $this->dataSource = $collection;
        $this->sourceType = 'collection';
        return $this;
    }

    /**
     * Source data from an array.
     */
    public function fromArray(array $rows): static
    {
        $this->dataSource = $rows;
        $this->sourceType = 'array';
        return $this;
    }

    /**
     * Enable or disable auto-filter on the header row.
     */
    public function autoFilter(bool $enable = true): static
    {
        $this->showFilter = $enable;
        return $this;
    }

    /**
     * Enable or disable freeze panes on the header row.
     */
    public function freezeHeader(bool $enable = true): static
    {
        $this->freezeHeader = $enable;
        return $this;
    }

    /**
     * Enable or disable alternating row background colors.
     */
    public function zebraStriping(bool $enable = true): static
    {
        $this->zebraStriping = $enable;
        return $this;
    }

    /**
     * Build the PhpSpreadsheet instance with all data and styles applied.
     */
    public function buildSpreadsheet(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        if ($this->sheetName) {
            $sheet->setTitle(mb_substr($this->sheetName, 0, 31));
        }

        $currentRow = 1;
        $columnCount = count($this->columns);
        $lastColumnLetter = Coordinate::stringFromColumnIndex(max(1, $columnCount));

        // 1. Optional Title Banner
        if ($this->title) {
            $sheet->mergeCells("A{$currentRow}:{$lastColumnLetter}{$currentRow}");
            $sheet->setCellValue("A{$currentRow}", $this->title);
            $sheet->getStyle("A{$currentRow}")->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => 14,
                    'color' => ['rgb' => '1E293B'],
                    'name' => 'Segoe UI',
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getRowDimension($currentRow)->setRowHeight(32);
            $currentRow++;

            // Optional subtitle row with export timestamp
            $sheet->mergeCells("A{$currentRow}:{$lastColumnLetter}{$currentRow}");
            $sheet->setCellValue("A{$currentRow}", 'Thời gian xuất: ' . now()->format('d/m/Y H:i:s'));
            $sheet->getStyle("A{$currentRow}")->applyFromArray([
                'font' => [
                    'italic' => true,
                    'size' => 9,
                    'color' => ['rgb' => '64748B'],
                    'name' => 'Segoe UI',
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getRowDimension($currentRow)->setRowHeight(18);
            $currentRow += 2; // Leave a blank line before headers
        }

        $headerRow = $currentRow;

        // 2. Render Headers
        foreach ($this->columns as $index => $col) {
            $colLetter = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$colLetter}{$headerRow}", $col['header'] ?? '');
        }

        // Header Styling
        $sheet->getStyle("A{$headerRow}:{$lastColumnLetter}{$headerRow}")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 10,
                'name' => 'Segoe UI',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'], // Modern Slate 800
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(28);

        // 3. Render Data Rows
        $currentRow++;
        $firstDataRow = $currentRow;
        $recordIndex = 0;

        $processRow = function ($item) use (&$currentRow, &$recordIndex, $sheet) {
            $recordIndex++;
            $isEvenRow = ($recordIndex % 2 === 0);

            foreach ($this->columns as $colIndex => $col) {
                $colLetter = Coordinate::stringFromColumnIndex($colIndex + 1);
                $cellCoordinate = "{$colLetter}{$currentRow}";

                // Resolve cell value
                $value = $this->resolveCellValue($col, $item, $recordIndex);
                $format = $col['format'] ?? null;
                $align = $col['align'] ?? null;

                $this->formatAndSetCell($sheet, $cellCoordinate, $value, $format, $align, !empty($col['wrap']));
            }

            // Zebra Striping
            if ($this->zebraStriping && $isEvenRow) {
                $sheet->getStyle("A{$currentRow}:" . Coordinate::stringFromColumnIndex(count($this->columns)) . "{$currentRow}")
                    ->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()
                    ->setRGB('F8FAFC');
            }

            $sheet->getRowDimension($currentRow)->setRowHeight(22);
            $currentRow++;
        };

        // Stream or iterate data source
        if ($this->sourceType === 'query' && $this->dataSource instanceof Builder) {
            $this->dataSource->chunk($this->chunkSize, function ($chunk) use ($processRow) {
                foreach ($chunk as $item) {
                    $processRow($item);
                }
            });
        } elseif ($this->sourceType === 'collection' && $this->dataSource instanceof Collection) {
            foreach ($this->dataSource as $item) {
                $processRow($item);
            }
        } elseif (is_iterable($this->dataSource)) {
            foreach ($this->dataSource as $item) {
                $processRow($item);
            }
        }

        $lastDataRow = max($firstDataRow, $currentRow - 1);

        // 4. Data Borders
        if ($lastDataRow >= $firstDataRow && $columnCount > 0) {
            $sheet->getStyle("A{$firstDataRow}:{$lastColumnLetter}{$lastDataRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);
        }

        // 5. Freeze Pane & AutoFilter
        if ($this->freezeHeader) {
            $nextRow = $headerRow + 1;
            $sheet->freezePane("A{$nextRow}");
        }

        if ($this->showFilter && $lastDataRow >= $firstDataRow && $columnCount > 0) {
            $sheet->setAutoFilter("A{$headerRow}:{$lastColumnLetter}{$lastDataRow}");
        }

        // 6. Column Widths
        foreach ($this->columns as $index => $col) {
            $colLetter = Coordinate::stringFromColumnIndex($index + 1);
            if (!empty($col['width'])) {
                $sheet->getColumnDimension($colLetter)->setWidth((float) $col['width']);
            } else {
                $sheet->getColumnDimension($colLetter)->setAutoSize(true);
            }
        }

        return $spreadsheet;
    }

    /**
     * Resolve the value of a cell from a row item.
     */
    protected function resolveCellValue(array $col, mixed $item, int $index): mixed
    {
        $key = $col['key'] ?? null;

        if ($key instanceof Closure) {
            return $key($item, $index);
        }

        if (is_string($key)) {
            return data_get($item, $key);
        }

        return null;
    }

    /**
     * Format and set value on a specific cell.
     */
    protected function formatAndSetCell(
        $sheet,
        string $coordinate,
        mixed $value,
        ?string $format,
        ?string $align,
        bool $wrapText
    ): void {
        $cell = $sheet->getCell($coordinate);
        $style = $sheet->getStyle($coordinate);

        // Text wrapping
        if ($wrapText) {
            $style->getAlignment()->setWrapText(true);
        }

        // Default vertical alignment
        $style->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        // Handle specific formats
        switch ($format) {
            case 'currency':
            case 'money':
                $numericValue = is_numeric($value) ? (float) $value : 0;
                $sheet->setCellValueExplicit($coordinate, $numericValue, DataType::TYPE_NUMERIC);
                $style->getNumberFormat()->setFormatCode('#,##0');
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_RIGHT
                );
                break;

            case 'number':
            case 'integer':
                $numericValue = is_numeric($value) ? (int) $value : 0;
                $sheet->setCellValueExplicit($coordinate, $numericValue, DataType::TYPE_NUMERIC);
                $style->getNumberFormat()->setFormatCode('#,##0');
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_RIGHT
                );
                break;

            case 'decimal':
                $numericValue = is_numeric($value) ? (float) $value : 0;
                $sheet->setCellValueExplicit($coordinate, $numericValue, DataType::TYPE_NUMERIC);
                $style->getNumberFormat()->setFormatCode('#,##0.00');
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_RIGHT
                );
                break;

            case 'percentage':
                $numericValue = is_numeric($value) ? (float) $value : 0;
                $sheet->setCellValueExplicit($coordinate, $numericValue, DataType::TYPE_NUMERIC);
                $style->getNumberFormat()->setFormatCode('0.0%');
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_CENTER
                );
                break;

            case 'date':
                $dateStr = $this->formatDateString($value, 'Y-m-d');
                $sheet->setCellValueExplicit($coordinate, $dateStr, DataType::TYPE_STRING);
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_CENTER
                );
                break;

            case 'datetime':
                $dateStr = $this->formatDateString($value, 'Y-m-d H:i:s');
                $sheet->setCellValueExplicit($coordinate, $dateStr, DataType::TYPE_STRING);
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_CENTER
                );
                break;

            case 'string':
            case 'text':
                $sheet->setCellValueExplicit($coordinate, (string) ($value ?? ''), DataType::TYPE_STRING);
                $style->getAlignment()->setHorizontal(
                    $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_LEFT
                );
                break;

            default:
                if (is_numeric($value) && !str_starts_with((string) $value, '0')) {
                    $sheet->setCellValueExplicit($coordinate, $value + 0, DataType::TYPE_NUMERIC);
                    $style->getAlignment()->setHorizontal(
                        $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_RIGHT
                    );
                } else {
                    $sheet->setCellValueExplicit($coordinate, (string) ($value ?? ''), DataType::TYPE_STRING);
                    $style->getAlignment()->setHorizontal(
                        $align ? $this->resolveAlignment($align) : Alignment::HORIZONTAL_LEFT
                    );
                }
                break;
        }

        // Apply font
        $style->getFont()->setName('Segoe UI')->setSize(10);
    }

    /**
     * Map alignment string to PhpSpreadsheet constant.
     */
    protected function resolveAlignment(string $align): string
    {
        return match (strtolower($align)) {
            'center' => Alignment::HORIZONTAL_CENTER,
            'right' => Alignment::HORIZONTAL_RIGHT,
            default => Alignment::HORIZONTAL_LEFT,
        };
    }

    /**
     * Format a date value safely.
     */
    protected function formatDateString(mixed $value, string $pattern): string
    {
        if (empty($value)) {
            return '';
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format($pattern);
        }

        try {
            return (new \DateTime((string) $value))->format($pattern);
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    /**
     * Download the spreadsheet as a streamed response.
     */
    public function download(string $filename): StreamedResponse
    {
        if (!str_ends_with(strtolower($filename), '.xlsx')) {
            $filename .= '.xlsx';
        }

        $spreadsheet = $this->buildSpreadsheet();
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(
            function () use ($writer, $spreadsheet) {
                $writer->save('php://output');
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
            },
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'max-age=0, no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]
        );
    }

    /**
     * Save the spreadsheet to local storage or disk.
     */
    public function store(string $path, string $disk = 'local'): string
    {
        $spreadsheet = $this->buildSpreadsheet();
        $writer = new Xlsx($spreadsheet);

        $tempPath = tempnam(sys_get_temp_dir(), 'export_');
        $writer->save($tempPath);
        $spreadsheet->disconnectWorksheets();

        $contents = file_get_contents($tempPath);
        @unlink($tempPath);

        \Illuminate\Support\Facades\Storage::disk($disk)->put($path, $contents);

        return $path;
    }

    /**
     * Get the raw binary contents of the XLSX file.
     */
    public function raw(): string
    {
        $spreadsheet = $this->buildSpreadsheet();
        $writer = new Xlsx($spreadsheet);

        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();
        $spreadsheet->disconnectWorksheets();

        return (string) $content;
    }
}
