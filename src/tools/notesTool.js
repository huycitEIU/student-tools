const STORAGE_KEY = 'student-tools:notes-v1';

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

    let notes = loadNotes();
    let editingNoteId = null;

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

    const removeNote = (noteId) => {
      const note = notes.find((item) => item.id === noteId);
      const shouldDelete = window.confirm(`Delete note "${note?.title || 'this note'}"? This cannot be undone.`);
      if (!shouldDelete) {
        statusBox.textContent = 'Delete canceled.';
        return;
      }

      notes = notes.filter((item) => item.id !== noteId);
      saveNotes(notes);
      if (editingNoteId === noteId) {
        resetForm();
      }
      renderNotes();
    };

    saveBtn.addEventListener('click', () => {
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

      saveNotes(notes);
      resetForm();
      renderNotes();
    });

    clearBtn.addEventListener('click', () => {
      resetForm();
      statusBox.textContent = 'Editor cleared.';
    });

    searchInput.addEventListener('input', () => {
      renderNotes();
    });

    deleteAllBtn.addEventListener('click', () => {
      const shouldDelete = window.confirm('Delete all notes? This cannot be undone.');
      if (!shouldDelete) {
        statusBox.textContent = 'Delete all canceled.';
        return;
      }

      notes = [];
      saveNotes(notes);
      resetForm();
      renderNotes();
      statusBox.textContent = 'All notes deleted.';
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

    renderNotes();
  }
};