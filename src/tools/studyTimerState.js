const STORAGE_KEY = 'student-tools:study-timer-v1';

export const defaultStudyTimerState = {
  mode: 'focus',
  isRunning: false,
  secondsLeft: 25 * 60,
  focusMinutes: 25,
  breakMinutes: 5,
  label: '25 / 5'
};

export const formatTimerDisplay = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const loadStudyTimerState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultStudyTimerState };
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultStudyTimerState,
      ...parsed
    };
  } catch {
    return { ...defaultStudyTimerState };
  }
};

export const saveStudyTimerState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearStudyTimerState = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const STUDY_TIMER_EVENT = 'student-tools:study-timer-updated';