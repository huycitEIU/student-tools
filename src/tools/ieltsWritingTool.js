import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getCurrentUser } from '../firebase/auth.js';
import { db, isFirebaseConfigured } from '../firebase/config.js';

const TOOL_ID = 'ielts-writing';
const LOCAL_TOPICS_KEY = 'student-tools:ielts-writing-local-topics-v1';
const DRAFT_KEY = 'student-tools:ielts-writing-draft-v1';
const SHARED_TOPICS_COLLECTION = 'ieltsWritingTopics';

const DEFAULT_TOPICS = [
  'Some people think that university students should focus only on their major subjects. Others think they should also study other subjects. Discuss both views and give your opinion.',
  'In many countries, more people are choosing to live alone. Why is this happening, and is it a positive or negative development?',
  'Some people believe that governments should spend more money on public transport instead of building new roads. To what extent do you agree or disagree?',
  'Many students find it difficult to concentrate or pay attention at school. What are the reasons, and what can be done to solve this problem?',
  'Online education is becoming more common in higher education. Do the advantages outweigh the disadvantages?',
  'In some cities, housing costs are becoming too high for ordinary people. Why is this happening, and what can governments do to help?',
  'Some people think that children should start learning a foreign language at primary school rather than secondary school. Discuss both views and give your opinion.',
  'The best way to improve public health is by increasing sports facilities. Others think this would have little effect. Discuss both views and give your opinion.'
];

const normalize = (value = '') => String(value).trim();

const normalizeTopicKey = (text = '') => {
  return normalize(text).toLowerCase().replace(/\s+/g, ' ');
};

const loadLocalTopics = () => {
  try {
    const raw = localStorage.getItem(LOCAL_TOPICS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.text === 'string') : [];
  } catch {
    return [];
  }
};

const saveLocalTopics = (topics) => {
  localStorage.setItem(LOCAL_TOPICS_KEY, JSON.stringify(topics));
};

const loadDraft = () => {
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
};

const saveDraft = (text) => {
  localStorage.setItem(DRAFT_KEY, text);
};

const mergeTopics = (...topicSets) => {
  const byKey = new Map();

  topicSets.flat().forEach((item) => {
    const text = normalize(item?.text || item);
    if (!text) {
      return;
    }

    const key = normalizeTopicKey(text);
    if (!key) {
      return;
    }

    if (!byKey.has(key)) {
      byKey.set(key, {
        id: item?.id || `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        createdBy: item?.createdBy || 'Community',
        source: item?.source || 'local',
        createdAt: item?.createdAt || 0
      });
    }
  });

  return [...byKey.values()].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
};

const loadSharedTopics = async () => {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  const snapshot = await getDocs(query(collection(db, SHARED_TOPICS_COLLECTION), orderBy('createdAt', 'desc')));
  return snapshot.docs
    .map((docItem) => {
      const data = docItem.data() || {};
      return {
        id: docItem.id,
        text: normalize(data.text),
        createdBy: normalize(data.createdBy || 'Community') || 'Community',
        source: 'server',
        createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0
      };
    })
    .filter((item) => item.text);
};

const createDefaultTopicObjects = () => {
  return DEFAULT_TOPICS.map((text, index) => ({
    id: `default-${index + 1}`,
    text,
    createdBy: 'System',
    source: 'default',
    createdAt: 0
  }));
};

const formatElapsed = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const countWords = (text = '') => {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  return words.length;
};

export const ieltsWritingTool = {
  id: TOOL_ID,
  label: 'IELTS Writing',
  render: () => `
    <section class="card ielts-writing-card">
      <h2>IELTS Writing Simulation</h2>
      <p>Select a topic, write under exam-like conditions, track your word count, and use the stopwatch.</p>

      <div class="ielts-writing-layout">
        <aside class="ielts-topic-panel">
          <div class="ielts-topic-add">
            <textarea id="ielts-new-topic" rows="4" placeholder="Add a new IELTS writing topic..."></textarea>
            <div class="ielts-topic-actions">
              <button id="ielts-add-topic-btn" class="action-btn primary" type="button">Add Topic</button>
              <button id="ielts-random-topic-btn" class="action-btn" type="button">Random Topic</button>
              <button id="ielts-sync-topics-btn" class="action-btn" type="button">Sync Topics</button>
            </div>
          </div>

          <div id="ielts-topic-list" class="ielts-topic-list"></div>
        </aside>

        <section class="ielts-writing-panel">
          <div class="ielts-writing-head">
            <h3 id="ielts-selected-topic-title">Topic</h3>
            <p id="ielts-selected-topic-meta"></p>
          </div>

          <textarea
            id="ielts-writing-input"
            class="ielts-writing-input"
            placeholder="Start writing your IELTS response here..."
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            data-gramm="false"
            data-lt-active="false"
            data-enable-grammarly="false"
          ></textarea>

          <div class="ielts-writing-tools">
            <div class="ielts-word-count" id="ielts-word-count">Word count: 0</div>
            <div class="ielts-stopwatch">
              <span id="ielts-stopwatch-display">00:00</span>
              <button id="ielts-stopwatch-toggle" class="action-btn" type="button">Start</button>
              <button id="ielts-stopwatch-reset" class="remove-row" type="button">Reset</button>
            </div>
          </div>

          <div id="ielts-status" class="notes-status">Topics loaded.</div>
        </section>
      </div>
    </section>
  `,
  mount: (root) => {
    const newTopicInput = root.querySelector('#ielts-new-topic');
    const addTopicBtn = root.querySelector('#ielts-add-topic-btn');
    const randomTopicBtn = root.querySelector('#ielts-random-topic-btn');
    const syncTopicsBtn = root.querySelector('#ielts-sync-topics-btn');
    const topicList = root.querySelector('#ielts-topic-list');
    const topicTitle = root.querySelector('#ielts-selected-topic-title');
    const topicMeta = root.querySelector('#ielts-selected-topic-meta');
    const writingInput = root.querySelector('#ielts-writing-input');
    const wordCount = root.querySelector('#ielts-word-count');
    const stopwatchDisplay = root.querySelector('#ielts-stopwatch-display');
    const stopwatchToggle = root.querySelector('#ielts-stopwatch-toggle');
    const stopwatchReset = root.querySelector('#ielts-stopwatch-reset');
    const statusBox = root.querySelector('#ielts-status');

    let isMounted = true;
    let topics = [];
    let selectedTopicId = '';
    let elapsedSeconds = 0;
    let timerId = null;

    const updateWordCount = () => {
      wordCount.textContent = `Word count: ${countWords(writingInput.value)}`;
    };

    const updateStopwatchDisplay = () => {
      stopwatchDisplay.textContent = formatElapsed(elapsedSeconds);
      stopwatchToggle.textContent = timerId ? 'Pause' : 'Start';
    };

    const startStopwatch = () => {
      if (timerId) {
        return;
      }

      timerId = window.setInterval(() => {
        elapsedSeconds += 1;
        updateStopwatchDisplay();
      }, 1000);

      updateStopwatchDisplay();
    };

    const pauseStopwatch = () => {
      if (!timerId) {
        return;
      }

      clearInterval(timerId);
      timerId = null;
      updateStopwatchDisplay();
    };

    const resetStopwatch = () => {
      pauseStopwatch();
      elapsedSeconds = 0;
      updateStopwatchDisplay();
    };

    const getSelectedTopic = () => {
      return topics.find((item) => item.id === selectedTopicId) || null;
    };

    const renderTopicList = () => {
      topicList.innerHTML = topics.length
        ? topics
            .map((topic) => {
              const activeClass = topic.id === selectedTopicId ? 'active' : '';
              return `
                <button type="button" class="ielts-topic-item ${activeClass}" data-topic-id="${topic.id}">
                  <span>${topic.text}</span>
                  <small>${topic.source === 'server' ? 'Synced' : topic.source === 'default' ? 'Default' : 'Local'} · ${topic.createdBy}</small>
                </button>
              `;
            })
            .join('')
        : '<div class="ielts-topic-empty">No topics available.</div>';

      const selectedTopic = getSelectedTopic();
      if (!selectedTopic) {
        topicTitle.textContent = 'No topic selected';
        topicMeta.textContent = '';
        return;
      }

      topicTitle.textContent = selectedTopic.text;
      topicMeta.textContent = `${selectedTopic.source === 'server' ? 'Synced topic' : 'Local topic'} · ${selectedTopic.createdBy}`;
    };

    const persistLocalTopics = () => {
      const localOnly = topics.filter((item) => item.source !== 'default');
      saveLocalTopics(localOnly);
    };

    const loadAllTopics = async () => {
      statusBox.textContent = 'Loading topics...';
      const defaults = createDefaultTopicObjects();
      const localTopics = loadLocalTopics();
      let sharedTopics = [];

      try {
        sharedTopics = await loadSharedTopics();
      } catch {
        sharedTopics = [];
        statusBox.textContent = 'Could not load shared topics. Local topics are available.';
      }

      topics = mergeTopics(defaults, localTopics, sharedTopics);
      if (!topics.length) {
        topics = defaults;
      }

      if (!selectedTopicId || !topics.some((item) => item.id === selectedTopicId)) {
        selectedTopicId = topics[0]?.id || '';
      }

      persistLocalTopics();
      renderTopicList();
      if (statusBox.textContent === 'Loading topics...') {
        statusBox.textContent = `Loaded ${topics.length} topic(s).`;
      }
    };

    const addTopic = async () => {
      const text = normalize(newTopicInput.value);
      if (!text) {
        statusBox.textContent = 'Please enter a topic before adding.';
        return;
      }

      const alreadyExists = topics.some((item) => normalizeTopicKey(item.text) === normalizeTopicKey(text));
      if (alreadyExists) {
        statusBox.textContent = 'This topic already exists.';
        return;
      }

      const user = getCurrentUser();
      const createdBy = user?.displayName || user?.email || 'Anonymous';
      const localTopic = {
        id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        createdBy,
        source: 'local',
        createdAt: Date.now()
      };

      topics = mergeTopics(localTopic, topics);
      selectedTopicId = localTopic.id;
      persistLocalTopics();
      renderTopicList();
      newTopicInput.value = '';

      if (!isFirebaseConfigured || !db) {
        statusBox.textContent = 'Topic added locally. Firebase is not configured for sync.';
        return;
      }

      if (!user) {
        statusBox.textContent = 'Topic added locally. Sign in to sync this topic for other users.';
        return;
      }

      try {
        const createdDoc = await addDoc(collection(db, SHARED_TOPICS_COLLECTION), {
          text,
          createdBy,
          createdByUid: user.uid,
          createdAt: serverTimestamp()
        });

        topics = topics.map((item) => {
          if (item.id !== localTopic.id) {
            return item;
          }

          return {
            ...item,
            id: createdDoc.id,
            source: 'server'
          };
        });

        persistLocalTopics();
        selectedTopicId = createdDoc.id;
        renderTopicList();
        statusBox.textContent = 'Topic added and synced to server.';
      } catch {
        statusBox.textContent = 'Topic added locally, but sync failed. Try syncing again later.';
      }
    };

    const pickRandomTopic = () => {
      if (!topics.length) {
        statusBox.textContent = 'No topics available to randomize.';
        return;
      }

      const candidates = topics.filter((item) => item.id !== selectedTopicId);
      const pool = candidates.length ? candidates : topics;
      const randomIndex = Math.floor(Math.random() * pool.length);
      const selected = pool[randomIndex];
      if (!selected) {
        statusBox.textContent = 'Could not choose a random topic right now.';
        return;
      }

      selectedTopicId = selected.id;
      renderTopicList();
      statusBox.textContent = 'Random topic selected.';
    };

    topicList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-topic-id]');
      if (!button) {
        return;
      }

      selectedTopicId = button.dataset.topicId;
      renderTopicList();
    });

    addTopicBtn.addEventListener('click', () => {
      addTopic();
    });

    randomTopicBtn.addEventListener('click', () => {
      pickRandomTopic();
    });

    syncTopicsBtn.addEventListener('click', async () => {
      await loadAllTopics();
      statusBox.textContent = 'Topics synced.';
    });

    newTopicInput.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        addTopic();
      }
    });

    writingInput.value = loadDraft();
    updateWordCount();
    writingInput.addEventListener('input', () => {
      saveDraft(writingInput.value);
      updateWordCount();
    });

    stopwatchToggle.addEventListener('click', () => {
      if (timerId) {
        pauseStopwatch();
        return;
      }

      startStopwatch();
    });

    stopwatchReset.addEventListener('click', () => {
      resetStopwatch();
    });

    updateStopwatchDisplay();
    loadAllTopics();

    return () => {
      isMounted = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }
};
