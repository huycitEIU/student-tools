import { getCurrentUser } from '../firebase/auth.js';
import { loadStoredVocabularyEntries, persistVocabularyEntries } from './vocabularyData.js';

const TARGET_LANGUAGE = 'english';
const TOOL_ID = 'english-vocabulary';
const CLOUD_DIRTY_EVENT = 'student-tools:cloud-dirty';
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const SUGGESTION_DEBOUNCE_MS = 180;

const WORD_TYPE_OPTIONS = [
  { value: '', label: 'Type (optional)' },
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'pronoun', label: 'Pronoun' },
  { value: 'preposition', label: 'Preposition' },
  { value: 'conjunction', label: 'Conjunction' },
  { value: 'interjection', label: 'Interjection' },
  { value: 'particle', label: 'Particle' },
  { value: 'modal-particle', label: 'Modal Particle' },
  { value: 'structural-particle', label: 'Structural Particle' },
  { value: 'aspect-particle', label: 'Aspect Particle' },
  { value: 'auxiliary-verb', label: 'Auxiliary Verb' },
  { value: 'numeral', label: 'Numeral' },
  { value: 'classifier', label: 'Classifier' },
  { value: 'measure-word', label: 'Measure Word' },
  { value: 'idiom', label: 'Idiom' },
  { value: 'phrase', label: 'Phrase' },
  { value: 'set-phrase', label: 'Set Phrase' },
  { value: 'proper-noun', label: 'Proper Noun' },
  { value: 'person-name', label: 'Person Name' },
  { value: 'place-name', label: 'Place Name' },
  { value: 'organization-name', label: 'Organization Name' },
  { value: 'time-word', label: 'Time Word' },
  { value: 'location-word', label: 'Location Word' },
  { value: 'direction-word', label: 'Direction Word' },
  { value: 'onomatopoeia', label: 'Onomatopoeia' },
  { value: 'affix', label: 'Affix' },
  { value: 'abbreviation', label: 'Abbreviation' },
  { value: 'other', label: 'Other' }
];

const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const normalize = (value) => String(value || '').trim();
const normalizeSpaces = (value) => normalize(value).replace(/\s+/g, ' ');

const duplicateKey = (englishWord, vietnamese) => {
  return `${normalizeSpaces(englishWord).toLowerCase()}|${normalizeSpaces(vietnamese).toLowerCase()}`;
};

const makeSearchableText = (entry) => {
  return [entry.englishWord, entry.phonetic, entry.wordType, entry.vietnamese].join(' ').toLowerCase();
};

const extractBestPhonetic = (entry) => {
  if (entry?.phonetic) {
    return normalizeSpaces(entry.phonetic);
  }

  const phoneticFromList = entry?.phonetics?.find((item) => item?.text)?.text;
  return normalizeSpaces(phoneticFromList || '');
};

const fetchPhoneticCandidates = async (word, signal) => {
  const response = await fetch(`${DICTIONARY_API}${encodeURIComponent(word)}`, { signal });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }

    throw new Error(`Dictionary lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return [...new Set(payload.map((entry) => extractBestPhonetic(entry)).filter(Boolean))].slice(0, 6);
};

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

const renderRows = (entries) => {
  if (!entries.length) {
    return `
      <tr>
        <td colspan="4" class="english-vocab-empty">No matching words found.</td>
      </tr>
    `;
  }

  return entries
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.englishWord)}</td>
          <td>${escapeHtml(entry.phonetic)}</td>
          <td>${escapeHtml(entry.wordType)}</td>
          <td>${escapeHtml(entry.vietnamese)}</td>
        </tr>
      `
    )
    .join('');
};

export const englishVocabularyTool = {
  id: TOOL_ID,
  label: 'English Vocabulary',
  render: () => `
    <section class="card english-vocab-card">
      <h2>English Vocabulary</h2>
      <p>Add and search English vocabulary with phonetic notes and Vietnamese meanings.</p>

      <form id="english-vocab-form" class="english-vocab-form">
        <div class="english-word-field">
          <input id="english-word" type="text" maxlength="80" placeholder="English word" autocomplete="off" spellcheck="false" required />
          <div id="english-word-suggestions" class="english-suggestions" hidden></div>
        </div>
        <input id="english-phonetic" type="text" maxlength="80" placeholder="Phonetic / IPA" autocomplete="off" spellcheck="false" />
        <select id="english-type">
          ${WORD_TYPE_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
        </select>
        <input id="english-vietnamese" type="text" maxlength="120" placeholder="Vietnamese" autocomplete="off" required />
        <button id="english-add-btn" class="action-btn primary" type="submit">Add new word</button>
      </form>

      <div id="english-form-feedback" class="english-vocab-feedback" aria-live="polite"></div>

      <div class="english-vocab-search-row">
        <input id="english-search-input" type="text" placeholder="Search by word, phonetic, type, or meaning" autocomplete="off" />
        <select id="english-search-type">
          ${WORD_TYPE_OPTIONS.map((option) => `<option value="${option.value}">${option.value ? `Filter: ${option.label}` : 'Filter: All types'}</option>`).join('')}
        </select>
        <button id="english-search-clear" class="action-btn" type="button">Clear</button>
      </div>

      <div id="english-status" class="notes-status">Add your first word to start building vocabulary.</div>
      <div id="english-count" class="english-vocab-count">Word count: 0</div>

      <div class="english-vocab-table-wrap">
        <table class="data-table english-vocab-table">
          <thead>
            <tr>
              <th>English word</th>
              <th>Phonetic</th>
              <th>Type</th>
              <th>Vietnamese</th>
            </tr>
          </thead>
          <tbody id="english-table-body">
            <tr>
              <td colspan="4" class="english-vocab-empty">No words added yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  mount: (root) => {
    const form = root.querySelector('#english-vocab-form');
    const englishWordInput = root.querySelector('#english-word');
    const englishSuggestions = root.querySelector('#english-word-suggestions');
    const phoneticInput = root.querySelector('#english-phonetic');
    const typeInput = root.querySelector('#english-type');
    const vietnameseInput = root.querySelector('#english-vietnamese');
    const searchInput = root.querySelector('#english-search-input');
    const searchTypeSelect = root.querySelector('#english-search-type');
    const clearSearchBtn = root.querySelector('#english-search-clear');
    const statusBox = root.querySelector('#english-status');
    const formFeedback = root.querySelector('#english-form-feedback');
    const countBox = root.querySelector('#english-count');
    const tableBody = root.querySelector('#english-table-body');
    const addBtn = root.querySelector('#english-add-btn');

    let entries = [];
    let isMounted = true;
    let suggestionItems = [];
    let activeSuggestionIndex = -1;
    let requestSequence = 0;
    let activeRequestController = null;
    let suggestionDebounceTimer = null;
    let lastAutoFilledPhonetic = '';

    const setFormFeedback = (message, level = '') => {
      formFeedback.textContent = message;
      formFeedback.classList.remove('error', 'success', 'warning');
      if (level) {
        formFeedback.classList.add(level);
      }
    };

    const closeSuggestions = () => {
      suggestionItems = [];
      activeSuggestionIndex = -1;
      englishSuggestions.hidden = true;
      englishSuggestions.innerHTML = '';
    };

    const autoFillPhonetic = (force = false) => {
      const currentWord = normalizeSpaces(englishWordInput.value);
      const currentPhonetic = normalizeSpaces(phoneticInput.value);
      const canOverwrite = force || !currentPhonetic || currentPhonetic === lastAutoFilledPhonetic;

      if (!currentWord || !canOverwrite) {
        return;
      }

      const selected = suggestionItems[0];
      if (!selected) {
        return;
      }

      phoneticInput.value = selected;
      lastAutoFilledPhonetic = selected;
    };

    const renderSuggestions = () => {
      if (!suggestionItems.length) {
        closeSuggestions();
        return;
      }

      englishSuggestions.innerHTML = suggestionItems
        .map((item, index) => {
          const isActive = index === activeSuggestionIndex;
          return `
            <button
              type="button"
              class="english-suggestion-item ${isActive ? 'active' : ''}"
              data-index="${index}"
              data-value="${escapeHtml(item)}"
            >${escapeHtml(item)}</button>
          `;
        })
        .join('');
      englishSuggestions.hidden = false;
    };

    const chooseSuggestion = (index) => {
      const selected = suggestionItems[index];
      if (!selected) {
        return;
      }

      phoneticInput.value = selected;
      lastAutoFilledPhonetic = selected;
      setFormFeedback('');
      closeSuggestions();
      englishWordInput.focus();
    };

    const updateSuggestions = async (query) => {
      const normalizedQuery = normalizeSpaces(query).toLowerCase();

      if (!normalizedQuery || normalizedQuery.length < 2 || /[^a-z\s'’-]/i.test(normalizedQuery)) {
        closeSuggestions();
        return;
      }

      requestSequence += 1;
      const sequenceAtCall = requestSequence;

      if (activeRequestController) {
        activeRequestController.abort();
      }

      activeRequestController = new AbortController();

      try {
        const candidates = await fetchPhoneticCandidates(normalizedQuery, activeRequestController.signal);
        if (sequenceAtCall !== requestSequence) {
          return;
        }

        suggestionItems = candidates;
        activeSuggestionIndex = suggestionItems.length ? 0 : -1;
        renderSuggestions();
      } catch {
        closeSuggestions();
      }
    };

    const renderTable = () => {
      const keyword = normalize(searchInput.value).toLowerCase();
      const selectedType = normalize(searchTypeSelect.value).toLowerCase();
      const filteredEntries = entries.filter((entry) => {
        const matchesKeyword = keyword ? makeSearchableText(entry).includes(keyword) : true;
        const matchesType = selectedType ? normalize(entry.wordType).toLowerCase() === selectedType : true;
        return matchesKeyword && matchesType;
      });

      tableBody.innerHTML = renderRows(filteredEntries);
      countBox.textContent = `Total: ${entries.length} | Matching: ${filteredEntries.length}`;

      if (!entries.length) {
        statusBox.textContent = 'Vocabulary list is ready for your first word.';
      } else if (keyword || selectedType) {
        const filterParts = [];
        if (keyword) {
          filterParts.push(`keyword "${keyword}"`);
        }
        if (selectedType) {
          const selectedTypeLabel = WORD_TYPE_OPTIONS.find((option) => option.value === selectedType)?.label || selectedType;
          filterParts.push(`type "${selectedTypeLabel}"`);
        }
        statusBox.textContent = `Search results for ${filterParts.join(' + ')}: ${filteredEntries.length} word(s).`;
      } else {
        statusBox.textContent = `Total words: ${entries.length}.`;
      }
    };

    const loadEntries = async () => {
      try {
        entries = await loadStoredVocabularyEntries(TARGET_LANGUAGE);
      } catch {
        entries = [];
        statusBox.textContent = 'Could not load vocabulary data right now. Please try again later.';
      }

      if (!isMounted) {
        return;
      }

      emitCloudDirty(false);
      renderTable();
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      addBtn.disabled = true;
      setFormFeedback('');

      const englishWord = normalizeSpaces(englishWordInput.value);
      autoFillPhonetic();
      const phonetic = normalizeSpaces(phoneticInput.value);
      const wordType = normalizeSpaces(typeInput.value);
      const vietnamese = normalizeSpaces(vietnameseInput.value);

      if (!englishWord || !vietnamese) {
        setFormFeedback('Please enter both English word and Vietnamese meaning.', 'error');
        addBtn.disabled = false;
        return;
      }

      const entryKey = duplicateKey(englishWord, vietnamese);
      const hasDuplicate = entries.some((entry) => duplicateKey(entry.englishWord, entry.vietnamese) === entryKey);
      if (hasDuplicate) {
        setFormFeedback('This word already exists with the same Vietnamese meaning.', 'error');
        addBtn.disabled = false;
        return;
      }

      const now = Date.now();
      const newEntry = {
        id: `${now}-${Math.random().toString(16).slice(2)}`,
        englishWord,
        phonetic,
        wordType,
        vietnamese,
        createdAt: now,
        updatedAt: now
      };

      entries = [newEntry, ...entries];

      try {
        await persistVocabularyEntries(TARGET_LANGUAGE, entries);
        emitCloudDirty(false);
      } catch {
        statusBox.textContent = 'Could not sync to cloud right now. Saved locally, please try again later.';
        if (getCurrentUser()) {
          emitCloudDirty(true);
        }
      }

      form.reset();
      closeSuggestions();
      lastAutoFilledPhonetic = '';
      englishWordInput.focus();
      setFormFeedback(`Added "${englishWord}" successfully.`, 'success');
      renderTable();
      addBtn.disabled = false;
    });

    searchInput.addEventListener('input', renderTable);

    searchTypeSelect.addEventListener('change', renderTable);

    englishWordInput.addEventListener('input', () => {
      const value = englishWordInput.value;
      if (suggestionDebounceTimer) {
        clearTimeout(suggestionDebounceTimer);
      }

      suggestionDebounceTimer = setTimeout(() => {
        updateSuggestions(value);
      }, SUGGESTION_DEBOUNCE_MS);
    });

    englishWordInput.addEventListener('keydown', (event) => {
      if (englishSuggestions.hidden || !suggestionItems.length) {
        if (event.key === 'Enter') {
          autoFillPhonetic();
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionItems.length;
        renderSuggestions();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestionItems.length) % suggestionItems.length;
        renderSuggestions();
        return;
      }

      if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
        event.preventDefault();
        chooseSuggestion(activeSuggestionIndex);
        return;
      }

      if (event.key === 'Escape') {
        closeSuggestions();
      }
    });

    englishWordInput.addEventListener('blur', () => {
      setTimeout(() => {
        closeSuggestions();
      }, 120);
      autoFillPhonetic();
    });

    englishSuggestions.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    englishSuggestions.addEventListener('click', (event) => {
      const button = event.target.closest('.english-suggestion-item');
      if (!button) {
        return;
      }

      chooseSuggestion(Number(button.dataset.index));
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchTypeSelect.value = '';
      renderTable();
      searchInput.focus();
    });

    loadEntries();

    return () => {
      isMounted = false;
      if (suggestionDebounceTimer) {
        clearTimeout(suggestionDebounceTimer);
      }
      if (activeRequestController) {
        activeRequestController.abort();
      }
    };
  }
};
