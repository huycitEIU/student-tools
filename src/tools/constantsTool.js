const STORAGE_KEY = 'student-tools:constants-v1';

const DEFAULT_CONSTANTS = [
  {
    id: 'const-pi',
    name: 'Pi',
    symbol: 'pi',
    value: '3.141592653589793',
    unit: 'unitless',
    category: 'Math',
    description: 'Ratio of a circle\'s circumference to its diameter.'
  },
  {
    id: 'const-e',
    name: 'Euler\'s Number',
    symbol: 'e',
    value: '2.718281828459045',
    unit: 'unitless',
    category: 'Math',
    description: 'Base of natural logarithms.'
  },
  {
    id: 'const-c',
    name: 'Speed of Light',
    symbol: 'c',
    value: '299792458',
    unit: 'm/s',
    category: 'Physics',
    description: 'Speed of light in vacuum.'
  },
  {
    id: 'const-g',
    name: 'Gravitational Constant',
    symbol: 'G',
    value: '6.67430e-11',
    unit: 'm^3 kg^-1 s^-2',
    category: 'Physics',
    description: 'Universal gravitational constant.'
  },
  {
    id: 'const-h',
    name: 'Planck Constant',
    symbol: 'h',
    value: '6.62607015e-34',
    unit: 'J s',
    category: 'Physics',
    description: 'Relates photon energy and frequency.'
  },
  {
    id: 'const-na',
    name: 'Avogadro Constant',
    symbol: 'N_A',
    value: '6.02214076e23',
    unit: 'mol^-1',
    category: 'Chemistry',
    description: 'Number of particles in one mole.'
  },
  {
    id: 'const-kb',
    name: 'Boltzmann Constant',
    symbol: 'k_B',
    value: '1.380649e-23',
    unit: 'J K^-1',
    category: 'Physics',
    description: 'Relates temperature to energy.'
  }
];

const CATEGORY_OPTIONS = ['Math', 'Physics', 'Chemistry', 'Other'];

const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const normalize = (value = '') => String(value).trim();

const loadConstants = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_CONSTANTS];
    }

    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [...DEFAULT_CONSTANTS];
  }
};

const saveConstants = (constants) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(constants));
};

const renderRows = (constants) => {
  if (!constants.length) {
    return `
      <tr>
        <td colspan="6" class="constants-empty">No constants match your search.</td>
      </tr>
    `;
  }

  return constants
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.symbol)}</td>
          <td>${escapeHtml(item.value)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.description)}</td>
        </tr>
      `
    )
    .join('');
};

export const constantsTool = {
  id: 'constants',
  label: 'Constants',
  render: () => `
    <section class="card constants-card">
      <h2>Math & Physics Constants</h2>
      <p>Browse common constants and add your own for quick reference.</p>

      <form id="constants-form" class="constants-form">
        <input id="constant-name" type="text" placeholder="Constant name" maxlength="80" required />
        <input id="constant-symbol" type="text" placeholder="Symbol" maxlength="30" required />
        <input id="constant-value" type="text" placeholder="Value" maxlength="60" required />
        <input id="constant-unit" type="text" placeholder="Unit (optional)" maxlength="40" />
        <select id="constant-category">
          ${CATEGORY_OPTIONS.map((item) => `<option value="${item}">${item}</option>`).join('')}
        </select>
        <input id="constant-description" type="text" placeholder="Description (optional)" maxlength="140" />
        <button id="constant-add-btn" type="submit" class="action-btn primary">Add Constant</button>
      </form>

      <div class="constants-toolbar">
        <input id="constants-search" type="search" placeholder="Search by name, symbol, value, unit, category..." />
      </div>

      <div id="constants-status" class="notes-status">Constants loaded.</div>
      <div id="constants-count" class="constants-count">Total: 0 | Matching: 0</div>

      <div class="constants-table-wrap">
        <table class="data-table constants-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Symbol</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Category</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody id="constants-table-body"></tbody>
        </table>
      </div>
    </section>
  `,
  mount: (root) => {
    const form = root.querySelector('#constants-form');
    const nameInput = root.querySelector('#constant-name');
    const symbolInput = root.querySelector('#constant-symbol');
    const valueInput = root.querySelector('#constant-value');
    const unitInput = root.querySelector('#constant-unit');
    const categoryInput = root.querySelector('#constant-category');
    const descriptionInput = root.querySelector('#constant-description');
    const searchInput = root.querySelector('#constants-search');
    const statusBox = root.querySelector('#constants-status');
    const countBox = root.querySelector('#constants-count');
    const tableBody = root.querySelector('#constants-table-body');

    let constants = loadConstants();

    const renderTable = () => {
      const keyword = normalize(searchInput.value).toLowerCase();
      const filtered = constants.filter((item) => {
        if (!keyword) {
          return true;
        }

        const searchable = [item.name, item.symbol, item.value, item.unit, item.category, item.description]
          .join(' ')
          .toLowerCase();

        return searchable.includes(keyword);
      });

      tableBody.innerHTML = renderRows(filtered);
      countBox.textContent = `Total: ${constants.length} | Matching: ${filtered.length}`;

      if (keyword) {
        statusBox.textContent = `Showing ${filtered.length} result(s) for "${keyword}".`;
      } else {
        statusBox.textContent = `Loaded ${constants.length} constant(s).`;
      }
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = normalize(nameInput.value);
      const symbol = normalize(symbolInput.value);
      const value = normalize(valueInput.value);
      const unit = normalize(unitInput.value);
      const category = normalize(categoryInput.value) || 'Other';
      const description = normalize(descriptionInput.value);

      if (!name || !symbol || !value) {
        statusBox.textContent = 'Please enter name, symbol, and value.';
        return;
      }

      const duplicate = constants.some((item) => {
        return item.name.toLowerCase() === name.toLowerCase() && item.symbol.toLowerCase() === symbol.toLowerCase();
      });

      if (duplicate) {
        statusBox.textContent = 'This constant already exists with the same name and symbol.';
        return;
      }

      constants = [
        {
          id: `const-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          symbol,
          value,
          unit,
          category,
          description
        },
        ...constants
      ];

      saveConstants(constants);
      form.reset();
      categoryInput.value = 'Math';
      nameInput.focus();
      statusBox.textContent = `Added constant: ${name}.`;
      renderTable();
    });

    searchInput.addEventListener('input', () => {
      renderTable();
    });

    categoryInput.value = 'Math';
    renderTable();
  }
};
