const STORAGE_KEY = 'student-tools:study-streak-v1';

export const defaultStreakState = {
  count: 0,
  lastCompletedDate: null // ISO date string (YYYY-MM-DD)
};

export const loadStreakState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultStreakState };
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultStreakState,
      ...parsed
    };
  } catch {
    return { ...defaultStreakState };
  }
};

export const saveStreakState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getToday = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

export const completeStudySession = () => {
  const state = loadStreakState();
  const today = getToday();

  if (state.lastCompletedDate === today) {
    // Already completed today, don't increment
    return state;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (state.lastCompletedDate === yesterdayStr) {
    // Completed yesterday, continue the streak
    state.count += 1;
  } else {
    // Didn't complete yesterday or before, start fresh streak
    state.count = 1;
  }

  state.lastCompletedDate = today;
  saveStreakState(state);
  return state;
};

export const checkAndResetStreakIfNeeded = () => {
  const state = loadStreakState();

  if (state.count === 0) {
    return state;
  }

  const today = getToday();

  if (state.lastCompletedDate === today) {
    // User completed today, keep streak
    return state;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (state.lastCompletedDate === yesterdayStr) {
    // User completed yesterday but not today, keep streak for now
    return state;
  }

  // It's been more than a day since last completion, reset streak
  state.count = 0;
  state.lastCompletedDate = null;
  saveStreakState(state);
  return state;
};

export const STREAK_EVENT = 'student-tools:study-streak-updated';
