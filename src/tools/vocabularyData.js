import { getCurrentUser } from '../firebase/auth.js';
import { loadToolData, saveToolData } from '../firebase/toolData.js';

const SESSION_HYDRATION_KEY_PREFIX = 'student-tools:vocab-hydrated-v1:';

const VOCABULARY_CONFIGS = {
  chinese: {
    storageKey: 'student-tools:chinese-vocabulary-v1',
    toolId: 'chinese-vocabulary',
    label: 'Chinese'
  },
  english: {
    storageKey: 'student-tools:english-vocabulary-v1',
    toolId: 'english-vocabulary',
    label: 'English'
  }
};

export const getVocabularyConfig = (language = 'chinese') => {
  return VOCABULARY_CONFIGS[language] || VOCABULARY_CONFIGS.chinese;
};

export const loadLocalVocabularyEntries = (language = 'chinese') => {
  const config = getVocabularyConfig(language);

  try {
    const raw = localStorage.getItem(config.storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
};

const saveLocalVocabularyEntries = (language = 'chinese', entries = []) => {
  const config = getVocabularyConfig(language);
  localStorage.setItem(config.storageKey, JSON.stringify(entries));
};

const normalizeStoredEntries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter((item) => item && typeof item === 'object');
};

const getHydrationKey = (uid, toolId) => `${SESSION_HYDRATION_KEY_PREFIX}${uid}:${toolId}`;

export const loadStoredVocabularyEntries = async (language = 'chinese') => {
  const config = getVocabularyConfig(language);
  const user = getCurrentUser();

  if (!user) {
    return loadLocalVocabularyEntries(language);
  }

  const hydrationKey = getHydrationKey(user.uid, config.toolId);
  if (sessionStorage.getItem(hydrationKey) === '1') {
    return loadLocalVocabularyEntries(language);
  }

  const localEntries = loadLocalVocabularyEntries(language);
  const remoteEntries = await loadToolData(user.uid, config.toolId, null);
  sessionStorage.setItem(hydrationKey, '1');

  if (Array.isArray(remoteEntries)) {
    const normalizedRemoteEntries = normalizeStoredEntries(remoteEntries);
    saveLocalVocabularyEntries(language, normalizedRemoteEntries);
    return normalizedRemoteEntries;
  }

  return localEntries;
};

export const persistVocabularyEntries = async (language = 'chinese', entries = []) => {
  const config = getVocabularyConfig(language);
  saveLocalVocabularyEntries(language, entries);

  const user = getCurrentUser();
  if (!user) {
    return;
  }

  sessionStorage.setItem(getHydrationKey(user.uid, config.toolId), '1');

  await saveToolData(user.uid, config.toolId, entries);
};
