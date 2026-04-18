import { loadStoredVocabularyEntries } from './vocabularyData.js';

const WORD_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
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

const LANGUAGE_CONFIGS = {
  chinese: {
    value: 'chinese',
    label: 'Chinese',
    vocabularyLabel: 'Chinese Vocabulary',
    wordField: 'chineseWord',
    wordLabel: 'Chinese word',
    pronunciationField: 'pinyin',
    pronunciationLabel: 'Pinyin',
    meaningField: 'vietnamese',
    meaningLabel: 'Vietnamese meaning'
  },
  english: {
    value: 'english',
    label: 'English',
    vocabularyLabel: 'English Vocabulary',
    wordField: 'englishWord',
    wordLabel: 'English word',
    pronunciationField: 'phonetic',
    pronunciationLabel: 'Phonetic',
    meaningField: 'vietnamese',
    meaningLabel: 'Vietnamese meaning'
  }
};

const MULTIPLE_CHOICE_BLUEPRINTS = [
  {
    value: 'word-meaning',
    label: 'Word -> Meaning',
    promptLabel: (config) => config.wordLabel,
    answerLabel: (config) => config.meaningLabel,
    promptValue: (entry, config) => entry[config.wordField],
    answerValue: (entry, config) => entry[config.meaningField],
    requires: (entry, config) => Boolean(entry[config.wordField] && entry[config.meaningField])
  },
  {
    value: 'meaning-word',
    label: 'Meaning -> Word',
    promptLabel: (config) => config.meaningLabel,
    answerLabel: (config) => config.wordLabel,
    promptValue: (entry, config) => entry[config.meaningField],
    answerValue: (entry, config) => entry[config.wordField],
    requires: (entry, config) => Boolean(entry[config.wordField] && entry[config.meaningField])
  },
  {
    value: 'pronunciation-word',
    label: (config) => `${config.pronunciationLabel} -> Word`,
    promptLabel: (config) => config.pronunciationLabel,
    answerLabel: (config) => config.wordLabel,
    promptValue: (entry, config) => entry[config.pronunciationField],
    answerValue: (entry, config) => entry[config.wordField],
    requires: (entry, config) => Boolean(entry[config.pronunciationField] && entry[config.wordField])
  },
  {
    value: 'word-type',
    label: 'Word -> Type',
    promptLabel: (config) => config.wordLabel,
    answerLabel: () => 'Type',
    promptValue: (entry, config) => entry[config.wordField],
    answerValue: (entry) => entry.wordType,
    requires: (entry, config) => Boolean(entry[config.wordField] && entry.wordType)
  }
];

const normalize = (value) => String(value || '').trim().toLowerCase();
const normalizeSpaces = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const shuffleArray = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const pickRandom = (items) => {
  if (!items.length) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
};

const pickUniqueOptions = (correctValue, pool, maxChoices = 4) => {
  const normalizedCorrect = normalizeSpaces(correctValue);
  const uniquePool = [...new Set(pool.map((item) => normalizeSpaces(item)).filter(Boolean))].filter(
    (item) => normalizeSpaces(item) !== normalizedCorrect
  );

  const shuffled = shuffleArray(uniquePool);
  const distractors = shuffled.slice(0, Math.max(0, maxChoices - 1));
  return shuffleArray([normalizedCorrect, ...distractors]);
};

const getLanguageConfig = (language = 'chinese') => {
  return LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.chinese;
};

const getQuestionDirections = (config) => {
  return MULTIPLE_CHOICE_BLUEPRINTS.map((blueprint) => ({
    value: blueprint.value,
    label: typeof blueprint.label === 'function' ? blueprint.label(config) : blueprint.label,
    promptLabel: blueprint.promptLabel(config),
    answerLabel: blueprint.answerLabel(config),
    promptValue: (entry) => blueprint.promptValue(entry, config),
    answerValue: (entry) => blueprint.answerValue(entry, config),
    requires: (entry) => blueprint.requires(entry, config)
  }));
};

export const practiceTool = {
  id: 'practice',
  label: 'Practice',
  render: () => `
    <section class="card practice-card">
      <h2>Practice</h2>
      <p>Practice with flashcards and multiple-choice using Chinese or English vocabulary.</p>

      <div class="practice-toolbar">
        <select id="practice-language" class="practice-select">
          <option value="chinese">Language: Chinese</option>
          <option value="english">Language: English</option>
        </select>
        <select id="practice-mode" class="practice-select">
          <option value="flashcard">Mode: Flashcard</option>
          <option value="multiple-choice">Mode: Multiple Choice</option>
        </select>
        <select id="practice-mcq-direction" class="practice-select"></select>
        <select id="practice-type-filter" class="practice-select">
          ${WORD_TYPE_OPTIONS.map((option) => `<option value="${option.value}">Type: ${option.label}</option>`).join('')}
        </select>
        <button id="practice-refresh-btn" class="action-btn" type="button">Refresh</button>
        <button id="practice-summary-btn" class="action-btn" type="button">Summary</button>
        <button id="practice-help-btn" class="action-btn" type="button">Help</button>
      </div>

      <div id="practice-alert" class="practice-alert" hidden></div>
      <div id="practice-status" class="notes-status">Loading vocabulary...</div>
      <div id="practice-content" class="practice-content"></div>
      <div class="practice-hint">Future-ready: this tool supports Flashcard and Multiple Choice, and can be expanded with typing and listening modes.</div>

      <div id="practice-modal" class="practice-modal-backdrop" hidden>
        <section class="practice-modal-card" role="dialog" aria-modal="true" aria-labelledby="practice-modal-title">
          <div class="practice-modal-header">
            <h3 id="practice-modal-title"></h3>
            <button id="practice-modal-close" class="practice-modal-close" type="button" aria-label="Close">x</button>
          </div>
          <div id="practice-modal-body" class="practice-modal-body"></div>
        </section>
      </div>
    </section>
  `,
  mount: (root) => {
    const languageSelect = root.querySelector('#practice-language');
    const modeSelect = root.querySelector('#practice-mode');
    const mcqDirectionSelect = root.querySelector('#practice-mcq-direction');
    const typeFilterSelect = root.querySelector('#practice-type-filter');
    const refreshBtn = root.querySelector('#practice-refresh-btn');
    const summaryBtn = root.querySelector('#practice-summary-btn');
    const helpBtn = root.querySelector('#practice-help-btn');
    const alertBox = root.querySelector('#practice-alert');
    const statusBox = root.querySelector('#practice-status');
    const contentBox = root.querySelector('#practice-content');
    const modal = root.querySelector('#practice-modal');
    const modalTitle = root.querySelector('#practice-modal-title');
    const modalBody = root.querySelector('#practice-modal-body');
    const modalCloseBtn = root.querySelector('#practice-modal-close');

    let entries = [];
    let filtered = [];
    let cardIndex = 0;
    let isFlipped = false;
    let currentQuestion = null;
    let mcqSelectedAnswer = null;
    let mcqCorrectCount = 0;
    let mcqAttemptCount = 0;
    let isMounted = true;

    const setAlert = (message = '', level = '') => {
      if (!message) {
        alertBox.hidden = true;
        alertBox.textContent = '';
        alertBox.classList.remove('info', 'warning', 'success');
        return;
      }

      alertBox.hidden = false;
      alertBox.textContent = message;
      alertBox.classList.remove('info', 'warning', 'success');
      alertBox.classList.add(level || 'info');
    };

    const openModal = ({ title, bodyHtml }) => {
      modalTitle.textContent = title;
      modalBody.innerHTML = bodyHtml;
      modal.hidden = false;
    };

    const closeModal = () => {
      modal.hidden = true;
      modalBody.innerHTML = '';
    };

    const onDocumentKeydown = (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    };

    const getCurrentConfig = () => getLanguageConfig(languageSelect.value);

    const getFilteredEntries = () => {
      const selectedType = normalize(typeFilterSelect.value);
      if (!selectedType) {
        return entries;
      }

      return entries.filter((entry) => normalize(entry.wordType) === selectedType);
    };

    const getCurrentCard = () => filtered[cardIndex] || null;

    const getDirections = () => getQuestionDirections(getCurrentConfig());

    const getSelectedDirection = () => {
      const directions = getDirections();
      return directions.find((item) => item.value === mcqDirectionSelect.value) || directions[0];
    };

    const syncDirectionOptions = () => {
      const directions = getDirections();
      mcqDirectionSelect.innerHTML = directions.map((direction) => `<option value="${direction.value}">Quiz: ${direction.label}</option>`).join('');
    };

    const buildMultipleChoiceQuestion = () => {
      const config = getCurrentConfig();
      const direction = getSelectedDirection();
      const candidates = filtered.filter((entry) => direction.requires(entry));

      if (!candidates.length) {
        return null;
      }

      const chosenEntry = pickRandom(candidates);
      const correctAnswer = normalizeSpaces(direction.answerValue(chosenEntry));
      const prompt = normalizeSpaces(direction.promptValue(chosenEntry));

      if (!prompt || !correctAnswer) {
        return null;
      }

      const pool = candidates.map((entry) => normalizeSpaces(direction.answerValue(entry))).filter(Boolean);
      const options = pickUniqueOptions(correctAnswer, pool, 4);

      return {
        config,
        direction,
        prompt,
        correctAnswer,
        options,
        totalCandidates: candidates.length
      };
    };

    const renderFlashcard = () => {
      const config = getCurrentConfig();
      filtered = getFilteredEntries();

      if (!filtered.length) {
        setAlert(`No ${config.vocabularyLabel.toLowerCase()} matches the selected type filter.`, 'warning');
        contentBox.innerHTML = `
          <div class="practice-empty">
            <p>No vocabulary matches the selected filter.</p>
            <p>Add words in ${config.vocabularyLabel} first, then click Refresh.</p>
          </div>
        `;
        statusBox.textContent = `Loaded ${entries.length} item(s). Matching: 0.`;
        return;
      }

      setAlert('Flashcard mode is active. Click the card to flip it.', 'info');

      if (cardIndex >= filtered.length) {
        cardIndex = 0;
      }

      const card = getCurrentCard();
      const progress = `${cardIndex + 1} / ${filtered.length}`;

      contentBox.innerHTML = `
        <div class="practice-flashcard-shell">
          <button id="practice-flip-card" class="practice-flashcard ${isFlipped ? 'flipped' : ''}" type="button" aria-label="Flip flashcard">
            <div class="practice-flashcard-face practice-front">
              <p class="practice-face-label">Front</p>
              <p class="practice-front-word">${card?.[config.wordField] || '-'}</p>
              <p class="practice-tip">Click to flip</p>
            </div>
            <div class="practice-flashcard-face practice-back">
              <p class="practice-face-label">Back</p>
              <p><strong>${config.pronunciationLabel}:</strong> ${card?.[config.pronunciationField] || '-'}</p>
              <p><strong>${config.meaningLabel}:</strong> ${card?.[config.meaningField] || '-'}</p>
              <p><strong>Type:</strong> ${card?.wordType || '-'}</p>
            </div>
          </button>

          <div class="practice-controls">
            <button id="practice-prev" class="action-btn" type="button">Previous</button>
            <span class="practice-progress">${progress}</span>
            <button id="practice-next" class="action-btn" type="button">Next</button>
            <button id="practice-shuffle" class="action-btn" type="button">Shuffle</button>
          </div>
        </div>
      `;

      statusBox.textContent = `Loaded ${entries.length} item(s). Matching: ${filtered.length}.`;
    };

    const renderMultipleChoice = () => {
      const config = getCurrentConfig();
      filtered = getFilteredEntries();

      if (!filtered.length) {
        setAlert(`No ${config.vocabularyLabel.toLowerCase()} matches the selected type filter.`, 'warning');
        contentBox.innerHTML = `
          <div class="practice-empty">
            <p>No vocabulary matches the selected filter.</p>
            <p>Add words in ${config.vocabularyLabel} first, then click Refresh.</p>
          </div>
        `;
        statusBox.textContent = `Loaded ${entries.length} item(s). Matching: 0.`;
        return;
      }

      if (!currentQuestion) {
        currentQuestion = buildMultipleChoiceQuestion();
        mcqSelectedAnswer = null;
      }

      if (!currentQuestion) {
        setAlert('Selected quiz direction needs more complete data.', 'warning');
        contentBox.innerHTML = `
          <div class="practice-empty">
            <p>Not enough data for this quiz direction.</p>
            <p>Try another quiz direction or add more vocabulary entries.</p>
          </div>
        `;
        statusBox.textContent = `Loaded ${entries.length} item(s). Matching: ${filtered.length}.`;
        return;
      }

      setAlert('Multiple Choice mode is active. Pick one answer then move to next question.', 'info');

      const isAnswered = mcqSelectedAnswer !== null;
      const isCorrect = isAnswered && normalizeSpaces(mcqSelectedAnswer) === normalizeSpaces(currentQuestion.correctAnswer);
      const scoreText = `Score: ${mcqCorrectCount}/${mcqAttemptCount}`;

      contentBox.innerHTML = `
        <div class="practice-mcq-shell">
          <div class="practice-mcq-question">
            <p class="practice-face-label">${currentQuestion.direction.promptLabel}</p>
            <p class="practice-mcq-prompt">${currentQuestion.prompt}</p>
            <p class="practice-tip">Choose the correct ${currentQuestion.direction.answerLabel.toLowerCase()}.</p>
          </div>

          <div class="practice-mcq-options">
            ${currentQuestion.options
              .map((option, index) => {
                const isThisSelected = isAnswered && normalizeSpaces(mcqSelectedAnswer) === normalizeSpaces(option);
                const isThisCorrect = normalizeSpaces(currentQuestion.correctAnswer) === normalizeSpaces(option);
                const optionClass = [
                  'practice-mcq-option',
                  isThisSelected ? 'selected' : '',
                  isAnswered && isThisCorrect ? 'correct' : '',
                  isAnswered && isThisSelected && !isThisCorrect ? 'wrong' : ''
                ]
                  .filter(Boolean)
                  .join(' ');

                return `<button type="button" class="${optionClass}" data-mcq-option="${index}">${option || '-'}</button>`;
              })
              .join('')}
          </div>

          <div class="practice-controls">
            <button id="practice-mcq-next" class="action-btn primary" type="button">Next Question</button>
            <span class="practice-progress">${scoreText}</span>
            ${
              isAnswered
                ? `<span class="practice-mcq-result ${isCorrect ? 'correct' : 'wrong'}">${
                    isCorrect ? 'Correct' : `Wrong - correct answer: ${currentQuestion.correctAnswer}`
                  }</span>`
                : ''
            }
          </div>
        </div>
      `;

      statusBox.textContent = `Loaded ${entries.length} item(s). Matching: ${filtered.length}. Candidates: ${currentQuestion.totalCandidates}.`;
    };

    const resetMultipleChoiceRound = () => {
      currentQuestion = null;
      mcqSelectedAnswer = null;
    };

    const renderMode = () => {
      syncDirectionOptions();

      if (modeSelect.value === 'flashcard') {
        mcqDirectionSelect.disabled = true;
        renderFlashcard();
        return;
      }

      if (modeSelect.value === 'multiple-choice') {
        mcqDirectionSelect.disabled = false;
        renderMultipleChoice();
        return;
      }

      contentBox.innerHTML = '<div class="practice-empty"><p>This mode is not available yet.</p></div>';
    };

    const loadEntries = async () => {
      const config = getCurrentConfig();
      statusBox.textContent = `Loading ${config.vocabularyLabel.toLowerCase()}...`;
      setAlert(`Syncing ${config.vocabularyLabel.toLowerCase()} data...`, 'info');

      try {
        entries = await loadStoredVocabularyEntries(languageSelect.value);
      } catch {
        entries = [];
        setAlert(`Could not load ${config.vocabularyLabel.toLowerCase()} data right now.`, 'warning');
      }

      if (!isMounted) {
        return;
      }

      cardIndex = 0;
      isFlipped = false;
      resetMultipleChoiceRound();
      mcqCorrectCount = 0;
      mcqAttemptCount = 0;
      renderMode();
    };

    contentBox.addEventListener('click', (event) => {
      const flipBtn = event.target.closest('#practice-flip-card');
      if (flipBtn) {
        isFlipped = !isFlipped;
        renderMode();
        return;
      }

      const prevBtn = event.target.closest('#practice-prev');
      if (prevBtn && filtered.length > 0) {
        cardIndex = (cardIndex - 1 + filtered.length) % filtered.length;
        isFlipped = false;
        renderMode();
        return;
      }

      const nextBtn = event.target.closest('#practice-next');
      if (nextBtn && filtered.length > 0) {
        cardIndex = (cardIndex + 1) % filtered.length;
        isFlipped = false;
        renderMode();
        return;
      }

      const shuffleBtn = event.target.closest('#practice-shuffle');
      if (shuffleBtn && entries.length > 1) {
        entries = shuffleArray(entries);
        cardIndex = 0;
        isFlipped = false;
        renderMode();
        return;
      }

      const optionBtn = event.target.closest('[data-mcq-option]');
      if (optionBtn && currentQuestion && mcqSelectedAnswer === null) {
        const index = Number(optionBtn.dataset.mcqOption);
        const selectedOption = currentQuestion.options[index];
        if (!selectedOption) {
          return;
        }

        mcqSelectedAnswer = selectedOption;
        mcqAttemptCount += 1;
        if (normalizeSpaces(selectedOption) === normalizeSpaces(currentQuestion.correctAnswer)) {
          mcqCorrectCount += 1;
        }
        renderMode();
        return;
      }

      const nextQuestionBtn = event.target.closest('#practice-mcq-next');
      if (nextQuestionBtn) {
        resetMultipleChoiceRound();
        renderMode();
      }
    });

    typeFilterSelect.addEventListener('change', () => {
      cardIndex = 0;
      isFlipped = false;
      resetMultipleChoiceRound();
      renderMode();
    });

    modeSelect.addEventListener('change', () => {
      cardIndex = 0;
      isFlipped = false;
      resetMultipleChoiceRound();
      renderMode();
    });

    languageSelect.addEventListener('change', () => {
      cardIndex = 0;
      isFlipped = false;
      resetMultipleChoiceRound();
      loadEntries();
    });

    mcqDirectionSelect.addEventListener('change', () => {
      resetMultipleChoiceRound();
      renderMode();
    });

    refreshBtn.addEventListener('click', () => {
      loadEntries();
    });

    summaryBtn.addEventListener('click', () => {
      const config = getCurrentConfig();
      const accuracy = mcqAttemptCount ? `${Math.round((mcqCorrectCount / mcqAttemptCount) * 100)}%` : '0%';
      openModal({
        title: 'Practice Summary',
        bodyHtml: `
          <p><strong>Language:</strong> ${config.label}</p>
          <p><strong>Mode:</strong> ${modeSelect.value === 'multiple-choice' ? 'Multiple Choice' : 'Flashcard'}</p>
          <p><strong>Total loaded:</strong> ${entries.length}</p>
          <p><strong>Matching filter:</strong> ${filtered.length}</p>
          <p><strong>MCQ score:</strong> ${mcqCorrectCount}/${mcqAttemptCount}</p>
          <p><strong>Accuracy:</strong> ${accuracy}</p>
        `
      });
    });

    helpBtn.addEventListener('click', () => {
      const config = getCurrentConfig();
      openModal({
        title: 'How to Practice',
        bodyHtml: `
          <p><strong>Language:</strong> switch between ${LANGUAGE_CONFIGS.chinese.label} and ${LANGUAGE_CONFIGS.english.label} vocabulary.</p>
          <p><strong>Flashcard:</strong> click the card to flip, use Previous/Next to navigate, Shuffle to randomize.</p>
          <p><strong>Multiple Choice:</strong> choose a quiz direction, pick one answer, then click Next Question.</p>
          <p><strong>Filter:</strong> use Type filter to focus on specific grammar categories.</p>
          <p><strong>Current language:</strong> ${config.vocabularyLabel}.</p>
        `
      });
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
    document.addEventListener('keydown', onDocumentKeydown);

    loadEntries();

    return () => {
      document.removeEventListener('keydown', onDocumentKeydown);
      isMounted = false;
    };
  }
};
