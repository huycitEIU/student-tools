export const moneyManagementTool = {
  id: 'money-management',
  label: 'Money Management',
  render: () => `
    <section class="card">
      <div class="money-header">
        <div>
          <h2>Money Management</h2>
          <p>Track your income, expenses, and budget to manage your finances effectively.</p>
        </div>
        <div class="currency-selector">
          <label>
            Currency
            <select id="currency-unit">
              <option value="usd">USD ($)</option>
              <option value="vnd">VND (₫)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="money-tabs">
        <button class="money-tab-btn active" data-tab="overview">Overview</button>
        <button class="money-tab-btn" data-tab="income">Income</button>
        <button class="money-tab-btn" data-tab="expenses">Expenses</button>
        <button class="money-tab-btn" data-tab="budget">Budget</button>
      </div>

      <!-- Overview Tab -->
      <div id="overview-tab" class="money-tab-content active">
        <div class="money-summary">
          <div class="summary-card">
            <h3>Total Income</h3>
            <p id="total-income" class="summary-value">$0.00</p>
          </div>
          <div class="summary-card">
            <h3>Total Expenses</h3>
            <p id="total-expenses" class="summary-value">$0.00</p>
          </div>
          <div class="summary-card">
            <h3>Balance</h3>
            <p id="balance" class="summary-value">$0.00</p>
          </div>
          <div class="summary-card">
            <h3>Budget Status</h3>
            <p id="budget-status" class="summary-value">No budget set</p>
          </div>
        </div>
        <div id="balance-chart" class="chart-placeholder">
          <p>Chart visualization will appear here</p>
        </div>
      </div>

      <!-- Income Tab -->
      <div id="income-tab" class="money-tab-content">
        <div class="money-form">
          <h3>Add Income</h3>
          <label>
            Source
            <input id="income-source" type="text" placeholder="e.g., Part-time job, Allowance" />
          </label>
          <label>
            Amount
            <input id="income-amount" type="number" min="0" step="0.01" placeholder="0.00" />
          </label>
          <label>
            Date
            <input id="income-date" type="date" />
          </label>
          <button id="add-income-btn" class="action-btn primary" type="button">Add Income</button>
        </div>

        <div id="income-list" class="money-list">
          <h3>Income History</h3>
          <div id="income-items" class="items-container">
            <p class="empty-message">No income entries yet</p>
          </div>
        </div>
      </div>

      <!-- Expenses Tab -->
      <div id="expenses-tab" class="money-tab-content">
        <div class="money-form">
          <h3>Add Expense</h3>
          <label>
            Category
            <select id="expense-category">
              <option value="">Select a category</option>
              <option value="food">Food & Dining</option>
              <option value="transport">Transportation</option>
              <option value="utilities">Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="books">Books & Supplies</option>
              <option value="clothing">Clothing</option>
              <option value="health">Health & Wellness</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Description
            <input id="expense-description" type="text" placeholder="e.g., Lunch at cafe" />
          </label>
          <label>
            Amount
            <input id="expense-amount" type="number" min="0" step="0.01" placeholder="0.00" />
          </label>
          <label>
            Date
            <input id="expense-date" type="date" />
          </label>
          <button id="add-expense-btn" class="action-btn primary" type="button">Add Expense</button>
        </div>

        <div id="expenses-list" class="money-list">
          <h3>Expense History</h3>
          <div id="expenses-items" class="items-container">
            <p class="empty-message">No expense entries yet</p>
          </div>
        </div>
      </div>

      <!-- Budget Tab -->
      <div id="budget-tab" class="money-tab-content">
        <div class="money-form">
          <h3>Set Monthly Budget</h3>
          <label>
            Budget Category
            <select id="budget-category">
              <option value="">Select a category</option>
              <option value="food">Food & Dining</option>
              <option value="transport">Transportation</option>
              <option value="utilities">Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="books">Books & Supplies</option>
              <option value="clothing">Clothing</option>
              <option value="health">Health & Wellness</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Monthly Limit
            <input id="budget-limit" type="number" min="0" step="0.01" placeholder="0.00" />
          </label>
          <button id="set-budget-btn" class="action-btn primary" type="button">Set Budget</button>
        </div>

        <div id="budgets-list" class="money-list">
          <h3>Budget Limits</h3>
          <div id="budgets-items" class="items-container">
            <p class="empty-message">No budgets set yet</p>
          </div>
        </div>
      </div>
    </section>
  `,
  mount: (root) => {
    // Initialize data from localStorage
    const getFromStorage = (key, defaultValue = []) => {
      try {
        return JSON.parse(localStorage.getItem(`money-management-${key}`) || JSON.stringify(defaultValue));
      } catch {
        return defaultValue;
      }
    };

    const saveToStorage = (key, value) => {
      localStorage.setItem(`money-management-${key}`, JSON.stringify(value));
    };

    let incomeData = getFromStorage('income', []);
    let expenseData = getFromStorage('expenses', []);
    let budgetData = getFromStorage('budgets', {});
    let currentCurrency = getFromStorage('currency', 'usd');

    // Currency formatting helper
    const formatCurrency = (amount) => {
      const currency = root.querySelector('#currency-unit').value;
      if (currency === 'vnd') {
        return `₫${Math.round(amount).toLocaleString('vi-VN')}`;
      }
      return `$${amount.toFixed(2)}`;
    };

    // Currency unit selector
    const currencySelect = root.querySelector('#currency-unit');
    currencySelect.value = currentCurrency;
    currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      saveToStorage('currency', currentCurrency);
      updateOverview();
      renderIncomeList();
      renderExpensesList();
      renderBudgetsList();
    });

    // Tab switching
    const tabButtons = root.querySelectorAll('.money-tab-btn');
    const tabContents = root.querySelectorAll('.money-tab-content');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        tabButtons.forEach((b) => b.classList.remove('active'));
        tabContents.forEach((c) => c.classList.remove('active'));
        e.target.classList.add('active');
        const tabId = e.target.getAttribute('data-tab');
        root.querySelector(`#${tabId}-tab`).classList.add('active');
        updateOverview();
      });
    });

    // Set today's date as default
    const todayString = new Date().toISOString().split('T')[0];
    root.querySelector('#income-date').value = todayString;
    root.querySelector('#expense-date').value = todayString;

    const updateOverview = () => {
      const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
      const balance = totalIncome - totalExpenses;

      root.querySelector('#total-income').textContent = formatCurrency(totalIncome);
      root.querySelector('#total-expenses').textContent = formatCurrency(totalExpenses);
      root.querySelector('#balance').textContent = formatCurrency(balance);
      root.querySelector('#balance').style.color = balance >= 0 ? '#4caf50' : '#f44336';

      // Budget status
      const categoryExpenses = {};
      expenseData.forEach((expense) => {
        categoryExpenses[expense.category] = (categoryExpenses[expense.category] || 0) + expense.amount;
      });

      let budgetStatus = 'All budgets OK';
      let budgetExceeded = false;
      Object.entries(budgetData).forEach(([category, limit]) => {
        if (categoryExpenses[category] > limit) {
          budgetExceeded = true;
        }
      });

      if (budgetExceeded) {
        budgetStatus = 'Budget exceeded in some categories';
        root.querySelector('#budget-status').style.color = '#f44336';
      } else if (Object.keys(budgetData).length === 0) {
        budgetStatus = 'No budget set';
        root.querySelector('#budget-status').style.color = '#999';
      } else {
        root.querySelector('#budget-status').style.color = '#4caf50';
      }

      root.querySelector('#budget-status').textContent = budgetStatus;
    };

    const renderIncomeList = () => {
      const container = root.querySelector('#income-items');
      if (incomeData.length === 0) {
        container.innerHTML = '<p class="empty-message">No income entries yet</p>';
        return;
      }

      container.innerHTML = incomeData
        .map(
          (item, index) => `
        <div class="money-item">
          <div class="item-info">
            <p class="item-title">${item.source}</p>
            <p class="item-date">${item.date}</p>
          </div>
          <div class="item-amount income-amount">+${formatCurrency(item.amount)}</div>
          <button class="item-delete" data-income-index="${index}" type="button" aria-label="Delete">✕</button>
        </div>
      `
        )
        .join('');

      // Add delete handlers
      container.querySelectorAll('.item-delete').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-income-index'));
          incomeData.splice(index, 1);
          saveToStorage('income', incomeData);
          renderIncomeList();
          updateOverview();
        });
      });
    };

    const renderExpensesList = () => {
      const container = root.querySelector('#expenses-items');
      if (expenseData.length === 0) {
        container.innerHTML = '<p class="empty-message">No expense entries yet</p>';
        return;
      }

      container.innerHTML = expenseData
        .map(
          (item, index) => `
        <div class="money-item">
          <div class="item-info">
            <p class="item-title">${item.description || item.category}</p>
            <p class="item-date">${item.date} • ${item.category}</p>
          </div>
          <div class="item-amount expense-amount">-${formatCurrency(item.amount)}</div>
          <button class="item-delete" data-expense-index="${index}" type="button" aria-label="Delete">✕</button>
        </div>
      `
        )
        .join('');

      // Add delete handlers
      container.querySelectorAll('.item-delete').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-expense-index'));
          expenseData.splice(index, 1);
          saveToStorage('expenses', expenseData);
          renderExpensesList();
          updateOverview();
        });
      });
    };

    const renderBudgetsList = () => {
      const container = root.querySelector('#budgets-items');
      if (Object.keys(budgetData).length === 0) {
        container.innerHTML = '<p class="empty-message">No budgets set yet</p>';
        return;
      }

      const categoryExpenses = {};
      expenseData.forEach((expense) => {
        categoryExpenses[expense.category] = (categoryExpenses[expense.category] || 0) + expense.amount;
      });

      const categoryLabels = {
        food: 'Food & Dining',
        transport: 'Transportation',
        utilities: 'Utilities',
        entertainment: 'Entertainment',
        books: 'Books & Supplies',
        clothing: 'Clothing',
        health: 'Health & Wellness',
        other: 'Other'
      };

      container.innerHTML = Object.entries(budgetData)
        .map(([category, limit]) => {
          const spent = categoryExpenses[category] || 0;
          const percentage = (spent / limit) * 100;
          const status = spent > limit ? 'exceeded' : 'ok';

          return `
          <div class="budget-item">
            <div class="budget-header">
              <p class="budget-category">${categoryLabels[category]}</p>
              <span class="budget-status ${status}">${spent > limit ? 'Over' : 'OK'}</span>
            </div>
            <div class="budget-bar">
              <div class="budget-progress" style="width: ${Math.min(percentage, 100)}%; background-color: ${status === 'exceeded' ? '#f44336' : '#4caf50'}"></div>
            </div>
            <p class="budget-text">${formatCurrency(spent)} / ${formatCurrency(limit)}</p>
            <button class="item-delete" data-budget-category="${category}" type="button" aria-label="Delete">✕</button>
          </div>
        `
        })
        .join('');

      // Add delete handlers
      container.querySelectorAll('.item-delete').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const category = e.target.getAttribute('data-budget-category');
          delete budgetData[category];
          saveToStorage('budgets', budgetData);
          renderBudgetsList();
          updateOverview();
        });
      });
    };

    // Income handlers
    const addIncomeBtn = root.querySelector('#add-income-btn');
    addIncomeBtn.addEventListener('click', () => {
      const source = root.querySelector('#income-source').value.trim();
      const amount = parseFloat(root.querySelector('#income-amount').value);
      const date = root.querySelector('#income-date').value;

      if (!source || !amount || amount <= 0 || !date) {
        alert('Please fill in all fields with valid values');
        return;
      }

      incomeData.push({ source, amount, date });
      saveToStorage('income', incomeData);
      root.querySelector('#income-source').value = '';
      root.querySelector('#income-amount').value = '';
      root.querySelector('#income-date').value = todayString;
      renderIncomeList();
      updateOverview();
    });

    // Expense handlers
    const addExpenseBtn = root.querySelector('#add-expense-btn');
    addExpenseBtn.addEventListener('click', () => {
      const category = root.querySelector('#expense-category').value.trim();
      const description = root.querySelector('#expense-description').value.trim();
      const amount = parseFloat(root.querySelector('#expense-amount').value);
      const date = root.querySelector('#expense-date').value;

      if (!category || !amount || amount <= 0 || !date) {
        alert('Please fill in all required fields with valid values');
        return;
      }

      expenseData.push({ category, description, amount, date });
      saveToStorage('expenses', expenseData);
      root.querySelector('#expense-category').value = '';
      root.querySelector('#expense-description').value = '';
      root.querySelector('#expense-amount').value = '';
      root.querySelector('#expense-date').value = todayString;
      renderExpensesList();
      updateOverview();
    });

    // Budget handlers
    const setBudgetBtn = root.querySelector('#set-budget-btn');
    setBudgetBtn.addEventListener('click', () => {
      const category = root.querySelector('#budget-category').value.trim();
      const limit = parseFloat(root.querySelector('#budget-limit').value);

      if (!category || !limit || limit <= 0) {
        alert('Please fill in all fields with valid values');
        return;
      }

      budgetData[category] = limit;
      saveToStorage('budgets', budgetData);
      root.querySelector('#budget-category').value = '';
      root.querySelector('#budget-limit').value = '';
      renderBudgetsList();
      updateOverview();
    });

    // Initial render
    renderIncomeList();
    renderExpensesList();
    renderBudgetsList();
    updateOverview();
  }
};
