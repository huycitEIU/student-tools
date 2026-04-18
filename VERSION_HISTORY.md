# Version History

## v1.9.0 (2026-04-19)

### Updates
- Added global light/dark theme support for the app.
- Added a topbar theme switch button with saved user preference.
- Added dark-mode styling coverage for tool result surfaces across Practice, IELTS Writing, Timetable, Weather, Random, and QR Generator.
- Refined the toolbar with clearer section hierarchy, slightly wider sidebar, and deeper-looking tool buttons.

## v1.8.0 (2026-04-19)

### Updates
- Added topbar unsaved-cloud indicator and leave-page warning for unsaved cloud changes.
- Added first-open Firebase hydration strategy for timetable, vocabulary, and notes.
- Added Version button in top bar with in-app version modal.

### Fixes
- Fixed timetable unsaved state so it remains accurate after page refresh.
- Reduced notification spam by limiting automatic notifications to important actions.
- Fixed false save toast shown when opening Chinese Vocabulary.
- Fixed Notes save/load flow with resilient local-first behavior when cloud sync fails.

## v1.7.0 (2026-04-18)

### Updates
- Added Practice tool with Flashcard and Multiple Choice modes.
- Added Chinese Vocabulary pinyin suggestions and type filters.
- Added global notification center with toast, alert, and notification history.

### Fixes
- Fixed modal close behavior and Escape-key handling across the app.