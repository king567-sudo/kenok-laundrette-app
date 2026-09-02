const addExpenseBtn = document.getElementById('addExpenseBtn');
const addExpenseModal = document.getElementById('addExpenseModal');
const closeAddExpense = document.getElementById('closeAddExpense');
const expenseLabel = document.getElementById('expenseLabel');
const expenseAmount = document.getElementById('expenseAmount');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const expenseList = document.getElementById('expenseList');
const totalRevenueEl = document.getElementById('totalRevenue');
const totalExpensesEl = document.getElementById('totalExpenses');
const totalProfitEl = document.getElementById('totalProfit');

let allExpenses = [];
let allOrdersForAnalysis = [];
let profitChartInstance = null;

addExpenseBtn.addEventListener('click', () => {
  addExpenseModal.style.display = 'flex';
});

closeAddExpense.addEventListener('click', () => {
  addExpenseModal.style.display = 'none';
  expenseLabel.value = '';
  expenseAmount.value = '';
});

addExpenseModal.addEventListener('click', (e) => {
  if (e.target === addExpenseModal) addExpenseModal.style.display = 'none';
});

saveExpenseBtn.addEventListener('click', () => {
  const label = expenseLabel.value.trim();
  const amount = parseFloat(expenseAmount.value);

  if (!label || !amount || amount <= 0) {
    alert('Please enter a valid expense label and amount.');
    return;
  }

  db.collection('expenses').add({
    label: label,
    amount: amount,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: auth.currentUser ? auth.currentUser.email : 'unknown'
  }).then(() => {
    addExpenseModal.style.display = 'none';
    expenseLabel.value = '';
    expenseAmount.value = '';
  });
});

function startListeningToExpenses() {
  db.collection('expenses').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderExpenseList();
    updateAnalysisSummary();
    renderProfitChart();
  });
}

function renderExpenseList() {
  if (allExpenses.length === 0) {
    expenseList.innerHTML = '<p class="placeholder-text">No expenses logged yet</p>';
    return;
  }

  expenseList.innerHTML = '';
  allExpenses.forEach((exp) => {
    const dateStr = exp.createdAt && exp.createdAt.toDate
      ? exp.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '';

    const row = document.createElement('div');
    row.className = 'expense-entry';
    row.innerHTML = `
      <div>
        <div class="expense-entry-label">${exp.label}</div>
        <div class="expense-entry-date">${dateStr}</div>
      </div>
      <span class="expense-entry-amount">-₦${exp.amount}</span>
    `;
    expenseList.appendChild(row);
  });
}

function startListeningToOrdersForAnalysis() {
  db.collection('orders').onSnapshot((snapshot) => {
    allOrdersForAnalysis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateAnalysisSummary();
    renderProfitChart();
  });
}

function updateAnalysisSummary() {
  const totalRevenue = allOrdersForAnalysis.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalExpensesAmount = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const profit = totalRevenue - totalExpensesAmount;

  totalRevenueEl.textContent = `₦${totalRevenue.toLocaleString()}`;
  totalExpensesEl.textContent = `₦${totalExpensesAmount.toLocaleString()}`;
  totalProfitEl.textContent = `₦${profit.toLocaleString()}`;
  totalProfitEl.style.color = profit >= 0 ? '#1a7a3c' : '#c0392b';
}

// Build a day-by-day revenue/expense/profit dataset for the last 14 days
function buildChartData() {
  const days = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      revenue: 0,
      expenses: 0
    });
  }

  const dayMap = {};
  days.forEach(d => dayMap[d.key] = d);

  allOrdersForAnalysis.forEach(order => {
    if (!order.createdAt || !order.createdAt.toDate) return;
    const d = order.createdAt.toDate();
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayMap[key]) dayMap[key].revenue += (order.total || 0);
  });

  allExpenses.forEach(exp => {
    if (!exp.createdAt || !exp.createdAt.toDate) return;
    const d = exp.createdAt.toDate();
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayMap[key]) dayMap[key].expenses += (exp.amount || 0);
  });

  return days;
}

function renderProfitChart() {
  const canvas = document.getElementById('profitChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const data = buildChartData();
  const labels = data.map(d => d.label);
  const revenueData = data.map(d => d.revenue);
  const expenseData = data.map(d => d.expenses);
  const profitData = data.map(d => d.revenue - d.expenses);

  if (profitChartInstance) {
    profitChartInstance.destroy();
  }

  profitChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: '#1a7a3c',
          backgroundColor: 'rgba(26, 122, 60, 0.08)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#c0392b',
          backgroundColor: 'rgba(192, 57, 43, 0.06)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Profit',
          data: profitData,
          borderColor: '#C9A227',
          backgroundColor: 'rgba(201, 162, 39, 0.08)',
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
      },
      scales: {
        y: { ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}