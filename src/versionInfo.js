export const APP_VERSION = 'v1.10.0';

export const VERSION_HISTORY = [
  {
    version: 'v1.10.0',
    date: '2026-04-19',
    updates: [
      'Added new Feedback tool with type selection (bug, improve, help, question, other), status tracking, and shared visibility for all users.',
      'Added type-based color coding and status display for feedback items.',
      'Moved Feedback next to Home in the General section of the sidebar.',
      'Updated Firestore rules for shared feedback read access and validated authenticated create/status-update flows.'
    ],
    fixes: []
  },
  {
    version: 'v1.9.0',
    date: '2026-04-19',
    updates: [
      'Added new tools: Constants, English Vocabulary, and IELTS Writing Simulation.',
      'Added global light/dark theme support for the app.',
      'Added a topbar theme switch button with saved user preference.',
      'Added dark-mode styling coverage for tool result surfaces across Practice, IELTS Writing, Timetable, Weather, Random, and QR Generator.',
      'Refined the toolbar with clearer section hierarchy, slightly wider sidebar, and deeper-looking tool buttons.'
    ],
    fixes: []
  },
  {
    version: 'v1.8.0',
    date: '2026-04-19',
    updates: [
      'Added topbar unsaved-cloud indicator and leave-page warning for unsaved cloud changes.',
      'Added first-open Firebase hydration strategy for timetable, vocabulary, and notes.'
    ],
    fixes: [
      'Fixed timetable unsaved state so it remains accurate after page refresh.',
      'Reduced notification spam by limiting to important cloud/save/delete-all actions.',
      'Removed false save toast when opening Chinese Vocabulary.'
    ]
  },
  {
    version: 'v1.7.0',
    date: '2026-04-18',
    updates: [
      'Added Practice tool with Flashcard and Multiple Choice modes.',
      'Added Chinese Vocabulary pinyin suggestions and type filters.',
      'Added global notification center with toast, alert, and notification history.'
    ],
    fixes: [
      'Fixed modal close behavior and Escape-key handling across the app.'
    ]
  }
];