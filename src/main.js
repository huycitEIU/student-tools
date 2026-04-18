import { tools } from './tools/index.js';
import { STUDY_TIMER_EVENT, formatTimerDisplay, loadStudyTimerState } from './tools/studyTimerState.js';
import { STREAK_EVENT, loadStreakState, checkAndResetStreakIfNeeded } from './tools/streakState.js';
import { isFirebaseConfigured } from './firebase/config.js';
import {
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  syncAuthDisplayName,
  watchAuthState
} from './firebase/auth.js';
import { ensureUserProfile, saveUserProfile } from './firebase/profile.js';
import { APP_VERSION, VERSION_HISTORY } from './versionInfo.js';

const app = document.querySelector('#app');
let activeToolId = 'home'; // Start with home page
let streakState = checkAndResetStreakIfNeeded(); // Check and reset streak if needed on load
let currentUser = null;
let userProfile = null;
let isAuthModalOpen = false;
let authMode = 'signin';
let authError = '';
let isProfileModalOpen = false;
let profileMessage = '';
let isNotificationModalOpen = false;
let isVersionModalOpen = false;
let notifications = [];
let unreadNotificationCount = 0;
let currentToast = null;
let currentAlert = null;
let toastTimerId = null;
let alertTimerId = null;
let statusObserver = null;
let observedStatusElements = [];
let lastNotificationKey = '';
let lastNotificationTime = 0;
const CLOUD_DIRTY_EVENT = 'student-tools:cloud-dirty';
const dirtyCloudTools = new Map();
const collapsedToolCategories = new Set();
const THEME_STORAGE_KEY = 'student-tools:theme';

const getInitialTheme = () => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

let currentTheme = getInitialTheme();

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
};

const syncThemeToggleLabel = () => {
  const toggleThemeButton = document.querySelector('#btn-toggle-theme');
  if (!toggleThemeButton) {
    return;
  }

  toggleThemeButton.textContent = `${currentTheme === 'dark' ? 'Light' : 'Dark'} theme`;
};

const toggleTheme = () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme();
  syncThemeToggleLabel();
};

// Tool emoji icons for the home grid
const toolIcons = {
  'weather': '🌤️',
  'dictionary': '📚',
  'feedback': '💬',
  'chinese-vocabulary': '汉',
  'english-vocabulary': 'A',
  'constants': '∑',
  'practice': '🎴',
  'random': '🎲',
  'my-timetable': '📅',
  'study-timer': '⏱️',
  'notes': '📝',
  'grade-scale': '📊',
  'ielts-writing': '✍️',
  'student-planner': '📋',
  'unit-converter': '🔄',
  'course-calculator': '🧮',
  'money-management': '💰',
  'qr-generator': '🔳'
};

// Tool descriptions for the home grid
const toolDescriptions = {
  'weather': 'Check weather information',
  'dictionary': 'Look up word definitions',
  'feedback': 'Share bugs, improvements, and support requests',
  'chinese-vocabulary': 'Build and search Chinese vocabulary',
  'english-vocabulary': 'Build and search English vocabulary',
  'constants': 'Browse and store math/physics constants',
  'practice': 'Practice with flashcards',
  'random': 'Generate random values',
  'my-timetable': 'Manage your schedule',
  'study-timer': 'Focus and break timer',
  'notes': 'Take and organize notes',
  'grade-scale': 'View grade conversion scale',
  'ielts-writing': 'IELTS writing simulation and topic practice',
  'student-planner': 'Plan your tasks',
  'unit-converter': 'Convert between units',
  'course-calculator': 'Calculate course grades',
  'money-management': 'Manage your budget',
  'qr-generator': 'Create shareable QR codes'
};

const toolCategories = [
  {
    id: 'study-planning',
    label: 'Study & Planning',
    toolIds: ['study-timer', 'my-timetable', 'student-planner', 'notes']
  },
  {
    id: 'academics',
    label: 'Academics',
    toolIds: ['course-calculator', 'grade-scale', 'dictionary', 'chinese-vocabulary', 'english-vocabulary', 'constants', 'practice', 'ielts-writing']
  },
  {
    id: 'utilities',
    label: 'Utilities',
    toolIds: ['weather', 'unit-converter', 'random', 'qr-generator']
  },
  {
    id: 'finance',
    label: 'Finance',
    toolIds: ['money-management']
  }
];

const getTimerBadgeText = () => {
  const state = loadStudyTimerState();
  if (!state.isRunning) {
    return '';
  }

  const modeLabel = state.mode === 'break' ? 'Break' : 'Focus';
  return `${modeLabel} ${formatTimerDisplay(state.secondsLeft)}`;
};

const syncTopbarTimerBadge = () => {
  const topbarTimer = document.querySelector('#topbar-timer');
  if (!topbarTimer) {
    return;
  }

  const timerBadgeText = getTimerBadgeText();
  topbarTimer.textContent = timerBadgeText;
  topbarTimer.classList.toggle('visible', Boolean(timerBadgeText));
};

const syncTopbarStreak = () => {
  const topbarStreak = document.querySelector('#topbar-streak');
  if (!topbarStreak) {
    return;
  }

  const streakDisplay = streakState.count > 0 ? `🔥 ${streakState.count}` : '';
  topbarStreak.textContent = streakDisplay;
  topbarStreak.classList.toggle('visible', streakState.count > 0);
};

const syncTopbarUnsavedIndicator = () => {
  const unsavedIndicator = document.querySelector('#topbar-unsaved');
  if (!unsavedIndicator) {
    return;
  }

  const showUnsaved = Boolean(currentUser) && hasUnsavedCloudChanges();
  unsavedIndicator.textContent = showUnsaved ? 'Unsaved cloud changes' : '';
  unsavedIndicator.classList.toggle('visible', showUnsaved);
};

const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const getNotificationLevel = (message = '') => {
  const text = message.toLowerCase();
  if (/(failed|unable|error|wrong|cannot|could not)/.test(text)) {
    return 'error';
  }
  if (/(warning|canceled|cancelled|skip|not enough|no result|no words|empty)/.test(text)) {
    return 'warning';
  }
  if (/(saved|added|updated|deleted|copied|success|loaded|result found|synced)/.test(text)) {
    return 'success';
  }
  return 'info';
};

const shouldNotifyFromStatus = (message = '') => {
  const text = message.toLowerCase();
  const importantSuccess = /(delete all|deleted all|clear all|sync|synced|save to firebase|saved to firebase|save to cloud|saved to cloud)/.test(text);
  const importantFailure = /(failed|unable|error|could not).*(sync|save|firebase|cloud)|((sync|save|firebase|cloud).*(failed|unable|error|could not))/.test(text);
  return importantSuccess || importantFailure;
};

const syncNotificationUi = () => {
  const unreadBadge = document.querySelector('#notification-unread');
  const toastBox = document.querySelector('#global-toast');
  const alertBox = document.querySelector('#global-alert');
  const modalBackdrop = document.querySelector('#notification-modal-backdrop');
  const modalList = document.querySelector('#notification-list');

  if (unreadBadge) {
    unreadBadge.textContent = unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount);
    unreadBadge.hidden = unreadNotificationCount <= 0;
  }

  if (toastBox) {
    if (!currentToast) {
      toastBox.hidden = true;
      toastBox.textContent = '';
      toastBox.classList.remove('info', 'success', 'warning', 'error');
    } else {
      toastBox.hidden = false;
      toastBox.textContent = currentToast.message;
      toastBox.classList.remove('info', 'success', 'warning', 'error');
      toastBox.classList.add(currentToast.level);
    }
  }

  if (alertBox) {
    if (!currentAlert) {
      alertBox.hidden = true;
      alertBox.textContent = '';
      alertBox.classList.remove('info', 'success', 'warning', 'error');
    } else {
      alertBox.hidden = false;
      alertBox.textContent = currentAlert.message;
      alertBox.classList.remove('info', 'success', 'warning', 'error');
      alertBox.classList.add(currentAlert.level);
    }
  }

  if (modalBackdrop) {
    modalBackdrop.hidden = !isNotificationModalOpen;
  }

  if (modalList) {
    modalList.innerHTML = notifications.length
      ? notifications
          .map(
            (item) => `
              <li class="notification-item ${item.level}">
                <div class="notification-item-head">
                  <strong>${escapeHtml(item.source)}</strong>
                  <span>${escapeHtml(item.timeLabel)}</span>
                </div>
                <p>${escapeHtml(item.message)}</p>
              </li>
            `
          )
          .join('')
      : '<li class="notification-empty">No notifications yet.</li>';
  }
};

const addNotification = ({ message, source = 'System', level = null, showAsAlert = false }) => {
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage) {
    return;
  }

  const notificationLevel = level || getNotificationLevel(normalizedMessage);
  const notificationKey = `${source}:${notificationLevel}:${normalizedMessage}`;
  const now = Date.now();
  if (notificationKey === lastNotificationKey && now - lastNotificationTime < 800) {
    return;
  }
  lastNotificationKey = notificationKey;
  lastNotificationTime = now;

  const item = {
    id: `ntf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message: normalizedMessage,
    source,
    level: notificationLevel,
    timeLabel: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  notifications = [item, ...notifications].slice(0, 80);
  unreadNotificationCount += 1;

  if (toastTimerId) {
    clearTimeout(toastTimerId);
  }
  currentToast = { message: item.message, level: item.level };
  toastTimerId = window.setTimeout(() => {
    currentToast = null;
    syncNotificationUi();
  }, 2400);

  if (showAsAlert || notificationLevel === 'warning' || notificationLevel === 'error') {
    if (alertTimerId) {
      clearTimeout(alertTimerId);
    }
    currentAlert = { message: item.message, level: item.level };
    alertTimerId = window.setTimeout(() => {
      currentAlert = null;
      syncNotificationUi();
    }, 4200);
  }

  syncNotificationUi();
};

const openNotificationModal = () => {
  isNotificationModalOpen = true;
  unreadNotificationCount = 0;
  syncNotificationUi();
};

const closeNotificationModal = () => {
  isNotificationModalOpen = false;
  syncNotificationUi();
};

const openVersionModal = () => {
  isVersionModalOpen = true;
  renderApp();
};

const closeVersionModal = () => {
  isVersionModalOpen = false;
  renderApp();
};

const shouldTrackButtonActivity = (label) => {
  return /(delete all|clear all|sync|save to firebase|save to cloud)/i.test(label);
};

const hasUnsavedCloudChanges = () => {
  return [...dirtyCloudTools.values()].some(Boolean);
};

const getActiveToolLabel = () => {
  if (activeToolId === 'home') {
    return 'Home';
  }

  return getActiveTool()?.label || 'Tool';
};

const disconnectStatusObserver = () => {
  if (statusObserver) {
    statusObserver.disconnect();
    statusObserver = null;
  }

  observedStatusElements.forEach((element) => {
    delete element.dataset.lastStatusText;
  });
  observedStatusElements = [];
};

const connectStatusObserver = () => {
  disconnectStatusObserver();
  const toolContent = document.querySelector('#tool-content');
  if (!toolContent) {
    return;
  }

  const statusElements = toolContent.querySelectorAll('.notes-status, .timetable-status, [id$="status"]');
  observedStatusElements = [...statusElements];
  observedStatusElements.forEach((element) => {
    element.dataset.lastStatusText = (element.textContent || '').trim();
  });

  statusObserver = new MutationObserver(() => {
    observedStatusElements.forEach((element) => {
      const nextText = (element.textContent || '').trim();
      const prevText = element.dataset.lastStatusText || '';
      if (!nextText || nextText === prevText) {
        return;
      }

      element.dataset.lastStatusText = nextText;
      if (!shouldNotifyFromStatus(nextText)) {
        return;
      }

      addNotification({
        message: nextText,
        source: getActiveToolLabel()
      });
    });
  });

  statusObserver.observe(toolContent, {
    subtree: true,
    characterData: true,
    childList: true
  });
};

const renderAuthControls = () => {
  if (!isFirebaseConfigured) {
    return `
      <p class="firebase-warning" title="Add VITE_FIREBASE_* env values to enable auth">Firebase not configured</p>
    `;
  }

  if (!currentUser) {
    return `
      <div class="auth-actions">
        <button type="button" id="btn-open-signin" class="auth-btn">Sign in</button>
        <button type="button" id="btn-open-signup" class="auth-btn auth-btn-primary">Sign up</button>
      </div>
    `;
  }

  const displayName = userProfile?.displayName || currentUser.displayName || currentUser.email || 'User';
  return `
    <div class="auth-actions">
      <button type="button" id="btn-open-profile" class="auth-btn auth-user-pill">${escapeHtml(displayName)}</button>
      <button type="button" id="btn-signout" class="auth-btn">Sign out</button>
    </div>
  `;
};

const renderAuthModal = () => {
  if (!isAuthModalOpen) {
    return '';
  }

  const isSignUp = authMode === 'signup';
  return `
    <div class="modal-backdrop" id="auth-modal-backdrop">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="modal-header">
          <h2 id="auth-modal-title">${isSignUp ? 'Create account' : 'Sign in'}</h2>
          <button type="button" class="modal-close" id="auth-modal-close" aria-label="Close auth modal">✕</button>
        </div>
        <form id="auth-form" class="modal-form">
          ${
            isSignUp
              ? `
            <label>
              Display name
              <input type="text" name="displayName" maxlength="40" placeholder="Your name" required />
            </label>
          `
              : ''
          }
          <label>
            Email
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" name="password" minlength="6" placeholder="At least 6 characters" required />
          </label>
          ${authError ? `<p class="form-message error">${escapeHtml(authError)}</p>` : ''}
          <button type="submit" class="auth-btn auth-btn-primary">${isSignUp ? 'Create account' : 'Sign in'}</button>
        </form>
        <button type="button" id="auth-mode-switch" class="auth-link-btn">
          ${isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </section>
    </div>
  `;
};

const renderProfileModal = () => {
  if (!isProfileModalOpen || !currentUser) {
    return '';
  }

  const displayName = userProfile?.displayName || currentUser.displayName || '';
  const bio = userProfile?.bio || '';
  const email = currentUser.email || '';

  return `
    <div class="modal-backdrop" id="profile-modal-backdrop">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div class="modal-header">
          <h2 id="profile-modal-title">Your profile</h2>
          <button type="button" class="modal-close" id="profile-modal-close" aria-label="Close profile modal">✕</button>
        </div>
        <form id="profile-form" class="modal-form">
          <label>
            Display name
            <input type="text" name="displayName" maxlength="40" value="${escapeHtml(displayName)}" required />
          </label>
          <label>
            Bio
            <textarea name="bio" rows="4" maxlength="180" placeholder="Tell others about your study goals">${escapeHtml(bio)}</textarea>
          </label>
          <label>
            Email
            <input type="email" value="${escapeHtml(email)}" disabled />
          </label>
          ${profileMessage ? `<p class="form-message">${escapeHtml(profileMessage)}</p>` : ''}
          <button type="submit" class="auth-btn auth-btn-primary">Save profile</button>
        </form>
      </section>
    </div>
  `;
};

const renderNotificationModal = () => {
  return `
    <div class="global-notification-modal" id="notification-modal-backdrop" ${isNotificationModalOpen ? '' : 'hidden'}>
      <section class="global-notification-card" role="dialog" aria-modal="true" aria-labelledby="notification-modal-title">
        <div class="global-notification-head">
          <h2 id="notification-modal-title">Notifications</h2>
          <button type="button" class="modal-close" id="notification-modal-close" aria-label="Close notifications">✕</button>
        </div>
        <ul id="notification-list" class="notification-list"></ul>
      </section>
    </div>
  `;
};

const renderVersionModal = () => {
  const entriesHtml = VERSION_HISTORY.map((item) => {
    const updatesHtml = (item.updates || []).map((update) => `<li>${escapeHtml(update)}</li>`).join('');
    const fixesHtml = (item.fixes || []).map((fix) => `<li>${escapeHtml(fix)}</li>`).join('');
    const fixesSection = fixesHtml
      ? `
          <p class="version-entry-label">Fixes</p>
          <ul>${fixesHtml}</ul>
        `
      : '';

    return `
      <article class="version-entry">
        <header class="version-entry-head">
          <h3>${escapeHtml(item.version)}</h3>
          <span>${escapeHtml(item.date)}</span>
        </header>
        <div class="version-entry-body">
          <p class="version-entry-label">Updates</p>
          <ul>${updatesHtml || '<li>No update notes.</li>'}</ul>
          ${fixesSection}
        </div>
      </article>
    `;
  }).join('');

  return `
    <div class="global-notification-modal" id="version-modal-backdrop" ${isVersionModalOpen ? '' : 'hidden'}>
      <section class="global-notification-card version-modal-card" role="dialog" aria-modal="true" aria-labelledby="version-modal-title">
        <div class="global-notification-head">
          <h2 id="version-modal-title">Version History (${escapeHtml(APP_VERSION)})</h2>
          <button type="button" class="modal-close" id="version-modal-close" aria-label="Close version history">✕</button>
        </div>
        <div class="version-list">${entriesHtml}</div>
      </section>
    </div>
  `;
};

const renderMenu = () => {
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const homeSection = `
    <li class="tool-category">
      <p class="tool-category-label">General</p>
      <ul class="tool-category-list">
        <li>
          <button
            class="tool-link ${activeToolId === 'home' ? 'active' : ''}"
            type="button"
            data-tool-id="home"
          >
            🏠 Home
          </button>
        </li>
        <li>
          <button
            class="tool-link ${activeToolId === 'feedback' ? 'active' : ''}"
            type="button"
            data-tool-id="feedback"
          >
            Feedback
          </button>
        </li>
      </ul>
    </li>
  `;

  const categorySections = toolCategories
    .map((category) => {
      const isCollapsed = collapsedToolCategories.has(category.id);
      const toolItems = category.toolIds
        .map((toolId) => toolById.get(toolId))
        .filter(Boolean)
        .map(
          (tool) => `
            <li>
              <button
                class="tool-link ${tool.id === activeToolId ? 'active' : ''}"
                type="button"
                data-tool-id="${tool.id}"
              >
                ${tool.label}
              </button>
            </li>
          `
        )
        .join('');

      if (!toolItems) {
        return '';
      }

      return `
        <li class="tool-category ${isCollapsed ? 'collapsed' : ''}">
          <button type="button" class="tool-category-label tool-category-toggle" data-category-id="${category.id}" aria-expanded="${!isCollapsed}">
            <span>${category.label}</span>
          </button>
          <ul class="tool-category-list" ${isCollapsed ? 'hidden' : ''}>
            ${toolItems}
          </ul>
        </li>
      `;
    })
    .join('');

  return homeSection + categorySections;
};

const getActiveTool = () => {
  return tools.find((tool) => tool.id === activeToolId);
};

const renderHome = () => {
  const toolsHtml = tools
    .map(
      (tool) => `
    <div class="tool-card" data-tool-id="${tool.id}">
      <div class="tool-icon">${toolIcons[tool.id] || '🛠️'}</div>
      <p class="tool-name">${tool.label}</p>
      <p class="tool-description">${toolDescriptions[tool.id] || 'Click to open'}</p>
    </div>
  `
    )
    .join('');

  return `
    <div class="home-page">
      <div class="home-header">
        <h1>Welcome to Student Tools</h1>
        <p>Choose a tool to get started</p>
      </div>
      <div class="tools-grid">
        ${toolsHtml}
      </div>
    </div>
  `;
};

const mountActiveTool = () => {
  if (activeToolId === 'home') {
    return;
  }
  const tool = getActiveTool();
  const toolRoot = document.querySelector('#tool-content');
  if (tool && typeof tool.mount === 'function') {
    tool.mount(toolRoot);
  }
};

 const renderApp = () => {
   const timerBadgeText = getTimerBadgeText();
   const isHome = activeToolId === 'home';
   const contentHtml = isHome ? renderHome() : getActiveTool().render();
   const streakDisplay = streakState.count > 0 ? `🔥 ${streakState.count}` : '';
 
   app.innerHTML = `
     <div class="layout">
       <header class="topbar">
        <div class="topbar-shell">
          <div class="topbar-group topbar-group-left">
            <button id="toggle-panel" class="menu-btn" type="button" aria-label="Toggle left panel">☰</button>
            <div class="topbar-brand">
              <h1>Student Tools</h1>
              <span>${getActiveToolLabel()}</span>
            </div>
          </div>

          <div class="topbar-group topbar-group-center">
            <div id="topbar-streak" class="topbar-streak ${streakState.count > 0 ? 'visible' : ''}">${streakDisplay}</div>
            <div id="topbar-timer" class="topbar-timer ${timerBadgeText ? 'visible' : ''}">${timerBadgeText}</div>
            <div id="topbar-unsaved" class="topbar-unsaved ${currentUser && hasUnsavedCloudChanges() ? 'visible' : ''}">${currentUser && hasUnsavedCloudChanges() ? 'Unsaved cloud changes' : ''}</div>
          </div>

          <div class="topbar-group topbar-group-right">
            <button id="btn-toggle-theme" class="theme-btn" type="button" aria-label="Toggle theme">${currentTheme === 'dark' ? 'Light' : 'Dark'} theme</button>
            <button id="btn-open-version" class="version-btn" type="button" aria-label="Open version history">Version ${APP_VERSION}</button>
            <button id="btn-open-notifications" class="notification-btn" type="button" aria-label="Open notifications">
              Notifications
              <span id="notification-unread" class="notification-unread" ${unreadNotificationCount > 0 ? '' : 'hidden'}>${unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>
            </button>
            <div class="topbar-auth">
              ${renderAuthControls()}
            </div>
          </div>
        </div>
       </header>
 
       <div class="content-shell">
         <aside id="left-panel" class="left-panel open">
          <h2>Tool Categories</h2>
           <ul id="tool-menu" class="tool-list">
             ${renderMenu()}
           </ul>
         </aside>
 
         <main class="main-content" id="tool-content">
           ${contentHtml}
         </main>
       </div>

       ${renderAuthModal()}
       ${renderProfileModal()}
       ${renderNotificationModal()}
      ${renderVersionModal()}

       <div id="global-alert" class="global-alert" ${currentAlert ? '' : 'hidden'}>${escapeHtml(currentAlert?.message || '')}</div>
       <div id="global-toast" class="global-toast" ${currentToast ? '' : 'hidden'}>${escapeHtml(currentToast?.message || '')}</div>
     </div>
   `;

   const toggleBtn = document.querySelector('#toggle-panel');
   const leftPanel = document.querySelector('#left-panel');
   const toolMenu = document.querySelector('#tool-menu');
   const contentArea = document.querySelector('#tool-content');
  const signInButton = document.querySelector('#btn-open-signin');
  const signUpButton = document.querySelector('#btn-open-signup');
  const signOutButton = document.querySelector('#btn-signout');
  const openProfileButton = document.querySelector('#btn-open-profile');
  const authModalClose = document.querySelector('#auth-modal-close');
  const authModalBackdrop = document.querySelector('#auth-modal-backdrop');
  const authModeSwitch = document.querySelector('#auth-mode-switch');
  const authForm = document.querySelector('#auth-form');
  const profileForm = document.querySelector('#profile-form');
  const profileModalClose = document.querySelector('#profile-modal-close');
  const profileModalBackdrop = document.querySelector('#profile-modal-backdrop');
  const openNotificationsButton = document.querySelector('#btn-open-notifications');
  const toggleThemeButton = document.querySelector('#btn-toggle-theme');
  const openVersionButton = document.querySelector('#btn-open-version');
  const notificationModalBackdrop = document.querySelector('#notification-modal-backdrop');
  const notificationModalClose = document.querySelector('#notification-modal-close');
  const versionModalBackdrop = document.querySelector('#version-modal-backdrop');
  const versionModalClose = document.querySelector('#version-modal-close');

   toggleBtn.addEventListener('click', () => {
     leftPanel.classList.toggle('open');
   });

   toolMenu.addEventListener('click', (event) => {
     const categoryToggle = event.target.closest('[data-category-id]');
     if (categoryToggle) {
       const categoryId = categoryToggle.dataset.categoryId;
       if (categoryId) {
         const isCollapsed = collapsedToolCategories.has(categoryId);
         if (isCollapsed) {
           collapsedToolCategories.clear();
           toolCategories.forEach((category) => {
             if (category.id !== categoryId) {
               collapsedToolCategories.add(category.id);
             }
           });
         } else {
           collapsedToolCategories.add(categoryId);
         }
         renderApp();
       }
       return;
     }

     const button = event.target.closest('[data-tool-id]');
     if (!button) {
       return;
     }

     const nextToolId = button.dataset.toolId;
     if (!nextToolId || nextToolId === activeToolId) {
       return;
     }

     activeToolId = nextToolId;
     renderApp();
   });

   if (isHome) {
     const toolCards = contentArea.querySelectorAll('.tool-card');
     toolCards.forEach((card) => {
       card.addEventListener('click', () => {
         const toolId = card.dataset.toolId;
         activeToolId = toolId;
         renderApp();
       });
     });
   }

   openNotificationsButton?.addEventListener('click', () => {
    openNotificationModal();
   });

  openVersionButton?.addEventListener('click', () => {
   openVersionModal();
  });

    toggleThemeButton?.addEventListener('click', () => {
     toggleTheme();
    });

   notificationModalClose?.addEventListener('click', () => {
    closeNotificationModal();
   });

   notificationModalBackdrop?.addEventListener('click', (event) => {
    if (event.target !== notificationModalBackdrop) {
      return;
    }

    closeNotificationModal();
   });

   versionModalClose?.addEventListener('click', () => {
    closeVersionModal();
   });

   versionModalBackdrop?.addEventListener('click', (event) => {
    if (event.target !== versionModalBackdrop) {
      return;
    }

    closeVersionModal();
   });

   contentArea?.addEventListener('click', (event) => {
    const button = event.target.closest('button.action-btn, button.remove-row');
    if (!button) {
      return;
    }

    const label = (button.textContent || '').trim();
    if (!shouldTrackButtonActivity(label)) {
      return;
    }

    addNotification({
      message: `${label} action started.`,
      source: getActiveToolLabel()
    });
   });

   signInButton?.addEventListener('click', () => {
    authMode = 'signin';
    authError = '';
    isAuthModalOpen = true;
    renderApp();
   });

   signUpButton?.addEventListener('click', () => {
    authMode = 'signup';
    authError = '';
    isAuthModalOpen = true;
    renderApp();
   });

   signOutButton?.addEventListener('click', async () => {
    try {
      await signOutUser();
      addNotification({
        message: 'Signed out successfully.',
        source: 'Account',
        level: 'success'
      });
    } catch (error) {
      authError = error?.message ?? 'Could not sign out. Please try again.';
      isAuthModalOpen = true;
      authMode = 'signin';
      addNotification({
        message: authError,
        source: 'Account',
        level: 'error',
        showAsAlert: true
      });
      renderApp();
    }
   });

   openProfileButton?.addEventListener('click', () => {
    profileMessage = '';
    isProfileModalOpen = true;
    renderApp();
   });

   authModalClose?.addEventListener('click', () => {
    isAuthModalOpen = false;
    authError = '';
    renderApp();
   });

   authModalBackdrop?.addEventListener('click', (event) => {
    if (event.target !== authModalBackdrop) {
      return;
    }

    isAuthModalOpen = false;
    authError = '';
    renderApp();
   });

   authModeSwitch?.addEventListener('click', () => {
    authMode = authMode === 'signup' ? 'signin' : 'signup';
    authError = '';
    renderApp();
   });

   authForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(authForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const displayName = String(formData.get('displayName') || '').trim();

    try {
      if (authMode === 'signup') {
        await signUpWithEmail({ email, password, displayName });
        addNotification({
          message: 'Account created successfully.',
          source: 'Account',
          level: 'success'
        });
      } else {
        await signInWithEmail({ email, password });
        addNotification({
          message: 'Signed in successfully.',
          source: 'Account',
          level: 'success'
        });
      }

      isAuthModalOpen = false;
      authError = '';
      renderApp();
    } catch (error) {
      authError = error?.message ?? 'Authentication failed. Please try again.';
      addNotification({
        message: authError,
        source: 'Account',
        level: 'error',
        showAsAlert: true
      });
      renderApp();
    }
   });

   profileModalClose?.addEventListener('click', () => {
    isProfileModalOpen = false;
    profileMessage = '';
    renderApp();
   });

   profileModalBackdrop?.addEventListener('click', (event) => {
    if (event.target !== profileModalBackdrop) {
      return;
    }

    isProfileModalOpen = false;
    profileMessage = '';
    renderApp();
   });

   profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentUser) {
      return;
    }

    const formData = new FormData(profileForm);
    const displayName = String(formData.get('displayName') || '').trim();
    const bio = String(formData.get('bio') || '').trim();

    try {
      userProfile = await saveUserProfile(currentUser.uid, {
        displayName,
        bio,
        email: currentUser.email ?? ''
      });

      await syncAuthDisplayName(displayName);
      profileMessage = 'Profile saved.';
      addNotification({
        message: 'Profile updated successfully.',
        source: 'Profile',
        level: 'success'
      });
      renderApp();
    } catch (error) {
      profileMessage = error?.message ?? 'Could not save profile.';
      addNotification({
        message: profileMessage,
        source: 'Profile',
        level: 'error',
        showAsAlert: true
      });
      renderApp();
    }
   });

  mountActiveTool();
  connectStatusObserver();
  syncNotificationUi();
  syncTopbarTimerBadge();
  syncTopbarStreak();
  syncThemeToggleLabel();
};

window.addEventListener(STUDY_TIMER_EVENT, syncTopbarTimerBadge);

window.addEventListener(STREAK_EVENT, (event) => {
  streakState = event.detail;
  syncTopbarStreak();
});

window.addEventListener(CLOUD_DIRTY_EVENT, (event) => {
  const toolId = event.detail?.toolId;
  const dirty = Boolean(event.detail?.dirty);
  if (!toolId) {
    return;
  }

  dirtyCloudTools.set(toolId, dirty);
  syncTopbarUnsavedIndicator();
});

window.addEventListener('beforeunload', (event) => {
  if (!currentUser || !hasUnsavedCloudChanges()) {
    return;
  }

  event.preventDefault();
  event.returnValue = 'You have unsaved data changes in cloud-synced tools. Please save before leaving.';
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (isNotificationModalOpen) {
    closeNotificationModal();
    return;
  }

  if (isVersionModalOpen) {
    closeVersionModal();
    return;
  }

  if (isProfileModalOpen) {
    isProfileModalOpen = false;
    profileMessage = '';
    renderApp();
    return;
  }

  if (isAuthModalOpen) {
    isAuthModalOpen = false;
    authError = '';
    renderApp();
  }
});

watchAuthState(async (user) => {
  currentUser = user;
  authError = '';

  if (!user) {
    dirtyCloudTools.clear();
  }
  syncTopbarUnsavedIndicator();

  if (!user || !isFirebaseConfigured) {
    userProfile = null;
    isProfileModalOpen = false;
    renderApp();
    return;
  }

  try {
    userProfile = await ensureUserProfile(user);
  } catch (error) {
    console.error('Failed to load user profile from Firestore.', error);
    userProfile = {
      displayName: user.displayName || '',
      bio: ''
    };
  }

  renderApp();
});

renderApp();
applyTheme();
