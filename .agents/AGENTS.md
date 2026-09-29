# Project Guidelines & Rules for AI Agents

## Core Principles & Architecture Rules

1. **Modular Architecture (`app/Modules/{ModuleName}`)**:
   - Models, Controllers, Policies, Services, and Migrations live inside `app/Modules/{ModuleName}` instead of standard Laravel folders.
   - Module routes are placed in `app/Modules/{ModuleName}/routes.php` and required in `routes/web.php`.

2. **Authorization Policy Registration**:
   - **CRITICAL**: Custom module namespaces (e.g. `App\Modules\ProjectBuilder\Models\Project`) do **NOT** support automatic policy discovery in Laravel.
   - Whenever you create or modify a model policy inside a module, you **MUST explicitly map it** in `app/Providers/AuthServiceProvider.php` under `$policies`.

3. **3-Level Content Hierarchy**:
   - Hierarchy: `Project` (top level) ➔ `Page` (middle level) ➔ `Section` (bottom level).
   - A `Page` **must** belong to a `Project` (`project_id` required during creation).
   - Sections link to Pages via the `page_sections` pivot table (`PageSection`).

4. **Form Schema Engine (`FormBuilder`)**:
   - Form schemas for Inertia components use `app/Support/FormBuilder.php`.
   - Client-side validation relies on `FormBuilder`, but **backend controllers MUST execute full server-side validation** using `FormBuilder::rulesForValidation($schema)` + custom rules.

5. **Environment & Execution**:
   - Development server runs via `./start` (Docker / Sail).
   - Frontend running on Vite on port 3000, backend server running on port 8000 mapped in Docker container.
   - Execute tests using `./vendor/bin/phpunit`.

6. **Language & Coding Standards**:
   - **CRITICAL**: Always write all code, identifiers, tests, documentation, and inline comments in **English**.
   - Even if reference materials, specifications, or documents provided or read are in another language (e.g., Vietnamese), all source code, comments, and commit messages must strictly be written in English.

