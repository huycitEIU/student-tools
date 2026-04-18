import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { getCurrentUser } from '../firebase/auth.js';
import { db, isFirebaseConfigured } from '../firebase/config.js';

const TOOL_ID = 'feedback';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'improve', label: 'Improve' },
  { value: 'help', label: 'Help' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' }
];

const FEEDBACK_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in-review', label: 'In Review' },
  { value: 'planned', label: 'Planned' },
  { value: 'done', label: 'Done' }
];

const TYPE_LABELS = FEEDBACK_TYPES.reduce((map, item) => {
  map[item.value] = item.label;
  return map;
}, {});

const STATUS_LABELS = FEEDBACK_STATUSES.reduce((map, item) => {
  map[item.value] = item.label;
  return map;
}, {});

const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const formatCreatedAt = (createdAt) => {
  if (!createdAt) {
    return 'Just now';
  }

  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate().toLocaleString('en-GB');
  }

  return 'Just now';
};

const feedbackCollection = () => collection(db, 'feedbacks');

const renderFeedbackList = (items, isAdmin) => {
  if (!items.length) {
    return '<li class="feedback-empty">No feedback yet. Be the first to share one.</li>';
  }

  return items
    .map((item) => {
      const type = FEEDBACK_TYPES.some((entry) => entry.value === item.type) ? item.type : 'other';
      const status = FEEDBACK_STATUSES.some((entry) => entry.value === item.status) ? item.status : 'open';
      const canUpdateStatus = isAdmin;

      const statusControl = canUpdateStatus
        ? `
            <div class="feedback-status-controls">
              <select class="feedback-status-select" data-feedback-id="${escapeHtml(item.id)}">
                ${FEEDBACK_STATUSES.map((entry) => `<option value="${entry.value}" ${entry.value === status ? 'selected' : ''}>${entry.label}</option>`).join('')}
              </select>
              <button class="action-btn" type="button" data-feedback-action="save-status" data-feedback-id="${escapeHtml(item.id)}">Update Status</button>
            </div>
          `
        : `<span class="feedback-status-badge status-${status}">${escapeHtml(STATUS_LABELS[status] || 'Open')}</span>`;

      return `
        <li class="feedback-item type-${type}">
          <div class="feedback-item-head">
            <span class="feedback-type-badge type-${type}">${escapeHtml(TYPE_LABELS[type] || 'Other')}</span>
            ${statusControl}
          </div>
          <p class="feedback-message">${escapeHtml(item.message)}</p>
          <p class="feedback-meta">
            <strong>${escapeHtml(item.createdBy || 'Anonymous')}</strong>
            <span>${escapeHtml(formatCreatedAt(item.createdAt))}</span>
          </p>
        </li>
      `;
    })
    .join('');
};

export const feedbackTool = {
  id: TOOL_ID,
  label: 'Feedback',
  render: () => `
    <section class="card feedback-card">
      <h2>Feedback</h2>
      <p>Submit bugs, improvements, and help requests. Everyone can view feedback items.</p>

      <form id="feedback-form" class="feedback-form">
        <select id="feedback-type" required>
          ${FEEDBACK_TYPES.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
        </select>
        <textarea id="feedback-message" maxlength="500" placeholder="Describe your feedback..." required></textarea>
        <button class="action-btn primary" type="submit">Submit Feedback</button>
      </form>

      <div id="feedback-status-box" class="notes-status">Loading feedback...</div>
      <ul id="feedback-list" class="feedback-list"></ul>
    </section>
  `,
  mount: (root) => {
    const form = root.querySelector('#feedback-form');
    const typeInput = root.querySelector('#feedback-type');
    const messageInput = root.querySelector('#feedback-message');
    const statusBox = root.querySelector('#feedback-status-box');
    const feedbackList = root.querySelector('#feedback-list');

    let feedbackItems = [];
    let isAdmin = false;

    const loadAdminState = async () => {
      const user = getCurrentUser();
      if (!user || !isFirebaseConfigured || !db) {
        isAdmin = false;
        return;
      }

      try {
        const adminSnapshot = await getDoc(doc(db, 'admins', user.uid));
        isAdmin = adminSnapshot.exists();
      } catch {
        isAdmin = false;
      }
    };

    const loadFeedback = async () => {
      if (!isFirebaseConfigured || !db) {
        statusBox.textContent = 'Firebase is not configured. Feedback list is unavailable.';
        feedbackList.innerHTML = '<li class="feedback-empty">Feedback requires Firebase configuration.</li>';
        return;
      }

      try {
        const snapshot = await getDocs(query(feedbackCollection(), orderBy('createdAt', 'desc')));
        feedbackItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        feedbackList.innerHTML = renderFeedbackList(feedbackItems, isAdmin);
        statusBox.textContent = `Loaded ${feedbackItems.length} feedback item(s).`;
      } catch {
        statusBox.textContent = 'Unable to load feedback right now.';
        feedbackList.innerHTML = '<li class="feedback-empty">Unable to load feedback items.</li>';
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const currentUser = getCurrentUser();
      if (!currentUser) {
        statusBox.textContent = 'Please sign in to submit feedback.';
        return;
      }

      const message = messageInput.value.trim();
      const type = typeInput.value;

      if (message.length < 8) {
        statusBox.textContent = 'Please write at least 8 characters.';
        return;
      }

      if (!isFirebaseConfigured || !db) {
        statusBox.textContent = 'Firebase is not configured.';
        return;
      }

      try {
        await addDoc(feedbackCollection(), {
          type,
          status: 'open',
          message,
          createdBy: currentUser.displayName || currentUser.email || 'User',
          createdByUid: currentUser.uid,
          createdAt: serverTimestamp()
        });

        form.reset();
        typeInput.value = 'bug';
        messageInput.focus();
        statusBox.textContent = 'Feedback submitted.';
        await loadFeedback();
      } catch {
        statusBox.textContent = 'Unable to submit feedback. Please try again.';
      }
    });

    feedbackList.addEventListener('click', async (event) => {
      const trigger = event.target.closest('[data-feedback-action="save-status"]');
      if (!trigger) {
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        statusBox.textContent = 'Please sign in to update status.';
        return;
      }

      if (!isAdmin) {
        statusBox.textContent = 'Only admin accounts can update feedback status.';
        return;
      }

      const feedbackId = trigger.dataset.feedbackId;
      const item = feedbackItems.find((entry) => entry.id === feedbackId);
      if (!item) {
        statusBox.textContent = 'Feedback item not found.';
        return;
      }

      const select = feedbackList.querySelector(`.feedback-status-select[data-feedback-id="${feedbackId}"]`);
      if (!select) {
        return;
      }

      const nextStatus = select.value;

      try {
        await updateDoc(doc(db, 'feedbacks', feedbackId), {
          status: nextStatus
        });

        statusBox.textContent = 'Status updated.';
        await loadFeedback();
      } catch {
        statusBox.textContent = 'Unable to update status right now.';
      }
    });

    const initialize = async () => {
      await loadAdminState();
      await loadFeedback();
    };

    initialize();
  }
};
