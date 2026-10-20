<?php

namespace Tests\Unit;

use App\Services\ExcelExportService;
use PHPUnit\Framework\TestCase;

class ExcelExportServiceTest extends TestCase
{
    public function test_can_build_spreadsheet_from_array(): void
    {
        $exporter = ExcelExportService::make()
            ->title('Test Export')
            ->columns([
                ['header' => 'Name', 'key' => 'name'],
                ['header' => 'Phone', 'key' => 'phone', 'format' => 'string'],
                ['header' => 'Revenue', 'key' => 'revenue', 'format' => 'currency'],
            ])
            ->fromArray([
                ['name' => 'John Doe', 'phone' => '0901234567', 'revenue' => 1500000],
                ['name' => 'Jane Smith', 'phone' => '0912345678', 'revenue' => 2500000],
            ]);

        $spreadsheet = $exporter->buildSpreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Check title in A1
        $this->assertEquals('Test Export', $sheet->getCell('A1')->getValue());

        // Header should be on row 4 (A1 is title, A2 is timestamp, A3 is blank)
        $this->assertEquals('Name', $sheet->getCell('A4')->getValue());
        $this->assertEquals('Phone', $sheet->getCell('B4')->getValue());
        $this->assertEquals('Revenue', $sheet->getCell('C4')->getValue());

        // Row 5 should have first item
        $this->assertEquals('John Doe', $sheet->getCell('A5')->getValue());
        $this->assertEquals('0901234567', $sheet->getCell('B5')->getValue());
        $this->assertEquals(1500000, $sheet->getCell('C5')->getValue());

        // Row 6 should have second item
        $this->assertEquals('Jane Smith', $sheet->getCell('A6')->getValue());
        $this->assertEquals('0912345678', $sheet->getCell('B6')->getValue());
        $this->assertEquals(2500000, $sheet->getCell('C6')->getValue());
    }

    public function test_can_generate_raw_xlsx_binary(): void
    {
        $exporter = ExcelExportService::make()
            ->columns([
                ['header' => 'Code', 'key' => 'code'],
            ])
            ->fromArray([
                ['code' => 'ABC-123'],
            ]);

        $raw = $exporter->raw();
        $this->assertNotEmpty($raw);
        // PK zip signature for xlsx
        $this->assertStringStartsWith("PK", $raw);
    }
}
