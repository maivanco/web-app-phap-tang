<?php

namespace App\Support;

class FormBuilder
{
    /**
     * Build schema for Inertia frontend.
     *
     * @param array $config
     * @return array
     */
    public static function schema(array $config): array
    {
        $fields = [];
        foreach ($config['fields'] ?? [] as $field) {
            $normalizedRules = [];
            $rules = $field['rules'] ?? [];
            if (is_string($rules)) {
                $rules = explode('|', $rules);
            }

            foreach ($rules as $rule) {
                if (is_string($rule)) {
                    $parts = explode(':', $rule, 2);
                    $ruleName = $parts[0];
                    $params = isset($parts[1]) ? explode(',', $parts[1]) : [];
                    $normalizedRules[] = [
                        'rule' => $ruleName,
                        'params' => $params,
                    ];
                }
            }

            $fields[] = array_merge($field, [
                'rules' => $normalizedRules,
            ]);
        }

        return [
            'formId' => $config['formId'] ?? '',
            'fields' => $fields,
            'rows' => $config['rows'] ?? [],
        ];
    }

    /**
     * Extract validation rules from schema for Laravel Validator.
     *
     * @param array $schema
     * @return array
     */
    public static function rulesForValidation(array $schema): array
    {
        $rules = [];
        foreach ($schema['fields'] ?? [] as $field) {
            $name = $field['name'] ?? null;
            if (!$name) {
                continue;
            }

            $fieldRules = [];
            foreach ($field['rules'] ?? [] as $ruleItem) {
                if (is_array($ruleItem) && isset($ruleItem['rule'])) {
                    $ruleStr = $ruleItem['rule'];
                    if (!empty($ruleItem['params'])) {
                        $ruleStr .= ':' . implode(',', $ruleItem['params']);
                    }
                    $fieldRules[] = $ruleStr;
                } elseif (is_string($ruleItem)) {
                    $fieldRules[] = $ruleItem;
                }
            }

            $rules[$name] = $fieldRules;
        }

        return $rules;
    }
}
