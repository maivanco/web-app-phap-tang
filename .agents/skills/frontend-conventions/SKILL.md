---
name: frontend-conventions
description: Understand the frontend tech stack and styling guidelines
---

# Frontend Conventions (React + Inertia + Tailwind)

## Tech Stack
- React 19, TypeScript, Inertia.js (v1.3.0 for frontend / v0.6.3 for backend), Vite, Tailwind CSS (3.4), Headless UI (v2.2.9).

## Component Structure
- **Global Entry**: `resources/js/app.tsx`
- **Reusability**: All shared UI components are in `resources/js/Components/` and `resources/js/Components/ui/`. Form inputs, dropdowns, modals should come from here.
- **Styling**: Utility-first CSS using Tailwind CSS. 
- **Type Safety**: Strictly utilize TypeScript interfaces for Inertia props.

## Aesthetic Requirements
- Ensure vibrant colors, engaging hover effects, and modern UX design principles.
- Use `Embla Carousel` or `React Resizable Panels` when interactive structures are needed.

## Building and Dev
- Do NOT run generic `npm install` unless making dependency additions. Environment runs inside a docker environment `docker-compose up -d`.
- Port 3000 is used for frontend hot-reloading (Vite).
