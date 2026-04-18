import { getCurrentUser } from '../firebase/auth.js';
import { deleteToolData, loadToolData, saveToolData } from '../firebase/toolData.js';

const STORAGE_KEY = 'student-tools:notes-v1';
const TOOL_ID = 'notes';
const SESSION_HYDRATION_KEY_PREFIX = 'student-tools:notes-hydrated-v1:';
const CLOUD_DIRTY_EVENT = 'student-tools:cloud-dirty';

const getHydrationKey = (uid) => `${SESSION_HYDRATION_KEY_PREFIX}${uid}`;

const emitCloudDirty = (dirty) => {
  window.dispatchEvent(
    new CustomEvent(CLOUD_DIRTY_EVENT, {
      detail: {
        toolId: TOOL_ID,
        dirty
      }
    })
  );
};

const loadNotes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveNotes = (notes) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

const loadLocalNotes = loadNotes;

const loadStoredNotes = async () => {
  const user = getCurrentUser();
  if (!user) {
    emitCloudDirty(false);
    return loadLocalNotes();
  }

  const hydrationKey = getHydrationKey(user.uid);
  if (sessionStorage.getItem(hydrationKey) === '1') {
    return loadLocalNotes();
  }

  const remoteNotes = await loadToolData(user.uid, TOOL_ID, null);
  sessionStorage.setItem(hydrationKey, '1');

  if (Array.isArray(remoteNotes)) {
    saveNotes(remoteNotes);
    emitCloudDirty(false);
    return remoteNotes;
  }

  return loadLocalNotes();
};

const persistNotes = async (notes) => {
  saveNotes(notes);

  const user = getCurrentUser();
  if (!user) {
    return;
  }

  sessionStorage.setItem(getHydrationKey(user.uid), '1');

  await saveToolData(user.uid, TOOL_ID, notes);
  emitCloudDirty(false);
};

const clearStoredNotes = async () => {
  saveNotes([]);

  const user = getCurrentUser();
  if (!user) {
    return;
  }

  sessionStorage.setItem(getHydrationKey(user.uid), '1');

  await deleteToolData(user.uid, TOOL_ID);
  emitCloudDirty(false);
};

const createNoteCard = (note) => {
  return `
    <article class="note-card ${note.id === null ? 'editing' : ''}" data-note-id="${note.id}">
      <div class="note-card-head">
        <strong>${note.title}</strong>
        <span>${note.updatedAt}</span>
      </div>
      <p>${note.content.replaceAll('\n', '<br />')}</p>
      <div class="note-card-actions">
        <button type="button" class="action-btn note-edit-btn" data-note-id="${note.id}">Edit</button>
        <button type="button" class="remove-row note-delete-btn" data-note-id="${note.id}">Delete</button>
      </div>
    </article>
  `;
};

const formatDateTime = (date) => {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const notesTool = {
  id: 'notes',
  label: 'Notes',
  render: () => `
    <section class="card notes-card">
      <h2>Notes</h2>
      <p>Write quick notes, edit them later, and keep them saved in your browser.</p>

      <div class="notes-editor">
        <input id="note-title" type="text" placeholder="Note title" />
        <textarea id="note-content" rows="6" placeholder="Write your note here..."></textarea>
        <div class="notes-editor-actions">
          <button id="save-note-btn" class="action-btn primary" type="button">Save Note</button>
          <button id="clear-note-btn" class="remove-row" type="button">Clear</button>
        </div>
      </div>

      <div class="notes-toolbar">
        <input id="note-search" type="search" placeholder="Search notes" />
        <button id="delete-all-notes-btn" class="remove-row" type="button">Delete All</button>
      </div>

      <div id="notes-status" class="notes-status">No notes yet.</div>
      <div id="notes-list" class="notes-list"></div>
    </section>
  `,
  mount: (root) => {
    const titleInput = root.querySelector('#note-title');
    const contentInput = root.querySelector('#note-content');
    const saveBtn = root.querySelector('#save-note-btn');
    const clearBtn = root.querySelector('#clear-note-btn');
    const searchInput = root.querySelector('#note-search');
    const deleteAllBtn = root.querySelector('#delete-all-notes-btn');
    const statusBox = root.querySelector('#notes-status');
    const notesList = root.querySelector('#notes-list');

    let notes = [];
    let editingNoteId = null;
    let isMounted = true;

    const applyNotes = async () => {
      let loadWarning = '';
      try {
        notes = await loadStoredNotes();
      } catch {
        notes = loadLocalNotes();
        loadWarning = 'Could not load notes from cloud. Showing local notes.';
      }
      if (!isMounted) {
        return;
      }
      renderNotes();
      if (loadWarning) {
        statusBox.textContent = loadWarning;
      }
    };

    const renderNotes = () => {
      const query = searchInput.value.trim().toLowerCase();
      const filteredNotes = notes.filter((note) => {
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
        );
      });

      notesList.innerHTML = filteredNotes.length
        ? filteredNotes.map(createNoteCard).join('')
        : '<div class="notes-empty">No notes match your search.</div>';
      statusBox.textContent = `${notes.length} note(s) saved.`;
    };

    const resetForm = () => {
      titleInput.value = '';
      contentInput.value = '';
      editingNoteId = null;
      saveBtn.textContent = 'Save Note';
    };

    const startEdit = (noteId) => {
      const note = notes.find((item) => item.id === noteId);
      if (!note) {
        return;
      }

      editingNoteId = note.id;
      titleInput.value = note.title;
      contentInput.value = note.content;
      saveBtn.textContent = 'Update Note';
      statusBox.textContent = `Editing note: ${note.title}`;
    };

    const removeNote = async (noteId) => {
      const note = notes.find((item) => item.id === noteId);
      const shouldDelete = window.confirm(`Delete note "${note?.title || 'this note'}"? This cannot be undone.`);
      if (!shouldDelete) {
        statusBox.textContent = 'Delete canceled.';
        return;
      }

      notes = notes.filter((item) => item.id !== noteId);
      try {
        await persistNotes(notes);
        renderNotes();
      } catch {
        emitCloudDirty(true);
        renderNotes();
        statusBox.textContent = 'Note deleted locally. Could not sync delete to cloud.';
      }
      if (editingNoteId === noteId) {
        resetForm();
      }
    };

    saveBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      const content = contentInput.value.trim();

      if (!title || !content) {
        statusBox.textContent = 'Please enter both title and content.';
        return;
      }

      const now = formatDateTime(new Date());

      if (editingNoteId) {
        notes = notes.map((note) => {
          if (note.id !== editingNoteId) {
            return note;
          }

          return {
            ...note,
            title,
            content,
            updatedAt: now
          };
        });
        statusBox.textContent = 'Note updated.';
      } else {
        notes.unshift({
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          content,
          updatedAt: now
        });
        statusBox.textContent = 'Note saved.';
      }

      try {
        await persistNotes(notes);
        resetForm();
        renderNotes();
      } catch {
        emitCloudDirty(true);
        resetForm();
        renderNotes();
        statusBox.textContent = 'Saved locally. Could not sync notes to cloud right now.';
      }
    });

    clearBtn.addEventListener('click', () => {
      resetForm();
      statusBox.textContent = 'Editor cleared.';
    });

    searchInput.addEventListener('input', () => {
      renderNotes();
    });

    deleteAllBtn.addEventListener('click', async () => {
      const shouldDelete = window.confirm('Delete all notes? This cannot be undone.');
      if (!shouldDelete) {
        statusBox.textContent = 'Delete all canceled.';
        return;
      }

      notes = [];
      let deleteAllSyncFailed = false;
      try {
        await clearStoredNotes();
      } catch {
        emitCloudDirty(true);
        deleteAllSyncFailed = true;
      }
      resetForm();
      renderNotes();
      statusBox.textContent = deleteAllSyncFailed
        ? 'All notes deleted locally. Could not sync delete to cloud.'
        : 'All notes deleted.';
    });

    notesList.addEventListener('click', (event) => {
      const editBtn = event.target.closest('.note-edit-btn');
      const deleteBtn = event.target.closest('.note-delete-btn');

      if (editBtn) {
        startEdit(editBtn.dataset.noteId);
      }

      if (deleteBtn) {
        removeNote(deleteBtn.dataset.noteId);
      }
    });

    applyNotes();

    return () => {
      isMounted = false;
    };
  }
};