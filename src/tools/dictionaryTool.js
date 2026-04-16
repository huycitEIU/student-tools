const escapeHtml = (value) => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const uniqueItems = (items) => {
  return [...new Set(items.filter(Boolean).map((item) => String(item).trim()))];
};

const fetchDictionaryEntries = async (word) => {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }

    throw new Error(`Dictionary request failed: ${response.status}`);
  }

  return response.json();
};

const getBestIpa = (entry) => {
  if (entry.phonetic) {
    return entry.phonetic;
  }

  const phoneticFromList = entry.phonetics?.find((item) => item?.text)?.text;
  return phoneticFromList || 'N/A';
};

const renderDictionaryResult = (entry) => {
  const ipa = getBestIpa(entry);

  const meaningCards = (entry.meanings || []).map((meaning) => {
    const type = meaning.partOfSpeech || 'Unknown';
    const primaryDefinition = meaning.definitions?.[0]?.definition || 'No definition available.';

    const meaningSynonyms = uniqueItems([
      ...(meaning.synonyms || []),
      ...((meaning.definitions || []).flatMap((item) => item.synonyms || []))
    ]);

    const meaningAntonyms = uniqueItems([
      ...(meaning.antonyms || []),
      ...((meaning.definitions || []).flatMap((item) => item.antonyms || []))
    ]);

    return `
      <article class="dictionary-meaning-card">
        <h3>${escapeHtml(type)}</h3>
        <p><strong>Definition:</strong> ${escapeHtml(primaryDefinition)}</p>
        <p><strong>Synonyms:</strong> ${escapeHtml(meaningSynonyms.slice(0, 10).join(', ') || 'None listed')}</p>
        <p><strong>Antonyms:</strong> ${escapeHtml(meaningAntonyms.slice(0, 10).join(', ') || 'None listed')}</p>
      </article>
    `;
  });

  return `
    <div class="dictionary-entry">
      <p><strong>Word:</strong> ${escapeHtml(entry.word || 'N/A')}</p>
      <p><strong>IPA:</strong> ${escapeHtml(ipa)}</p>
      <div class="dictionary-meanings">
        ${meaningCards.length ? meaningCards.join('') : '<p>No meaning data available.</p>'}
      </div>
    </div>
  `;
};

export const dictionaryTool = {
  id: 'dictionary',
  label: 'Dictionary',
  render: () => `
    <section class="card dictionary-card">
      <h2>Dictionary</h2>
      <p>Search a word to view IPA, type, definition, synonyms, and antonyms.</p>

      <div class="dictionary-search-row">
        <input id="dictionary-word" type="text" placeholder="Enter a word" />
        <button id="dictionary-search-btn" class="action-btn primary" type="button">Search</button>
      </div>

      <div id="dictionary-status" class="notes-status">Enter a word and click Search.</div>

      <div id="dictionary-result" class="result">
        <p>Your dictionary result will appear here.</p>
      </div>
    </section>
  `,
  mount: (root) => {
    const wordInput = root.querySelector('#dictionary-word');
    const searchBtn = root.querySelector('#dictionary-search-btn');
    const statusBox = root.querySelector('#dictionary-status');
    const resultBox = root.querySelector('#dictionary-result');

    const searchWord = async () => {
      const word = wordInput.value.trim();

      if (!word) {
        statusBox.textContent = 'Please enter a word.';
        resultBox.innerHTML = '<p>Your dictionary result will appear here.</p>';
        return;
      }

      statusBox.textContent = `Searching for "${word}"...`;
      resultBox.innerHTML = '<p>Loading dictionary data...</p>';

      try {
        const entries = await fetchDictionaryEntries(word);

        if (!entries.length) {
          statusBox.textContent = `No result found for "${word}".`;
          resultBox.innerHTML = '<p>Try another word.</p>';
          return;
        }

        const bestEntry = entries[0];
        statusBox.textContent = `Result found for "${bestEntry.word}".`;
        resultBox.innerHTML = renderDictionaryResult(bestEntry);
      } catch {
        statusBox.textContent = 'Unable to load dictionary data right now.';
        resultBox.innerHTML = '<p>Please try again in a moment.</p>';
      }
    };

    searchBtn.addEventListener('click', searchWord);
    wordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        searchWord();
      }
    });
  }
};
