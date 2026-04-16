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

// Tool emoji icons for the home grid
const toolIcons = {
  'weather': '🌤️',
  'dictionary': '📚',
  'random': '🎲',
  'my-timetable': '📅',
  'study-timer': '⏱️',
  'notes': '📝',
  'grade-scale': '📊',
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
  'random': 'Generate random values',
  'my-timetable': 'Manage your schedule',
  'study-timer': 'Focus and break timer',
  'notes': 'Take and organize notes',
  'grade-scale': 'View grade conversion scale',
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
    toolIds: ['course-calculator', 'grade-scale', 'dictionary']
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

const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
      </ul>
    </li>
  `;

  const categorySections = toolCategories
    .map((category) => {
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
        <li class="tool-category">
          <p class="tool-category-label">${category.label}</p>
          <ul class="tool-category-list">
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
         <button id="toggle-panel" class="menu-btn" aria-label="Toggle left panel">☰</button>
         <h1>Student Tools</h1>
         <div id="topbar-streak" class="topbar-streak ${streakState.count > 0 ? 'visible' : ''}">${streakDisplay}</div>
         <div id="topbar-timer" class="topbar-timer ${timerBadgeText ? 'visible' : ''}">${timerBadgeText}</div>
         <div class="topbar-auth">
          ${renderAuthControls()}
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

   toggleBtn.addEventListener('click', () => {
     leftPanel.classList.toggle('open');
   });

   toolMenu.addEventListener('click', (event) => {
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
    } catch (error) {
      authError = error?.message ?? 'Could not sign out. Please try again.';
      isAuthModalOpen = true;
      authMode = 'signin';
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
      } else {
        await signInWithEmail({ email, password });
      }

      isAuthModalOpen = false;
      authError = '';
      renderApp();
    } catch (error) {
      authError = error?.message ?? 'Authentication failed. Please try again.';
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
      renderApp();
    } catch (error) {
      profileMessage = error?.message ?? 'Could not save profile.';
      renderApp();
    }
   });

  mountActiveTool();
  syncTopbarTimerBadge();
  syncTopbarStreak();
};

window.addEventListener(STUDY_TIMER_EVENT, syncTopbarTimerBadge);

window.addEventListener(STREAK_EVENT, (event) => {
  streakState = event.detail;
  syncTopbarStreak();
});

watchAuthState(async (user) => {
  currentUser = user;
  authError = '';

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
