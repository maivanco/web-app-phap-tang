---
name: laravel-testing
description: Guidelines and patterns for running and writing PHPUnit feature & unit tests in this Docker Laravel application.
---

# Laravel Testing Conventions

## Running Tests
- Standard command: `./vendor/bin/phpunit`
- Run specific test file: `./vendor/bin/phpunit tests/Feature/ProjectTest.php`
- Run specific test method: `./vendor/bin/phpunit --filter test_user_can_create_project`

## Test Structure & Conventions
- **Feature Tests**: Located in `tests/Feature/`. Cover Controller actions, authorization policies, validation, and database state transitions.
- **Database Refresh**: Always use `use RefreshDatabase;` in feature tests.
- **Authentication**: Use `$this->actingAs($user)` with `User::factory()->create()` for protected routes.
- **Named Routes**: Always test routes using `route(...)` names (e.g. `route('admin.modules.project-builder.store')`).

## Testing Key Requirements
1. **Policy Testing**: Ensure authorization policy checks (e.g., viewing/editing projects owned by other users) are verified.
2. **Hierarchy Validation**: Ensure required parent relationships are enforced (e.g., creating a `Page` without `project_id` must throw session error).
