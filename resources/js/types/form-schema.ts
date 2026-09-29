/**
 * Normalized validation rule as sent from backend FormBuilder.
 * Client uses these for best-effort validation; backend remains authoritative.
 */
export interface NormalizedRule {
  rule: string;
  params?: unknown[];
}

/**
 * Option for select or checkbox_group. checkbox_group may include optional color for pill styling.
 */
export interface FormFieldOption {
  value: string | number;
  label: string;
  color?: string;
}

/**
 * Form field descriptor from FormBuilder schema.
 */
export interface FormFieldSchema {
  name: string;
  label: string;
  type: string;
  rules: NormalizedRule[];
  options?: FormFieldOption[];
  placeholder?: string;
  hint?: string;
}

/**
 * Column in a row: references a field by name and optional width (Tailwind class).
 */
export interface FormColumnSchema {
  field: string;
  width?: string;
}

/**
 * Row: array of columns. Front-end renders a flex row with each column's width.
 */
export interface FormRowSchema {
  columns: FormColumnSchema[];
  rowClassName?: string;
}

/**
 * Form schema passed via Inertia page props.
 * When `rows` is set, layout is driven by rows/columns; otherwise all fields render in order.
 */
export interface FormSchema {
  formId: string;
  fields: FormFieldSchema[];
  rows?: FormRowSchema[];
}
