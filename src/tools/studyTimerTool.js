import {
  STUDY_TIMER_EVENT,
  defaultStudyTimerState,
  formatTimerDisplay,
  loadStudyTimerState,
  saveStudyTimerState
} from './studyTimerState.js';
import { STREAK_EVENT, completeStudySession } from './streakState.js';

const presetModes = [
  { id: 'focus-25', label: '25 / 5', focusMinutes: 25, breakMinutes: 5 },
  { id: 'focus-45', label: '45 / 15', focusMinutes: 45, breakMinutes: 15 },
  { id: 'focus-50', label: '50 / 10', focusMinutes: 50, breakMinutes: 10 }
];

let timerId = null;

const syncTimerState = (state) => {
  saveStudyTimerState(state);
  window.dispatchEvent(new CustomEvent(STUDY_TIMER_EVENT, { detail: state }));
};

const createStateFromPreset = (preset) => ({
  ...defaultStudyTimerState,
  secondsLeft: preset.focusMinutes * 60,
  focusMinutes: preset.focusMinutes,
  breakMinutes: preset.breakMinutes,
  label: preset.label,
  mode: 'focus',
  isRunning: false
});

export const studyTimerTool = {
  id: 'study-timer',
  label: 'Study Timer',
  render: () => `
    <section class="card timer-card">
      <h2>Study Timer</h2>
      <p>Use a focus session, a short break, or a custom timer.</p>

      <div class="timer-presets" id="timer-presets">
        ${presetModes
          .map(
            (mode, index) => `
              <button
                type="button"
                class="timer-preset ${index === 0 ? 'active' : ''}"
                data-focus-minutes="${mode.focusMinutes}"
                data-break-minutes="${mode.breakMinutes}"
                data-label="${mode.label}"
              >
                ${mode.label}
              </button>
            `
          )
          .join('')}
      </div>

      <div class="timer-display-wrap">
        <div id="timer-mode" class="timer-mode">Focus Session</div>
        <div id="timer-display" class="timer-display">25:00</div>
        <div id="timer-subtext" class="timer-subtext">Ready to study</div>
      </div>

      <div class="timer-controls">
        <button id="start-timer-btn" class="action-btn primary" type="button">Start</button>
        <button id="pause-timer-btn" class="action-btn" type="button">Pause</button>
        <button id="reset-timer-btn" class="remove-row" type="button">Reset</button>
      </div>

      <div class="timer-custom-row">
        <input id="custom-focus" type="number" min="1" value="25" />
        <span>focus min</span>
        <input id="custom-break" type="number" min="1" value="5" />
        <span>break min</span>
        <button id="apply-custom-btn" class="action-btn" type="button">Apply Custom</button>
      </div>
    </section>
  `,
  mount: (root) => {
    const presetsWrap = root.querySelector('#timer-presets');
    const timerMode = root.querySelector('#timer-mode');
    const timerDisplay = root.querySelector('#timer-display');
    const timerSubtext = root.querySelector('#timer-subtext');
    const startBtn = root.querySelector('#start-timer-btn');
    const pauseBtn = root.querySelector('#pause-timer-btn');
    const resetBtn = root.querySelector('#reset-timer-btn');
    const customFocusInput = root.querySelector('#custom-focus');
    const customBreakInput = root.querySelector('#custom-break');
    const applyCustomBtn = root.querySelector('#apply-custom-btn');

    let state = loadStudyTimerState();

    if (!state || typeof state !== 'object') {
      state = createStateFromPreset(presetModes[0]);
    }

    let activePreset = presetModes.find((item) => item.focusMinutes === state.focusMinutes && item.breakMinutes === state.breakMinutes) || {
      id: 'custom',
      label: state.label || 'Custom',
      focusMinutes: state.focusMinutes,
      breakMinutes: state.breakMinutes
    };

    let currentFocusMinutes = state.focusMinutes;
    let currentBreakMinutes = state.breakMinutes;

    const stopTimer = () => {
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    const persistAndRender = () => {
      syncTimerState({
        mode: state.mode,
        isRunning: state.isRunning,
        secondsLeft: state.secondsLeft,
        focusMinutes: currentFocusMinutes,
        breakMinutes: currentBreakMinutes,
        label: activePreset.label
      });
      renderTimer();
    };

    const renderTimer = () => {
      timerMode.textContent = state.mode === 'focus' ? 'Focus Session' : 'Break Time';
      timerDisplay.textContent = formatTimerDisplay(state.secondsLeft);
      timerSubtext.textContent = state.isRunning
        ? 'Timer running'
        : state.mode === 'focus'
          ? 'Ready to study'
          : 'Take a short break';
    };

    const clearTimer = () => {
      stopTimer();
      state.isRunning = false;
      persistAndRender();
    };

    const switchMode = () => {
      const wasFocusMode = state.mode === 'focus';
      state.mode = state.mode === 'focus' ? 'break' : 'focus';
      state.secondsLeft = (state.mode === 'focus' ? currentFocusMinutes : currentBreakMinutes) * 60;
      persistAndRender();

      // Award steak when focus session completes
      if (wasFocusMode) {
        const streakState = completeStudySession();
        window.dispatchEvent(new CustomEvent(STREAK_EVENT, { detail: streakState }));
      }
    };

    const tick = () => {
      if (state.secondsLeft <= 0) {
        switchMode();
        return;
      }

      state.secondsLeft -= 1;
      syncTimerState({
        mode: state.mode,
        isRunning: state.isRunning,
        secondsLeft: state.secondsLeft,
        focusMinutes: currentFocusMinutes,
        breakMinutes: currentBreakMinutes,
        label: activePreset.label
      });
      renderTimer();
    };

    const resetTimer = () => {
      stopTimer();
      state.mode = 'focus';
      state.isRunning = false;
      state.secondsLeft = currentFocusMinutes * 60;
      persistAndRender();
    };

    const selectPreset = (presetButton) => {
      const focusMinutes = Number(presetButton.dataset.focusMinutes);
      const breakMinutes = Number(presetButton.dataset.breakMinutes);
      const label = presetButton.dataset.label || 'Preset';

      activePreset = { focusMinutes, breakMinutes, label };
      currentFocusMinutes = focusMinutes;
      currentBreakMinutes = breakMinutes;
      customFocusInput.value = String(focusMinutes);
      customBreakInput.value = String(breakMinutes);
      resetTimer();
    };

    presetsWrap.addEventListener('click', (event) => {
      const button = event.target.closest('.timer-preset');
      if (!button) {
        return;
      }

      presetsWrap.querySelectorAll('.timer-preset').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      selectPreset(button);
    });

    startBtn.addEventListener('click', () => {
      if (state.isRunning) {
        return;
      }

      state.isRunning = true;
      persistAndRender();
      if (!timerId) {
        timerId = window.setInterval(tick, 1000);
      }
    });

    pauseBtn.addEventListener('click', () => {
      clearTimer();
    });

    resetBtn.addEventListener('click', () => {
      resetTimer();
    });

    applyCustomBtn.addEventListener('click', () => {
      const focusMinutes = Number(customFocusInput.value);
      const breakMinutes = Number(customBreakInput.value);

      if (Number.isNaN(focusMinutes) || focusMinutes <= 0 || Number.isNaN(breakMinutes) || breakMinutes <= 0) {
        timerSubtext.textContent = 'Enter valid custom minutes.';
        return;
      }

      presetsWrap.querySelectorAll('.timer-preset').forEach((item) => item.classList.remove('active'));
      activePreset = { focusMinutes, breakMinutes, label: 'Custom' };
      currentFocusMinutes = focusMinutes;
      currentBreakMinutes = breakMinutes;
      resetTimer();
    });

    if (state.isRunning && !timerId) {
      timerId = window.setInterval(tick, 1000);
    }

    presetsWrap.querySelectorAll('.timer-preset').forEach((item) => item.classList.remove('active'));
    const matchingPreset = presetModes.find(
      (item) => item.focusMinutes === currentFocusMinutes && item.breakMinutes === currentBreakMinutes
    );
    const activePresetButton = matchingPreset
      ? presetsWrap.querySelector(`[data-focus-minutes="${matchingPreset.focusMinutes}"][data-break-minutes="${matchingPreset.breakMinutes}"]`)
      : null;
    if (activePresetButton) {
      activePresetButton.classList.add('active');
    }

    renderTimer();
  }
};