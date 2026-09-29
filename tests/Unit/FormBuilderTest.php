<?php

namespace Tests\Unit;

use App\Support\FormBuilder;
use PHPUnit\Framework\TestCase;

class FormBuilderTest extends TestCase
{
    public function test_schema_normalizes_rules(): void
    {
        $schema = FormBuilder::schema([
            'formId' => 'test_form',
            'fields' => [
                [
                    'name' => 'title',
                    'label' => 'Title',
                    'type' => 'text',
                    'rules' => ['required', 'max:255'],
                ],
            ],
        ]);

        $this->assertSame('test_form', $schema['formId']);
        $this->assertCount(1, $schema['fields']);
        $this->assertEquals([
            ['rule' => 'required', 'params' => []],
            ['rule' => 'max', 'params' => ['255']],
        ], $schema['fields'][0]['rules']);
    }

    public function test_rules_for_validation_extracts_laravel_rules(): void
    {
        $schema = FormBuilder::schema([
            'formId' => 'test_form',
            'fields' => [
                [
                    'name' => 'title',
                    'label' => 'Title',
                    'type' => 'text',
                    'rules' => ['required', 'max:255'],
                ],
            ],
        ]);

        $rules = FormBuilder::rulesForValidation($schema);

        $this->assertEquals([
            'title' => ['required', 'max:255'],
        ], $rules);
    }
}
