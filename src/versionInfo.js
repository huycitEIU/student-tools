export const APP_VERSION = 'v1.8.0';

export const VERSION_HISTORY = [
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