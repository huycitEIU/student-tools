const escapeHtml = (value) => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const getRandomInteger = (min, max) => {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

const parseTextList = (value) => {
  return value
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
};

const pickRandomItem = (items) => {
  if (!items.length) {
    return '';
  }

  return items[Math.floor(Math.random() * items.length)];
};

export const randomTool = {
  id: 'random',
  label: 'Random',
  render: () => `
    <section class="card random-card">
      <h2>Random</h2>
      <p>Generate a random number or pick a random item from a list you enter.</p>

      <div class="random-section">
        <h3>Random Number</h3>
        <div class="random-grid">
          <label>
            Minimum
            <input id="random-min" type="number" value="1" step="1" />
          </label>
          <label>
            Maximum
            <input id="random-max" type="number" value="100" step="1" />
          </label>
        </div>
        <div class="random-actions">
          <button id="random-number-btn" class="action-btn primary" type="button">Generate Number</button>
        </div>
      </div>

      <div class="random-section">
        <h3>Random Text</h3>
        <p>Enter one item per line or separate items with commas.</p>
        <textarea id="random-list" class="random-textarea" placeholder="Name 1\nName 2\nName 3"></textarea>
        <div class="random-actions">
          <button id="random-text-btn" class="action-btn primary" type="button">Pick Random Text</button>
        </div>
      </div>

      <div id="random-popup" class="random-popup" aria-hidden="true">
        <div class="random-popup-backdrop" data-random-close></div>
        <div class="random-popup-dialog" role="dialog" aria-modal="true" aria-labelledby="random-popup-title">
          <button id="random-popup-close" class="random-popup-close" type="button" aria-label="Close result popup">&times;</button>
          <div id="random-popup-title" class="random-popup-label">Random Result</div>
          <div id="random-popup-body" class="random-popup-body"></div>
        </div>
      </div>
    </section>
  `,
  mount: (root) => {
    const minInput = root.querySelector('#random-min');
    const maxInput = root.querySelector('#random-max');
    const numberBtn = root.querySelector('#random-number-btn');
    const listInput = root.querySelector('#random-list');
    const textBtn = root.querySelector('#random-text-btn');
    const popup = root.querySelector('#random-popup');
    const popupBody = root.querySelector('#random-popup-body');
    const popupClose = root.querySelector('#random-popup-close');

    const closePopup = () => {
      popup.classList.remove('visible');
      popup.setAttribute('aria-hidden', 'true');
      popupBody.innerHTML = '';
    };

    const openPopup = (title, bodyHtml) => {
      popupBody.innerHTML = `
        <h3>${escapeHtml(title)}</h3>
        ${bodyHtml}
      `;
      popup.classList.add('visible');
      popup.setAttribute('aria-hidden', 'false');
    };

    const generateNumber = () => {
      const min = Number(minInput.value);
      const max = Number(maxInput.value);

      if (Number.isNaN(min) || Number.isNaN(max)) {
        openPopup('Random Number', '<p>Please enter valid numbers for both minimum and maximum.</p>');
        return;
      }

      const randomValue = getRandomInteger(min, max);
      openPopup('Random Number', `<p class="random-popup-value">${escapeHtml(randomValue)}</p>`);
    };

    const generateText = () => {
      const items = parseTextList(listInput.value);

      if (!items.length) {
        openPopup('Random Text', '<p>Please enter at least one item in the text box.</p>');
        return;
      }

      const pickedItem = pickRandomItem(items);
      openPopup(
        'Random Text',
        `
          <p class="random-popup-value">${escapeHtml(pickedItem)}</p>
          <p class="random-popup-meta">From list of ${items.length}</p>
        `
      );
    };

    numberBtn.addEventListener('click', generateNumber);
    textBtn.addEventListener('click', generateText);
    popupClose.addEventListener('click', closePopup);
    popup.addEventListener('click', (event) => {
      if (event.target.matches('[data-random-close]')) {
        closePopup();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popup.classList.contains('visible')) {
        closePopup();
      }
    });

    minInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        generateNumber();
      }
    });

    maxInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        generateNumber();
      }
    });

    listInput.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        generateText();
      }
    });
  }
};
