import { pinyin as toPinyin } from 'pinyin-pro';
import { getCurrentUser } from '../firebase/auth.js';
import { loadStoredVocabularyEntries, persistVocabularyEntries } from './vocabularyData.js';

const PINYIN_SUGGESTION_API = 'https://inputtools.google.com/request?itc=zh-t-i0-pinyin&num=8&cp=0&cs=1&ie=utf-8&oe=utf-8&app=student-tools&text=';
const SUGGESTION_DEBOUNCE_MS = 180;
const FIELD_LIMITS = {
  chineseWord: 64,
  pinyin: 80,
  sinoVietnamese: 80,
  vietnamese: 120
};

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

const hasHanCharacter = (value) => /[\u3400-\u9fff]/.test(value);

const looksLikePinyin = (value) => {
  if (!value) {
    return true;
  }

  return /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF0-5\s'’-]+$/.test(value);
};

const looksLikeLatinPinyinInput = (value) => {
  if (!value) {
    return false;
  }

  return /^[A-Za-z0-5\s'’-]+$/.test(value);
};

const duplicateKey = (chineseWord, vietnamese) => {
  return `${normalizeSpaces(chineseWord).toLowerCase()}|${normalizeSpaces(vietnamese).toLowerCase()}`;
};

const makeSearchableText = (entry) => {
  return [
    entry.chineseWord,
    entry.pinyin,
    entry.wordType,
    entry.sinoVietnamese,
    entry.vietnamese
  ]
    .join(' ')
    .toLowerCase();
};

const TARGET_LANGUAGE = 'chinese';
const TOOL_ID = 'chinese-vocabulary';
const CLOUD_DIRTY_EVENT = 'student-tools:cloud-dirty';

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

const parseGooglePinyinCandidates = (payload) => {
  if (!Array.isArray(payload) || payload[0] !== 'SUCCESS') {
    return [];
  }

  const segments = payload[1];
  const firstSegment = Array.isArray(segments) ? segments[0] : null;
  const candidates = Array.isArray(firstSegment) ? firstSegment[1] : null;
  if (!Array.isArray(candidates)) {
    return [];
  }

  return [...new Set(candidates.map((item) => normalizeSpaces(item)).filter(Boolean))].slice(0, 8);
};

const requestPinyinCandidates = async (query, signal) => {
  const response = await fetch(`${PINYIN_SUGGESTION_API}${encodeURIComponent(query)}`, {
    signal
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return parseGooglePinyinCandidates(payload);
};

const renderRows = (entries) => {
  if (!entries.length) {
    return `
      <tr>
        <td colspan="5" class="chinese-vocab-empty">No matching words found.</td>
      </tr>
    `;
  }

  return entries
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.chineseWord)}</td>
          <td>${escapeHtml(entry.pinyin)}</td>
          <td>${escapeHtml(entry.wordType)}</td>
          <td>${escapeHtml(entry.sinoVietnamese)}</td>
          <td>${escapeHtml(entry.vietnamese)}</td>
        </tr>
      `
    )
    .join('');
};

export const chineseVocabularyTool = {
  id: 'chinese-vocabulary',
  label: 'Chinese Vocabulary',
  render: () => `
    <section class="card chinese-vocab-card">
      <h2>Chinese Vocabulary</h2>
      <p>Add and search Chinese vocabulary with pinyin and Vietnamese meanings.</p>

      <form id="chinese-vocab-form" class="chinese-vocab-form">
        <div class="chinese-word-field">
          <input id="vocab-chinese-word" type="text" maxlength="${FIELD_LIMITS.chineseWord}" placeholder="Chinese word (or type pinyin)" autocomplete="off" required />
          <div id="vocab-chinese-suggestions" class="chinese-suggestions" hidden></div>
        </div>
        <input id="vocab-pinyin" type="text" maxlength="${FIELD_LIMITS.pinyin}" placeholder="Pinyin" />
        <select id="vocab-type">
          ${WORD_TYPE_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
        </select>
        <input id="vocab-sino-vietnamese" type="text" maxlength="${FIELD_LIMITS.sinoVietnamese}" placeholder="Sino-Vietnamese" />
        <input id="vocab-vietnamese" type="text" maxlength="${FIELD_LIMITS.vietnamese}" placeholder="Vietnamese" required />
        <button id="vocab-add-btn" class="action-btn primary" type="submit">Add new word</button>
      </form>
      <div id="vocab-form-feedback" class="chinese-vocab-feedback" aria-live="polite"></div>

      <div class="chinese-vocab-search-row">
        <div class="chinese-search-field">
          <input id="vocab-search-input" type="text" placeholder="Search by word, pinyin, or meaning" autocomplete="off" />
          <div id="vocab-search-suggestions" class="chinese-suggestions" hidden></div>
        </div>
        <select id="vocab-search-type">
          ${WORD_TYPE_OPTIONS.map((option) => `<option value="${option.value}">${option.value ? `Filter: ${option.label}` : 'Filter: All types'}</option>`).join('')}
        </select>
        <button id="vocab-search-clear" class="action-btn" type="button">Clear</button>
      </div>

      <div id="vocab-status" class="notes-status">Add your first word to start building vocabulary.</div>
      <div id="vocab-count" class="chinese-vocab-count">Word count: 0</div>

      <div class="chinese-vocab-table-wrap">
        <table class="data-table chinese-vocab-table">
          <thead>
            <tr>
              <th>Chinese word</th>
              <th>Pinyin</th>
              <th>Type</th>
              <th>Sino-Vietnamese</th>
              <th>Vietnamese</th>
            </tr>
          </thead>
          <tbody id="vocab-table-body">
            <tr>
              <td colspan="5" class="chinese-vocab-empty">No words added yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  mount: (root) => {
    const form = root.querySelector('#chinese-vocab-form');
    const chineseWordInput = root.querySelector('#vocab-chinese-word');
    const pinyinInput = root.querySelector('#vocab-pinyin');
    const typeInput = root.querySelector('#vocab-type');
    const sinoVietnameseInput = root.querySelector('#vocab-sino-vietnamese');
    const vietnameseInput = root.querySelector('#vocab-vietnamese');
    const searchInput = root.querySelector('#vocab-search-input');
    const searchTypeSelect = root.querySelector('#vocab-search-type');
    const searchSuggestions = root.querySelector('#vocab-search-suggestions');
    const clearSearchBtn = root.querySelector('#vocab-search-clear');
    const addBtn = root.querySelector('#vocab-add-btn');
    const statusBox = root.querySelector('#vocab-status');
    const formFeedback = root.querySelector('#vocab-form-feedback');
    const chineseSuggestions = root.querySelector('#vocab-chinese-suggestions');
    const countBox = root.querySelector('#vocab-count');
    const tableBody = root.querySelector('#vocab-table-body');

    let entries = [];
    let isMounted = true;
    let suggestionItems = [];
    let activeSuggestionIndex = -1;
    let lastPinyinQuery = '';
    let debounceTimer = null;
    let requestSequence = 0;
    let activeRequestController = null;
    let lastAutoFilledPinyin = '';
    let searchSuggestionItems = [];
    let activeSearchSuggestionIndex = -1;
    let searchDebounceTimer = null;
    let searchRequestSequence = 0;
    let searchRequestController = null;

    const setFormFeedback = (message, level = '') => {
      formFeedback.textContent = message;
      formFeedback.classList.remove('error', 'success', 'warning');
      if (level) {
        formFeedback.classList.add(level);
      }
    };

    const clearFieldErrors = () => {
      [chineseWordInput, pinyinInput, vietnameseInput].forEach((input) => {
        input.classList.remove('input-error');
      });
    };

    const closeSuggestions = () => {
      suggestionItems = [];
      activeSuggestionIndex = -1;
      chineseSuggestions.hidden = true;
      chineseSuggestions.innerHTML = '';
    };

    const closeSearchSuggestions = () => {
      searchSuggestionItems = [];
      activeSearchSuggestionIndex = -1;
      searchSuggestions.hidden = true;
      searchSuggestions.innerHTML = '';
    };

    const autoFillPinyinFromChinese = (force = false) => {
      const chineseWord = normalizeSpaces(chineseWordInput.value);
      if (!hasHanCharacter(chineseWord)) {
        return;
      }

      const currentPinyin = normalizeSpaces(pinyinInput.value);
      const canOverwrite = force || !currentPinyin || currentPinyin === lastAutoFilledPinyin;
      if (!canOverwrite) {
        return;
      }

      try {
        const generatedPinyin = normalizeSpaces(toPinyin(chineseWord, { toneType: 'symbol' }));
        if (!generatedPinyin) {
          return;
        }

        pinyinInput.value = generatedPinyin;
        lastAutoFilledPinyin = generatedPinyin;
      } catch {
        // Ignore auto-fill failures and keep user input flow uninterrupted.
      }
    };

    const renderSuggestions = () => {
      if (!suggestionItems.length) {
        closeSuggestions();
        return;
      }

      chineseSuggestions.innerHTML = suggestionItems
        .map((item, index) => {
          const isActive = index === activeSuggestionIndex;
          return `
            <button
              type="button"
              class="chinese-suggestion-item ${isActive ? 'active' : ''}"
              data-index="${index}"
              data-value="${escapeHtml(item)}"
            >${escapeHtml(item)}</button>
          `;
        })
        .join('');
      chineseSuggestions.hidden = false;
    };

    const chooseSuggestion = (index) => {
      const selected = suggestionItems[index];
      if (!selected) {
        return;
      }

      chineseWordInput.value = selected;
      autoFillPinyinFromChinese(true);
      if (!normalizeSpaces(pinyinInput.value) && lastPinyinQuery) {
        pinyinInput.value = lastPinyinQuery;
        lastAutoFilledPinyin = lastPinyinQuery;
      }
      clearFieldErrors();
      setFormFeedback('');
      closeSuggestions();
      chineseWordInput.focus();
    };

    const updateSuggestions = async (query) => {
      const normalizedQuery = normalizeSpaces(query).toLowerCase();
      lastPinyinQuery = normalizedQuery;

      if (
        !normalizedQuery ||
        normalizedQuery.length < 2 ||
        hasHanCharacter(normalizedQuery) ||
        !looksLikeLatinPinyinInput(normalizedQuery)
      ) {
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
        const candidates = await requestPinyinCandidates(normalizedQuery, activeRequestController.signal);
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

    const renderSearchSuggestions = () => {
      if (!searchSuggestionItems.length) {
        closeSearchSuggestions();
        return;
      }

      searchSuggestions.innerHTML = searchSuggestionItems
        .map((item, index) => {
          const isActive = index === activeSearchSuggestionIndex;
          return `
            <button
              type="button"
              class="chinese-suggestion-item ${isActive ? 'active' : ''}"
              data-search-index="${index}"
            >${escapeHtml(item)}</button>
          `;
        })
        .join('');
      searchSuggestions.hidden = false;
    };

    const chooseSearchSuggestion = (index) => {
      const selected = searchSuggestionItems[index];
      if (!selected) {
        return;
      }

      searchInput.value = selected;
      closeSearchSuggestions();
      renderTable();
      searchInput.focus();
    };

    const updateSearchSuggestions = async (query) => {
      const normalizedQuery = normalizeSpaces(query).toLowerCase();
      if (
        !normalizedQuery ||
        normalizedQuery.length < 2 ||
        hasHanCharacter(normalizedQuery) ||
        !looksLikeLatinPinyinInput(normalizedQuery)
      ) {
        closeSearchSuggestions();
        return;
      }

      searchRequestSequence += 1;
      const sequenceAtCall = searchRequestSequence;

      if (searchRequestController) {
        searchRequestController.abort();
      }

      searchRequestController = new AbortController();

      try {
        const candidates = await requestPinyinCandidates(normalizedQuery, searchRequestController.signal);
        if (sequenceAtCall !== searchRequestSequence) {
          return;
        }

        searchSuggestionItems = candidates;
        activeSearchSuggestionIndex = searchSuggestionItems.length ? 0 : -1;
        renderSearchSuggestions();
      } catch {
        closeSearchSuggestions();
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

    const applyEntries = async () => {
      entries = await loadStoredVocabularyEntries(TARGET_LANGUAGE);
      if (!isMounted) {
        return;
      }
      emitCloudDirty(false);
      renderTable();
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      addBtn.disabled = true;
      clearFieldErrors();

      const chineseWord = normalizeSpaces(chineseWordInput.value);
      autoFillPinyinFromChinese();
      const pinyin = normalizeSpaces(pinyinInput.value);
      const wordType = normalizeSpaces(typeInput.value);
      const sinoVietnamese = normalizeSpaces(sinoVietnameseInput.value);
      const vietnamese = normalizeSpaces(vietnameseInput.value);

      if (!chineseWord || !vietnamese) {
        setFormFeedback('Please enter both Chinese word and Vietnamese meaning.', 'error');
        if (!chineseWord) {
          chineseWordInput.classList.add('input-error');
        }
        if (!vietnamese) {
          vietnameseInput.classList.add('input-error');
        }
        addBtn.disabled = false;
        return;
      }

      if (!hasHanCharacter(chineseWord)) {
        chineseWordInput.classList.add('input-error');
        setFormFeedback('Chinese word should contain at least one Han character. Type pinyin and choose a suggestion if needed.', 'error');
        addBtn.disabled = false;
        return;
      }

      if (!looksLikePinyin(pinyin)) {
        pinyinInput.classList.add('input-error');
        setFormFeedback('Pinyin format looks unusual. Use Latin letters, tone marks or tone numbers (1-5).', 'warning');
        addBtn.disabled = false;
        return;
      }

      const entryKey = duplicateKey(chineseWord, vietnamese);
      const hasDuplicate = entries.some((entry) => duplicateKey(entry.chineseWord, entry.vietnamese) === entryKey);
      if (hasDuplicate) {
        setFormFeedback('This word already exists with the same Vietnamese meaning.', 'error');
        addBtn.disabled = false;
        return;
      }

      const now = Date.now();
      const newEntry = {
        id: `${now}-${Math.random().toString(16).slice(2)}`,
        chineseWord,
        pinyin,
        wordType,
        sinoVietnamese,
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
      lastAutoFilledPinyin = '';
      chineseWordInput.focus();
      setFormFeedback(`Added "${chineseWord}" successfully.`, 'success');
      renderTable();
      addBtn.disabled = false;
    });

    chineseWordInput.addEventListener('input', () => {
      const value = chineseWordInput.value;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        updateSuggestions(value);
      }, SUGGESTION_DEBOUNCE_MS);
    });

    chineseWordInput.addEventListener('keydown', (event) => {
      if (chineseSuggestions.hidden || !suggestionItems.length) {
        if (event.key === 'Enter') {
          autoFillPinyinFromChinese();
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

    chineseWordInput.addEventListener('blur', () => {
      setTimeout(() => {
        closeSuggestions();
      }, 120);
      autoFillPinyinFromChinese();
    });

    chineseSuggestions.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    chineseSuggestions.addEventListener('click', (event) => {
      const button = event.target.closest('.chinese-suggestion-item');
      if (!button) {
        return;
      }

      const index = Number(button.dataset.index);
      chooseSuggestion(index);
    });

    searchInput.addEventListener('input', () => {
      renderTable();

      const value = searchInput.value;
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      searchDebounceTimer = setTimeout(() => {
        updateSearchSuggestions(value);
      }, SUGGESTION_DEBOUNCE_MS);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (searchSuggestions.hidden || !searchSuggestionItems.length) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeSearchSuggestionIndex = (activeSearchSuggestionIndex + 1) % searchSuggestionItems.length;
        renderSearchSuggestions();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeSearchSuggestionIndex = (activeSearchSuggestionIndex - 1 + searchSuggestionItems.length) % searchSuggestionItems.length;
        renderSearchSuggestions();
        return;
      }

      if (event.key === 'Enter' && activeSearchSuggestionIndex >= 0) {
        event.preventDefault();
        chooseSearchSuggestion(activeSearchSuggestionIndex);
        return;
      }

      if (event.key === 'Escape') {
        closeSearchSuggestions();
      }
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        closeSearchSuggestions();
      }, 120);
    });

    searchSuggestions.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    searchSuggestions.addEventListener('click', (event) => {
      const button = event.target.closest('[data-search-index]');
      if (!button) {
        return;
      }

      const index = Number(button.dataset.searchIndex);
      chooseSearchSuggestion(index);
    });

    searchTypeSelect.addEventListener('change', () => {
      renderTable();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchTypeSelect.value = '';
      closeSearchSuggestions();
      renderTable();
      searchInput.focus();
    });

    applyEntries();

    return () => {
      isMounted = false;
    };
  }
};
