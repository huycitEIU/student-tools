const STORAGE_KEY = 'student-tools:timetable-events-v1';
const START_HOUR = 7;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const eventColors = [
  { key: 'blue', label: 'Ocean Blue', background: '#dbeafe', text: '#1e3a8a' },
  { key: 'green', label: 'Fresh Green', background: '#dcfce7', text: '#166534' },
  { key: 'amber', label: 'Sunny Amber', background: '#fef3c7', text: '#92400e' },
  { key: 'pink', label: 'Rose Pink', background: '#fce7f3', text: '#9d174d' },
  { key: 'purple', label: 'Violet', background: '#ede9fe', text: '#5b21b6' },
  { key: 'cyan', label: 'Sky Cyan', background: '#cffafe', text: '#155e75' }
];
const defaultColorKey = eventColors[0].key;

const formatTimeFromSlot = (slotIndex) => {
  const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const timeSlots = Array.from({ length: SLOT_COUNT }, (_, index) => {
  return {
    index,
    label: `${formatTimeFromSlot(index)} - ${formatTimeFromSlot(index + 1)}`
  };
});

const startOfMonday = (date) => {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const jsDay = base.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  base.setDate(base.getDate() + mondayOffset);
  return base;
};

const getWeekKey = (mondayDate) => {
  return `${mondayDate.getFullYear()}-${String(mondayDate.getMonth() + 1).padStart(2, '0')}-${String(mondayDate.getDate()).padStart(2, '0')}`;
};

const getWeekDays = (mondayDate) => {
  return weekDays.map((name, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    return {
      name,
      date,
      dateText: date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
    };
  });
};

const getWeekLabel = (mondayDate) => {
  const sunday = new Date(mondayDate);
  sunday.setDate(mondayDate.getDate() + 6);
  const mondayText = mondayDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const sundayText = sunday.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit' });
  return `${mondayText} - ${sundayText}`;
};

const isSameWeek = (firstMonday, secondMonday) => {
  return getWeekKey(firstMonday) === getWeekKey(secondMonday);
};

const loadEventsByWeek = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveEventsByWeek = (eventsByWeek) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(eventsByWeek));
};

const hasOverlap = (events, candidate, ignoreId = null) => {
  const candidateStart = candidate.startPeriod;
  const candidateEnd = candidate.startPeriod + candidate.duration;

  return events.some((event) => {
    if (ignoreId && event.id === ignoreId) {
      return false;
    }
    if (event.dayIndex !== candidate.dayIndex) {
      return false;
    }

    const eventStart = event.startPeriod;
    const eventEnd = event.startPeriod + event.duration;
    return candidateStart < eventEnd && eventStart < candidateEnd;
  });
};

export const myTimetableTool = {
  id: 'my-timetable',
  label: 'My Timetable',
  render: () => {
    return `
      <section class="card timetable-card">
        <h2>My Timetable</h2>
        <p>Manage events by week. Table starts from Monday and supports 30-minute slots, add, modify, and remove.</p>

        <div class="timetable-toolbar">
          <button id="this-week-btn" class="action-btn" type="button">This Week</button>
          <button id="prev-week-btn" class="action-btn" type="button">Previous Week</button>
          <button id="next-week-btn" class="action-btn" type="button">Next Week</button>
          <button id="copy-next-week-btn" class="action-btn" type="button">Copy To Next Week</button>
          <div id="week-indicator" class="week-indicator"></div>
        </div>

        <div class="timetable-editor">
          <input id="event-title" type="text" placeholder="Event title" />
          <select id="event-day">
            ${weekDays.map((day, index) => `<option value="${index}">${day}</option>`).join('')}
          </select>
          <select id="event-start">
            ${timeSlots.map((slot) => `<option value="${slot.index}">${slot.label}</option>`).join('')}
          </select>
          <select id="event-duration">
            <option value="1">30 minutes</option>
            <option value="2" selected>1 hour</option>
            <option value="3">1 hour 30 minutes</option>
            <option value="4">2 hours</option>
            <option value="6">3 hours</option>
            <option value="8">4 hours</option>
          </select>
          <select id="event-color">
            ${eventColors.map((color) => `<option value="${color.key}">${color.label}</option>`).join('')}
          </select>
          <button id="add-event-btn" class="action-btn primary" type="button">Add</button>
          <button id="update-event-btn" class="action-btn" type="button">Modify</button>
          <button id="remove-event-btn" class="remove-row" type="button">Remove</button>
        </div>

        <div id="timetable-status" class="timetable-status">No event selected.</div>

        <div class="timetable-shell">
          <div id="top-datebar" class="timetable-datebar"></div>

          <div class="timetable-grid">
            <div id="left-time-column" class="time-column left"></div>
            <div id="timetable-board" class="timetable-board"></div>
            <div id="right-time-column" class="time-column right"></div>
          </div>

          <div id="bottom-datebar" class="timetable-datebar bottom"></div>
        </div>
      </section>
    `;
  },
  mount: (root) => {
    const thisWeekBtn = root.querySelector('#this-week-btn');
    const prevWeekBtn = root.querySelector('#prev-week-btn');
    const nextWeekBtn = root.querySelector('#next-week-btn');
    const copyNextWeekBtn = root.querySelector('#copy-next-week-btn');
    const weekIndicator = root.querySelector('#week-indicator');
    const eventTitleInput = root.querySelector('#event-title');
    const eventDaySelect = root.querySelector('#event-day');
    const eventStartSelect = root.querySelector('#event-start');
    const eventDurationSelect = root.querySelector('#event-duration');
    const eventColorSelect = root.querySelector('#event-color');
    const addEventBtn = root.querySelector('#add-event-btn');
    const updateEventBtn = root.querySelector('#update-event-btn');
    const removeEventBtn = root.querySelector('#remove-event-btn');
    const statusBox = root.querySelector('#timetable-status');
    const topDatebar = root.querySelector('#top-datebar');
    const bottomDatebar = root.querySelector('#bottom-datebar');
    const leftTimeColumn = root.querySelector('#left-time-column');
    const rightTimeColumn = root.querySelector('#right-time-column');
    const board = root.querySelector('#timetable-board');

    const today = new Date();
    const todayWeekStart = startOfMonday(today);
    let currentWeekStart = todayWeekStart;
    let eventsByWeek = loadEventsByWeek();
    let selectedEventId = null;

    const currentWeekKey = () => getWeekKey(currentWeekStart);

    const getCurrentWeekEvents = () => {
      return eventsByWeek[currentWeekKey()] || [];
    };

    const setCurrentWeekEvents = (events) => {
      eventsByWeek[currentWeekKey()] = events;
      saveEventsByWeek(eventsByWeek);
    };

    const getWeekEventsByKey = (weekKey) => {
      return eventsByWeek[weekKey] || [];
    };

    const setWeekEventsByKey = (weekKey, events) => {
      eventsByWeek[weekKey] = events;
      saveEventsByWeek(eventsByWeek);
    };

    const resetForm = () => {
      eventTitleInput.value = '';
      eventDaySelect.value = '0';
      eventStartSelect.value = '0';
      eventDurationSelect.value = '2';
      eventColorSelect.value = defaultColorKey;
      selectedEventId = null;
      statusBox.textContent = 'No event selected.';
    };

    const fillFormFromEvent = (event) => {
      eventTitleInput.value = event.title;
      eventDaySelect.value = String(event.dayIndex);
      eventStartSelect.value = String(event.startPeriod);
      eventDurationSelect.value = String(event.duration);
      eventColorSelect.value = event.colorKey || defaultColorKey;
      selectedEventId = event.id;
      statusBox.textContent = `Selected: ${event.title}`;
    };

    const renderTimeColumns = () => {
      const content = ['<div class="time-cell time-head">Time</div>', ...timeSlots.map((slot) => `<div class="time-cell">${slot.label}</div>`)].join('');
      leftTimeColumn.innerHTML = content;
      rightTimeColumn.innerHTML = content;
    };

    const renderBoard = () => {
      const weekDates = getWeekDays(currentWeekStart);
      const events = getCurrentWeekEvents();

      board.innerHTML = `
        <div class="day-header-row">
          ${weekDates.map((day) => `<div class="day-header-cell">${day.name}<span>${day.dateText}</span></div>`).join('')}
        </div>
        ${timeSlots
          .map(
            (slot) => `
              <div class="slot-row">
                ${weekDates
                  .map(
                    (_, dayIndex) =>
                      `<button class="slot-cell" type="button" data-day-index="${dayIndex}" data-period-index="${slot.index}"></button>`
                  )
                  .join('')}
              </div>
            `
          )
          .join('')}
        <div class="day-footer-row">
          ${weekDates.map((day) => `<div class="day-footer-cell">${day.name}<span>${day.dateText}</span></div>`).join('')}
        </div>
      `;

      const occupied = new Map();
      events.forEach((event) => {
        for (let offset = 0; offset < event.duration; offset += 1) {
          occupied.set(`${event.dayIndex}-${event.startPeriod + offset}`, {
            event,
            isStart: offset === 0
          });
        }
      });

      board.querySelectorAll('.slot-cell').forEach((cell) => {
        const dayIndex = Number(cell.dataset.dayIndex);
        const periodIndex = Number(cell.dataset.periodIndex);
        const key = `${dayIndex}-${periodIndex}`;
        const detail = occupied.get(key);

        if (!detail) {
          return;
        }

        const { event, isStart } = detail;
        const color = getEventColor(event.colorKey);
        cell.dataset.eventId = event.id;
        cell.classList.add('event-cell');
        cell.style.setProperty('--event-bg', color.background);
        cell.style.setProperty('--event-text', color.text);
        if (event.id === selectedEventId) {
          cell.classList.add('selected-cell');
        }
        if (!isStart) {
          cell.classList.add('event-continued');
          return;
        }

        const eventStartTime = formatTimeFromSlot(event.startPeriod);
        const eventEndTime = formatTimeFromSlot(event.startPeriod + event.duration);
        cell.classList.add('event-start');
        cell.innerHTML = `<strong>${event.title}</strong><span>${eventStartTime} - ${eventEndTime}</span>`;
      });
    };

    const renderWeek = () => {
      const weekLabel = getWeekLabel(currentWeekStart);
      const todayText = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      weekIndicator.textContent = isSameWeek(currentWeekStart, todayWeekStart)
        ? `${weekLabel} (Contains today: ${todayText})`
        : weekLabel;
      topDatebar.textContent = weekLabel;
      bottomDatebar.textContent = weekLabel;
      renderTimeColumns();
      renderBoard();
    };

    thisWeekBtn.addEventListener('click', () => {
      currentWeekStart = startOfMonday(new Date());
      resetForm();
      statusBox.textContent = 'Moved to the week containing today.';
      renderWeek();
    });

    const readFormEvent = () => {
      const title = eventTitleInput.value.trim();
      const dayIndex = Number(eventDaySelect.value);
      const startPeriod = Number(eventStartSelect.value);
      const duration = Number(eventDurationSelect.value);
      const colorKey = eventColorSelect.value;

      if (!title) {
        statusBox.textContent = 'Please enter event title.';
        return null;
      }

      if (Number.isNaN(dayIndex) || Number.isNaN(startPeriod) || Number.isNaN(duration)) {
        statusBox.textContent = 'Please choose valid event values.';
        return null;
      }

      if (startPeriod + duration > SLOT_COUNT) {
        statusBox.textContent = 'Event exceeds the last period. Reduce duration or start earlier.';
        return null;
      }

      return {
        title,
        dayIndex,
        startPeriod,
        duration,
        colorKey: getEventColor(colorKey).key
      };
    };

    addEventBtn.addEventListener('click', () => {
      const draft = readFormEvent();
      if (!draft) {
        return;
      }

      const events = getCurrentWeekEvents();
      if (hasOverlap(events, draft)) {
        statusBox.textContent = 'Time conflict detected for this day and period.';
        return;
      }

      const newEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...draft
      };
      setCurrentWeekEvents([...events, newEvent]);
      fillFormFromEvent(newEvent);
      renderWeek();
    });

    updateEventBtn.addEventListener('click', () => {
      if (!selectedEventId) {
        statusBox.textContent = 'Select an event in the table before modifying.';
        return;
      }

      const draft = readFormEvent();
      if (!draft) {
        return;
      }

      const events = getCurrentWeekEvents();
      if (hasOverlap(events, draft, selectedEventId)) {
        statusBox.textContent = 'Time conflict detected for this day and period.';
        return;
      }

      const updatedEvents = events.map((event) => {
        if (event.id !== selectedEventId) {
          return event;
        }
        return { ...event, ...draft };
      });

      setCurrentWeekEvents(updatedEvents);
      statusBox.textContent = 'Event modified.';
      renderWeek();
    });

    removeEventBtn.addEventListener('click', () => {
      if (!selectedEventId) {
        statusBox.textContent = 'Select an event in the table before removing.';
        return;
      }

      const events = getCurrentWeekEvents();
      const filtered = events.filter((event) => event.id !== selectedEventId);
      setCurrentWeekEvents(filtered);
      resetForm();
      statusBox.textContent = 'Event removed.';
      renderWeek();
    });

    board.addEventListener('click', (event) => {
      const cell = event.target.closest('.slot-cell');
      if (!cell) {
        return;
      }

      const eventId = cell.dataset.eventId;
      if (!eventId) {
        selectedEventId = null;
        statusBox.textContent = 'No event selected.';
        renderWeek();
        return;
      }

      const events = getCurrentWeekEvents();
      const matched = events.find((item) => item.id === eventId);
      if (!matched) {
        return;
      }

      fillFormFromEvent(matched);
      renderWeek();
    });

    nextWeekBtn.addEventListener('click', () => {
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      resetForm();
      statusBox.textContent = 'Moved to next week. Add events for this week.';
      renderWeek();
    });

    prevWeekBtn.addEventListener('click', () => {
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      resetForm();
      statusBox.textContent = 'Moved to previous week.';
      renderWeek();
    });

    copyNextWeekBtn.addEventListener('click', () => {
      const sourceEvents = getCurrentWeekEvents();
      if (sourceEvents.length === 0) {
        statusBox.textContent = 'No events in current week to copy.';
        return;
      }

      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekKey = getWeekKey(nextWeekStart);
      const existingNextWeekEvents = getWeekEventsByKey(nextWeekKey);
      let copiedCount = 0;
      let skippedCount = 0;
      const mergedEvents = [...existingNextWeekEvents];

      sourceEvents.forEach((sourceEvent) => {
        const candidate = {
          title: sourceEvent.title,
          dayIndex: sourceEvent.dayIndex,
          startPeriod: sourceEvent.startPeriod,
          duration: sourceEvent.duration,
          colorKey: sourceEvent.colorKey || defaultColorKey
        };

        if (hasOverlap(mergedEvents, candidate)) {
          skippedCount += 1;
          return;
        }

        mergedEvents.push({
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${copiedCount}`,
          ...candidate
        });
        copiedCount += 1;
      });

      setWeekEventsByKey(nextWeekKey, mergedEvents);
      statusBox.textContent = `Copied ${copiedCount} event(s) to next week. Skipped ${skippedCount} conflicted event(s).`;
    });

    resetForm();
    renderWeek();
  }
};

const getEventColor = (colorKey) => {
  return eventColors.find((item) => item.key === colorKey) || eventColors[0];
};