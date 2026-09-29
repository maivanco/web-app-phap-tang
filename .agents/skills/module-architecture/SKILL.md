---
name: module-architecture
description: Understanding the Laravel Module architecture used in this project, directory structure, policy registration, and routing rules.
---

# Laravel Module Architecture

This project uses a modular architecture located in `app/Modules/{ModuleName}` instead of standard Laravel directory structures.

## Directory Structure
Every module follows this standard layout:
```
app/Modules/{ModuleName}/
├── Models/                 # Eloquent models
├── Controllers/            # HTTP controllers (RESTful)
├── Policies/               # Authorization policies
├── Services/               # Business logic services (optional)
├── routes.php              # Module-specific routes (included in main web.php)
└── database/
    └── migrations/         # Module database migrations
```

## Key Modules
- **ProjectBuilder**: Top-level workspace management. Models: `Project`.
- **PageBuilder**: Multi-section page layout manager. Models: `Page`, `PageSection`.
- **SectionBuilder**: Component section manager. Models: `Section`, `SectionType`, `SectionTag`.

## Essential Conventions & Gotchas
1. **Policy Registration**:
   - Automatic policy discovery fails for `App\Modules\*` namespaces.
   - You MUST explicitly map model policies in `app/Providers/AuthServiceProvider.php` under `$policies`:
     ```php
     protected $policies = [
         \App\Modules\PageBuilder\Models\Page::class => \App\Modules\PageBuilder\Policies\PagePolicy::class,
         \App\Modules\ProjectBuilder\Models\Project::class => \App\Modules\ProjectBuilder\Policies\ProjectPolicy::class,
     ];
     ```
2. **Routing Conventions**:
   - Admin routes prefix: `/admin/modules/{module-slug}`.
   - Protected with `auth` and `verified` middleware.
   - Loaded via `require` statements in `routes/web.php`.
