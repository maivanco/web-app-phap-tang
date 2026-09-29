---
name: project-overview
description: High-level overview of the Web Page Builder Application, including tech stack, 3-level architecture, modules, database, and dev environment.
---

# Web Page Builder Application Overview

This project is a modular web application enabling users to build and manage multi-section pages organized within projects. It features three core modules operating under a 3-level architecture (`Project` ➔ `Page` ➔ `Section`).

## Tech Stack
- **Backend**: Laravel 12, PHP 8.2 (runs via Docker / Laravel Sail), MySQL 8.0, Sanctum authentication.
- **Frontend**: React 19, TypeScript, Inertia.js (v1.3.0 frontend / v0.6.3 backend), Vite, Tailwind CSS 3.4.
- **UI Components**: Headless UI (v2.2.9), Monaco Editor, Embla Carousel, React Resizable Panels.
- **Infrastructure**: Docker, Laravel Sail.

## 3-Level Architecture & Core Modules
1. **ProjectBuilder** (`app/Modules/ProjectBuilder`):
   - High-level container for grouping related pages.
   - Models: `Project`. Controllers: `ProjectController`.
2. **PageBuilder** (`app/Modules/PageBuilder`):
   - Page assembly with shareable public links and preview tokens. Each page MUST belong to a `Project`.
   - Models: `Page`, `PageSection`. Controllers: `PageController`.
3. **SectionBuilder** (`app/Modules/SectionBuilder`):
   - Reusable UI sections with HTML & Tailwind styling.
   - Models: `Section`, `SectionType`, `SectionTag`. Controllers: `SectionController`.

## Front-End & Routing
- **Entry point**: `resources/js/app.tsx`
- **Pages**: Located under `resources/js/Pages/Admin/Modules/{ModuleName}/`.
- **Components**: Shared UI components live in `resources/js/Components/`.
- **Form Schema**: Uses `app/Support/FormBuilder.php` to define form layout and hydration metadata.

## Database Schema Highlights
- `projects`: Primary container owned by user (`user_id`, `name`, `description`).
- `website_pages`: Belongs to a project (`project_id`), unique `view_token`, `published` flag.
- `website_sections`: Raw HTML content, JSON configuration metadata.
- `page_sections`: Junction table bridging pages and sections with ordering.

## Development Setup & Commands
- **Start Dev Server**: `./start` script.
- **Run Tests**: `./vendor/bin/phpunit`.
- **Database Reset**: `./artisan migrate:refresh`.
