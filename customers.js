const customerSearch = document.getElementById('customerSearch');
const customerList = document.getElementById('customerList');
const newCustomerBtn = document.getElementById('newCustomerBtn');
const newCustomerModal = document.getElementById('newCustomerModal');
const closeNewCustomer = document.getElementById('closeNewCustomer');
const newCustomerName = document.getElementById('newCustomerName');
const newCustomerPhone = document.getElementById('newCustomerPhone');
const newCustomerEmail = document.getElementById('newCustomerEmail');
const saveNewCustomerBtn = document.getElementById('saveNewCustomerBtn');

const customerProfileView = document.getElementById('customerProfileView');
const profileBackBtn = document.getElementById('profileBackBtn');
const profileName = document.getElementById('profileName');
const profilePhone = document.getElementById('profilePhone');
const profileDeleteCustomerBtn = document.getElementById('profileDeleteCustomerBtn');
const orderHistoryList = document.getElementById('orderHistoryList');
const addOrderBtn = document.getElementById('addOrderBtn');

const addOrderModal = document.getElementById('addOrderModal');
const closeAddOrder = document.getElementById('closeAddOrder');
const orderItemsContainer = document.getElementById('orderItemsContainer');
const addItemRowBtn = document.getElementById('addItemRowBtn');
const orderTotalDisplay = document.getElementById('orderTotalDisplay');
const saveOrderBtn = document.getElementById('saveOrderBtn');

const deleteRequestsList = document.getElementById('deleteRequestsList');

let allCustomers = [];
let currentCustomerId = null;
let itemRowCount = 0;

const STATUS_STAGES = ['dropped_off', 'washed', 'dried', 'ironed', 'ready'];
const STATUS_LABELS = {
  dropped_off: 'Dropped Off',
  washed: 'Washed',
  dried: 'Dried',
  ironed: 'Ironed',
  ready: 'Ready'
};

function isDirector() {
  return !!window.currentUserIsDirector;
}

// ===== Customer list =====
function startListeningToCustomers() {
  db.collection('customers').orderBy('name').onSnapshot((snapshot) => {
    allCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCustomerList();
  });
}

function renderCustomerList() {
  const term = customerSearch.value.toLowerCase().trim();
  const filtered = allCustomers.filter(c => c.name.toLowerCase().includes(term));

  if (filtered.length === 0) {
    customerList.innerHTML = `<p class="placeholder-text">${allCustomers.length === 0 ? 'No customers yet — add your first one above' : 'No customers match your search'}</p>`;
    return;
  }

  customerList.innerHTML = '';
  filtered.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'customer-card';
    card.setAttribute('data-id', c.id);
    card.innerHTML = `
      <div class="customer-card-info">
        <strong>${c.name}</strong>
        <span>${c.phone || 'No phone on file'}</span>
      </div>
      <span class="customer-card-arrow material-symbols-rounded">chevron_right</span>
    `;
    customerList.appendChild(card);
  });
}

customerSearch.addEventListener('input', renderCustomerList);

newCustomerBtn.addEventListener('click', () => {
  newCustomerModal.style.display = 'flex';
});

closeNewCustomer.addEventListener('click', () => {
  newCustomerModal.style.display = 'none';
  newCustomerName.value = '';
  newCustomerPhone.value = '';
  newCustomerEmail.value = '';
});

newCustomerModal.addEventListener('click', (e) => {
  if (e.target === newCustomerModal) newCustomerModal.style.display = 'none';
});

saveNewCustomerBtn.addEventListener('click', () => {
  const name = newCustomerName.value.trim();
  const phone = newCustomerPhone.value.trim();
  const email = newCustomerEmail.value.trim();

  if (!name) {
    alert('Please enter a customer name.');
    return;
  }

  db.collection('customers').add({
    name: name,
    phone: phone,
    email: email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: auth.currentUser ? auth.currentUser.email : 'unknown'
  }).then(() => {
    newCustomerModal.style.display = 'none';
    newCustomerName.value = '';
    newCustomerPhone.value = '';
    newCustomerEmail.value = '';
  });
});

customerList.addEventListener('click', (e) => {
  const card = e.target.closest('.customer-card');
  if (card) {
    openCustomerProfile(card.getAttribute('data-id'));
  }
});

// ===== Customer profile =====
function openCustomerProfile(customerId) {
  const c = allCustomers.find(c => c.id === customerId);
  if (!c) return;

  currentCustomerId = customerId;
  profileName.textContent = c.name;
  profilePhone.textContent = [c.phone, c.email].filter(Boolean).join(' • ') || 'No contact info on file';
  customerProfileView.style.display = 'block';

  startListeningToOrders(customerId);
}

profileBackBtn.addEventListener('click', () => {
  customerProfileView.style.display = 'none';
  currentCustomerId = null;
});

profileDeleteCustomerBtn.addEventListener('click', () => {
  const c = allCustomers.find(c => c.id === currentCustomerId);
  if (!c) return;

  if (isDirector()) {
    const confirmed = confirm(`Delete customer "${c.name}" and all their order history? This cannot be undone.`);
    if (confirmed) {
      db.collection('customers').doc(currentCustomerId).delete();
      customerProfileView.style.display = 'none';
    }
  } else {
    requestDelete('customer', currentCustomerId, c.name);
  }
});

function startListeningToOrders(customerId) {
  db.collection('orders')
    .where('customerId', '==', customerId)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      renderOrderHistory(snapshot.docs);
    });
}

function daysSince(timestamp) {
  if (!timestamp || !timestamp.toDate) return null;
  const diff = Date.now() - timestamp.toDate().getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function renderOrderHistory(docs) {
  if (docs.length === 0) {
    orderHistoryList.innerHTML = '<p class="placeholder-text">No orders yet for this customer</p>';
    return;
  }

  orderHistoryList.innerHTML = '';
  docs.forEach((doc) => {
    const order = doc.data();
    const orderId = doc.id;
    const days = daysSince(order.createdAt);
    const dateStr = order.createdAt && order.createdAt.toDate
      ? order.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    const itemsHtml = order.items.map((item, index) => `
      <div class="order-item-row">
        <div>
          <div class="order-item-name">${item.type} × ${item.qty}</div>
          <div class="order-item-price">₦${item.price} each</div>
        </div>
        <select class="status-select status-${item.status}" data-order-id="${orderId}" data-item-index="${index}">
          ${STATUS_STAGES.map(s => `<option value="${s}" ${s === item.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
        </select>
      </div>
    `).join('');

    const allReady = order.items.every(item => item.status === 'ready');
    const overdueBadge = (!allReady && days !== null && days >= 3)
      ? `<div class="days-badge">⚠️ ${days} days since drop-off</div>`
      : '';

    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-card-top">
        <span class="order-date">${dateStr}</span>
        <div class="order-top-right">
          <span class="order-total">₦${order.total}</span>
          <button class="order-delete-btn" data-order-id="${orderId}">
            <span class="material-symbols-rounded">delete</span>
          </button>
        </div>
      </div>
      ${itemsHtml}
      ${overdueBadge}
    `;
    orderHistoryList.appendChild(card);
  });
}

orderHistoryList.addEventListener('change', (e) => {
  if (e.target.classList.contains('status-select')) {
    const orderId = e.target.getAttribute('data-order-id');
    const itemIndex = parseInt(e.target.getAttribute('data-item-index'));
    const newStatus = e.target.value;

    db.collection('orders').doc(orderId).get().then((doc) => {
      const order = doc.data();
      order.items[itemIndex].status = newStatus;
      db.collection('orders').doc(orderId).update({ items: order.items });
    });
  }
});

orderHistoryList.addEventListener('click', (e) => {
  const btn = e.target.closest('.order-delete-btn');
  if (!btn) return;

  const orderId = btn.getAttribute('data-order-id');
  const customer = allCustomers.find(c => c.id === currentCustomerId);
  const label = `Order for ${customer ? customer.name : 'customer'} (${orderId.slice(0, 6)})`;

  if (isDirector()) {
    const confirmed = confirm('Delete this order? This cannot be undone.');
    if (confirmed) {
      db.collection('orders').doc(orderId).delete();
    }
  } else {
    requestDelete('order', orderId, label);
  }
});

// ===== Delete requests (staff-initiated) =====
function requestDelete(type, targetId, targetName) {
  const confirmed = confirm(`Request deletion of ${type === 'customer' ? 'customer' : 'this order'} "${targetName}"? A director will need to approve this.`);
  if (!confirmed) return;

  db.collection('deleteRequests').add({
    type: type,
    targetId: targetId,
    targetName: targetName,
    requestedBy: auth.currentUser ? auth.currentUser.email : 'unknown',
    requestedByName: window.currentUserName || 'Unknown',
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert('Delete request sent to the director.');
  });
}

// ===== Director-only: view + act on delete requests =====
function startListeningToDeleteRequests() {
  db.collection('deleteRequests').where('status', '==', 'pending').onSnapshot((snapshot) => {
    if (snapshot.empty) {
      deleteRequestsList.innerHTML = '<p class="no-pending">No delete requests right now.</p>';
      return;
    }

    deleteRequestsList.innerHTML = '';
    snapshot.docs.forEach((doc) => {
      const r = doc.data();
      const card = document.createElement('div');
      card.className = 'request-card';
      card.innerHTML = `
        <div class="request-card-top">
          <div>
            <div class="request-type">${r.type}</div>
            <div class="request-target">${r.targetName}</div>
            <div class="request-meta">Requested by ${r.requestedByName}</div>
          </div>
        </div>
        <div class="request-actions">
          <button class="request-approve-btn" data-id="${doc.id}" data-type="${r.type}" data-target="${r.targetId}">Approve & Delete</button>
          <button class="request-deny-btn" data-id="${doc.id}">Deny</button>
        </div>
      `;
      deleteRequestsList.appendChild(card);
    });
  });
}

deleteRequestsList.addEventListener('click', (e) => {
  const approveBtn = e.target.closest('.request-approve-btn');
  const denyBtn = e.target.closest('.request-deny-btn');

  if (approveBtn) {
    const requestId = approveBtn.getAttribute('data-id');
    const type = approveBtn.getAttribute('data-type');
    const targetId = approveBtn.getAttribute('data-target');

    const collectionName = type === 'customer' ? 'customers' : 'orders';
    db.collection(collectionName).doc(targetId).delete();
    db.collection('deleteRequests').doc(requestId).update({ status: 'approved' });
  }

  if (denyBtn) {
    const requestId = denyBtn.getAttribute('data-id');
    db.collection('deleteRequests').doc(requestId).update({ status: 'denied' });
  }
});

// ===== Add Order =====
addOrderBtn.addEventListener('click', () => {
  orderItemsContainer.innerHTML = '';
  itemRowCount = 0;
  addItemRow();
  updateOrderTotal();
  addOrderModal.style.display = 'flex';
});

closeAddOrder.addEventListener('click', () => {
  addOrderModal.style.display = 'none';
});

addOrderModal.addEventListener('click', (e) => {
  if (e.target === addOrderModal) addOrderModal.style.display = 'none';
});

function addItemRow() {
  itemRowCount++;
  const row = document.createElement('div');
  row.className = 'order-item-input-row';
  row.innerHTML = `
    <input type="text" class="item-type" placeholder="Item (e.g. Shirt)">
    <input type="number" class="item-qty" placeholder="Qty" value="1" min="1">
    <input type="number" class="item-price" placeholder="Price ₦">
  `;
  orderItemsContainer.appendChild(row);

  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', updateOrderTotal);
  });
}

addItemRowBtn.addEventListener('click', addItemRow);

function updateOrderTotal() {
  let total = 0;
  orderItemsContainer.querySelectorAll('.order-item-input-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    total += qty * price;
  });
  orderTotalDisplay.textContent = `₦${total}`;
}

saveOrderBtn.addEventListener('click', () => {
  const rows = orderItemsContainer.querySelectorAll('.order-item-input-row');
  const items = [];
  let total = 0;

  rows.forEach(row => {
    const type = row.querySelector('.item-type').value.trim();
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;

    if (type && qty > 0 && price >= 0) {
      items.push({ type, qty, price, status: 'dropped_off' });
      total += qty * price;
    }
  });

  if (items.length === 0) {
    alert('Please add at least one valid item.');
    return;
  }

  const customer = allCustomers.find(c => c.id === currentCustomerId);

  db.collection('orders').add({
    customerId: currentCustomerId,
    customerName: customer ? customer.name : '',
    items: items,
    total: total,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: auth.currentUser ? auth.currentUser.email : 'unknown'
  }).then(() => {
    addOrderModal.style.display = 'none';
  });
});