const registerSearch = document.getElementById('registerSearch');
const registerList = document.getElementById('registerList');

let allOrders = [];

function startListeningToAllOrders() {
  db.collection('orders').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRegister();
  });
}

function getDateLabel(timestamp) {
  if (!timestamp || !timestamp.toDate) return 'Unknown date';

  const date = timestamp.toDate();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function getDateKey(timestamp) {
  if (!timestamp || !timestamp.toDate) return 'unknown';
  const date = timestamp.toDate();
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function renderRegister() {
  const term = registerSearch.value.toLowerCase().trim();

  const filtered = allOrders.filter(order => {
    if (!term) return true;
    const customerMatch = order.customerName.toLowerCase().includes(term);
    const itemMatch = order.items.some(item => item.type.toLowerCase().includes(term));
    return customerMatch || itemMatch;
  });

  if (filtered.length === 0) {
    registerList.innerHTML = `<p class="placeholder-text">${allOrders.length === 0 ? 'No entries yet' : 'No entries match your search'}</p>`;
    return;
  }

  // Group by day
  const groups = {};
  const groupOrder = [];

  filtered.forEach(order => {
    const key = getDateKey(order.createdAt);
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push(order);
  });

  registerList.innerHTML = '';
  groupOrder.forEach(key => {
    const ordersInGroup = groups[key];
    const label = getDateLabel(ordersInGroup[0].createdAt);

    const groupDiv = document.createElement('div');
    groupDiv.className = 'register-day-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'register-day-label';
    labelEl.textContent = label;
    groupDiv.appendChild(labelEl);

    ordersInGroup.forEach(order => {
      const allReady = order.items.every(item => item.status === 'ready');
      const itemsSummary = order.items.map(i => `${i.type} × ${i.qty}`).join(', ');

      const entry = document.createElement('div');
      entry.className = 'register-entry';
      entry.setAttribute('data-customer-id', order.customerId);
      entry.innerHTML = `
        <div class="register-entry-top">
          <span class="register-entry-customer">${order.customerName}</span>
          <span class="register-entry-total">₦${order.total}</span>
        </div>
        <div class="register-entry-items">${itemsSummary}</div>
        <span class="register-entry-status status-${allReady ? 'ready' : 'dropped_off'}">${allReady ? 'All Ready' : 'In Progress'}</span>
      `;
      groupDiv.appendChild(entry);
    });

    registerList.appendChild(groupDiv);
  });
}

registerSearch.addEventListener('input', renderRegister);

// Tapping a register entry opens that customer's full profile
registerList.addEventListener('click', (e) => {
  const entry = e.target.closest('.register-entry');
  if (entry && typeof openCustomerProfile === 'function') {
    openCustomerProfile(entry.getAttribute('data-customer-id'));
  }
});