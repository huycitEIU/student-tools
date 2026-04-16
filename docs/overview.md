# Project Overview

Student Tools is a single-page student utility app built with Vite and vanilla JavaScript. The app renders a shared shell with a left navigation panel and swaps tool content into the main workspace.

## Architecture

- `src/main.js` owns the app shell, navigation, and active tool switching.
- `src/tools/` contains one module per tool.
- `src/styles/` contains the global stylesheet and tool-specific styles.
- `src/styles/index.css` is the CSS entry point imported by the app.

## Rendering Model

Each tool exports a simple object with:

- `id` for navigation and routing inside the shell
- `label` for the UI
- `render()` for the HTML string
- `mount(root)` for event wiring and stateful behavior

That keeps the app easy to extend without introducing a framework.

## Current Tool Set

- Weather
- Dictionary
- Random
- My Timetable
- Study Timer
- Notes
- Grade Scale
- Student Planner
- Unit Converter
- Course Calculator
- Money Management
- QR Generator
