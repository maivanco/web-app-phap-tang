---
name: formbuilder-pattern
description: Understanding the FormBuilder pattern for Inertia forms
---

# FormBuilder Pattern

The FormBuilder (`app/Support/FormBuilder.php`) is used to convert a PHP configuration of fields and layout properties into a JSON-serializable schema for React/Inertia.

## Architecture Guidelines
- **Purpose**: Rendering forms client-side and providing validation metadata rules.
- **Backend Validation**: The backend must STILL run full validation. Do not rely entirely on client-side JS.
- **Example Usage in Controller**:
  ```php
  $schema = FormBuilder::schema([
      'formId' => 'my_form',
      'fields' => [
          ['name' => 'title', 'label' => 'Title', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
      ],
      'rows' => [
          ['columns' => [['field' => 'title', 'width' => 'w-full']]]
      ]
  ]);
  // Pass $schema to Inertia component
  return Inertia::render('MyPage', ['formSchema' => $schema]);
  ```
- **Validation**: When submitting, use `FormBuilder::rulesForValidation($schema)` to get the base rules array, and manually append any complex rules (like `unique:table,column`).
