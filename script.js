const STORAGE_KEYS = {
  settings: 'shebaNowSettings',
  orders: 'shebaNowOrders',
  adminPassword: 'shebaNowAdminPassword'
};

const DEFAULT_SETTINGS = {
  serviceFee: 150,
  paymentMethod: 'bKash Personal',
  paymentNumber: '01700000000',
  paymentMethods: ['bKash Personal', 'Nagad Personal', 'Rocket Personal']
};

function getSettings() {
  const saved = localStorage.getItem(STORAGE_KEYS.settings);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      paymentMethods: Array.isArray(parsed.paymentMethods) && parsed.paymentMethods.length
        ? parsed.paymentMethods
        : DEFAULT_SETTINGS.paymentMethods
    };
  } catch (error) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function getOrders() {
  const saved = localStorage.getItem(STORAGE_KEYS.orders);
  try {
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

function getAdminPassword() {
  return localStorage.getItem(STORAGE_KEYS.adminPassword) || '1234';
}

function setAdminPassword(newPass) {
  localStorage.setItem(STORAGE_KEYS.adminPassword, newPass);
}

function createOrderId() {
  const orders = getOrders();
  const maxNumber = orders.reduce((highest, order) => {
    const val = Number(String(order.id).replace(/\D/g, '')) || 0;
    return Math.max(highest, val);
  }, 0);
  return `SN-${String(maxNumber + 1).padStart(4, '0')}`;
}

function renderUserOrders() {
  const ordersList = document.getElementById('ordersList');
  if (!ordersList) return;

  const orders = getOrders().slice().reverse();
  if (!orders.length) {
    ordersList.innerHTML = '<div class="empty-state">কোনো বুকিং নেই।</div>';
    return;
  }

  ordersList.innerHTML = orders.map((order) => {
    const statusText = order.status || 'Awaiting Payment';
    const paymentHtml = order.paymentInfo
      ? `<div class="order-payment"><strong>পেমেন্ট:</strong> ${order.paymentInfo.method}<br><strong>TrxID:</strong> ${order.paymentInfo.trxId}</div>`
      : `<div class="order-payment"><strong>সার্ভিস ফি:</strong> ৳${order.serviceFee || getSettings().serviceFee}</div>`;

    const canPay = !order.paymentInfo && (order.status === 'Awaiting Payment' || order.status === 'Pending Confirmation');

    return `
      <div class="order-card">
        <div class="order-card-header">
          <strong>${order.id}</strong>
          <span class="status-badge ${order.status === 'Payment Confirmed. Technician er opekhay' ? 'success' : order.status === 'Pending Confirmation' ? 'warning' : 'neutral'}">${statusText}</span>
        </div>
        <p><strong>সেবা:</strong> ${order.service}</p>
        <p><strong>নাম:</strong> ${order.customerName}</p>
        <p><strong>মোবাইল:</strong> ${order.phone}</p>
        <p><strong>তারিখ:</strong> ${order.bookingDate}</p>
        <p><strong>ঠিকানা:</strong> ${order.address}</p>
        ${paymentHtml}
        <div class="order-actions">
          ${canPay ? `<button class="btn-primary small-btn" data-action="pay" data-order-id="${order.id}">Make Payment</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-action="pay"]').forEach((button) => {
    button.addEventListener('click', () => openPaymentModal(button.dataset.orderId));
  });
}

function renderAdminOrders() {
  const adminTableBody = document.getElementById('adminOrderTableBody');
  if (!adminTableBody) return;

  const orders = getOrders().slice().reverse();
  if (!orders.length) {
    adminTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">কোনো অর্ডার নেই।</td></tr>';
    return;
  }

  adminTableBody.innerHTML = orders.map((order) => {
    const paymentInfo = order.paymentInfo
      ? `<strong>মাধ্যম:</strong> ${order.paymentInfo.method}<br><strong>নম্বর:</strong> ${order.paymentInfo.senderPhone}<br><strong>TrxID:</strong> ${order.paymentInfo.trxId}`
      : `<strong>ফি:</strong> ৳${order.serviceFee || getSettings().serviceFee}<br><span class="muted">পেমেন্টের অপেক্ষায়</span>`;

    const confirmButton = order.status === 'Pending Confirmation'
      ? `<button class="btn-primary small-btn" data-confirm-order="${order.id}" type="button">Confirm Payment</button>`
      : '';

    const statusClass = order.status === 'Payment Confirmed. Technician er opekhay' ? 'success' : 'warning';

    return `
      <tr>
        <td><strong>${order.id}</strong><br>${order.bookingDate}</td>
        <td><strong>${order.customerName}</strong><br>${order.phone}</td>
        <td><strong>${order.service}</strong><br>${order.problem}</td>
        <td>${paymentInfo}</td>
        <td><span class="status-badge ${statusClass}">${order.status || 'Awaiting Payment'}</span></td>
        <td>${confirmButton}</td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('[data-confirm-order]').forEach((button) => {
    button.addEventListener('click', () => confirmOrder(button.dataset.confirmOrder));
  });
}

function openPaymentModal(orderId) {
  const settings = getSettings();
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) return;

  const paymentSelect = document.getElementById('selectedGateway');
  const paymentInstructions = document.getElementById('paymentInstructionsBox');
  const paymentIdInput = document.getElementById('payOrderId');

  renderPaymentOptions();
  paymentIdInput.value = order.id;
  document.getElementById('payUserName').value = order.customerName || '';
  document.getElementById('payUserPhone').value = order.phone || '';

  const selectedMethod = settings.paymentMethod || settings.paymentMethods[0];
  paymentSelect.value = selectedMethod;
  paymentInstructions.innerHTML = `
    <strong>সার্ভিস:</strong> ${order.service}<br>
    <strong>সার্ভিস ফি:</strong> ৳${settings.serviceFee}<br>
    <strong>পেমেন্ট মাধ্যম:</strong> ${selectedMethod}<br>
    <strong>নম্বর:</strong> ${settings.paymentNumber}
  `;

  showModal('paymentModal');
}

function renderPaymentOptions() {
  const paymentSelect = document.getElementById('selectedGateway');
  if (!paymentSelect) return;

  const settings = getSettings();
  const options = settings.paymentMethods && settings.paymentMethods.length ? settings.paymentMethods : DEFAULT_SETTINGS.paymentMethods;
  paymentSelect.innerHTML = options.map((method) => `<option value="${method}">${method}</option>`).join('');
  paymentSelect.value = settings.paymentMethod || options[0];
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

function createBooking(orderData) {
  const settings = getSettings();
  const orders = getOrders();
  const newOrder = {
    id: createOrderId(),
    service: orderData.service,
    customerName: orderData.customerName,
    phone: orderData.phone,
    address: orderData.address,
    problem: orderData.problem,
    bookingDate: orderData.bookingDate,
    images: orderData.images || [],
    serviceFee: settings.serviceFee,
    status: 'Awaiting Payment',
    paymentInfo: null,
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  saveOrders(orders);
  renderUserOrders();
  renderAdminOrders();
  return newOrder;
}

function submitPayment() {
  const paymentOrderId = document.getElementById('payOrderId').value;
  const name = document.getElementById('payUserName').value.trim();
  const phone = document.getElementById('payUserPhone').value.trim();
  const method = document.getElementById('selectedGateway').value;
  const senderPhone = document.getElementById('senderPhone').value.trim();
  const trxId = document.getElementById('clientTrxId').value.trim();

  if (!paymentOrderId || !name || !phone || !method || !senderPhone || !trxId) {
    alert('সব ফিল্ড পূরণ করুন।');
    return;
  }

  const settings = getSettings();
  const orders = getOrders();
  const order = orders.find((item) => item.id === paymentOrderId);

  if (!order) {
    alert('অর্ডার খুঁজে পাওয়া যায়নি।');
    return;
  }

  order.paymentInfo = {
    name,
    phone,
    method,
    senderPhone,
    trxId,
    submittedAt: new Date().toISOString()
  };
  order.status = 'Pending Confirmation';
  order.serviceFee = settings.serviceFee;

  saveOrders(orders);
  hideModal('paymentModal');
  document.getElementById('userPaymentForm').reset();
  renderUserOrders();
  renderAdminOrders();
  alert('পেমেন্ট তথ্য সাবমিট হয়েছে। অ্যাডমিন কনফার্ম করার অপেক্ষায় আছে।');
}

function confirmOrder(orderId) {
  const orders = getOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return;

  order.status = 'Payment Confirmed. Technician er opekhay';
  saveOrders(orders);
  renderUserOrders();
  renderAdminOrders();
  alert('পেমেন্ট কনফার্ম করা হয়েছে।');
}

function initializeUserPage() {
  const orderButtons = document.querySelectorAll('.btn-order');
  const searchBtn = document.getElementById('searchBtn');
  const myOrdersBtn = document.getElementById('myOrdersBtn');
  const bookingModal = document.getElementById('bookingModal');
  const paymentModal = document.getElementById('paymentModal');
  const ordersModal = document.getElementById('ordersModal');
  const orderForm = document.getElementById('orderForm');
  const userPaymentForm = document.getElementById('userPaymentForm');

  if (!orderButtons.length) return;

  orderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const serviceName = button.dataset.service;
      document.getElementById('selectedService').value = serviceName;
      document.getElementById('displayServiceName').textContent = serviceName + ' বুকিং ফর্ম';
      showModal('bookingModal');
    });
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => hideModal(button.dataset.close));
  });

  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const selectedService = document.getElementById('selectedService').value;
    const customerName = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const address = document.getElementById('clientAddress').value.trim();
    const problem = document.getElementById('problemDescription').value.trim();
    const bookingDate = document.getElementById('bookingDate').value;

    if (!selectedService || !customerName || !phone || !address || !problem || !bookingDate) {
      alert('সব ফিল্ড পূরণ করুন।');
      return;
    }

    const files = document.getElementById('problemImages').files;
    const imageUrls = Array.from(files).slice(0, 3).map((file) => URL.createObjectURL(file));

    createBooking({
      service: selectedService,
      customerName,
      phone,
      address,
      problem,
      bookingDate,
      images: imageUrls
    });

    orderForm.reset();
    document.getElementById('imagePreviewContainer').innerHTML = '';
    hideModal('bookingModal');
    alert('আপনার বুকিং সফল হয়েছে। এখন Make Payment বাটনে ক্লিক করে পেমেন্ট দিন।');
  });

  userPaymentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitPayment();
  });

  myOrdersBtn.addEventListener('click', () => {
    renderUserOrders();
    showModal('ordersModal');
  });

  searchBtn.addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const cards = document.querySelectorAll('.service-card');

    cards.forEach((card) => {
      const serviceName = card.dataset.name.toLowerCase();
      card.style.display = serviceName.includes(query) ? 'block' : 'none';
    });
  });

  document.getElementById('problemImages').addEventListener('change', function () {
    const preview = document.getElementById('imagePreviewContainer');
    preview.innerHTML = '';

    Array.from(this.files).slice(0, 3).forEach((file) => {
      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      image.alt = 'preview';
      image.className = 'preview-image';
      preview.appendChild(image);
    });
  });

  window.addEventListener('click', (event) => {
    if (event.target === bookingModal) hideModal('bookingModal');
    if (event.target === paymentModal) hideModal('paymentModal');
    if (event.target === ordersModal) hideModal('ordersModal');
  });

  renderUserOrders();
  renderPaymentOptions();
}

function initializeAdminPage() {
  const adminLoginBox = document.getElementById('adminLoginBox');
  const adminDashboard = document.getElementById('adminDashboard');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const settingsForm = document.getElementById('settingsForm');
  const changePassForm = document.getElementById('changePassForm');
  const adminPasswordModal = document.getElementById('adminPasswordModal');
  const logoutAdminBtn = document.getElementById('logoutAdminBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  if (!adminLoginForm) return;

  const syncAdminSettings = () => {
    const settings = getSettings();
    document.getElementById('serviceFeeInput').value = settings.serviceFee;
    document.getElementById('paymentMethodInput').value = settings.paymentMethod;
    document.getElementById('paymentNumberInput').value = settings.paymentNumber;
    renderAdminOrders();
  };

  if (sessionStorage.getItem('shebaNowAdminLoggedIn') === 'true') {
    adminLoginBox.style.display = 'none';
    adminDashboard.style.display = 'block';
    syncAdminSettings();
  }

  adminLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userName = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();

    if (userName === 'admin' && pass === getAdminPassword()) {
      sessionStorage.setItem('shebaNowAdminLoggedIn', 'true');
      adminLoginBox.style.display = 'none';
      adminDashboard.style.display = 'block';
      syncAdminSettings();
    } else {
      alert('ভুল ইউজারনেম বা পাসওয়ার্ড!');
    }
  });

  openSettingsBtn.addEventListener('click', () => {
    adminPasswordModal.style.display = 'flex';
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => hideModal(button.dataset.close));
  });

  changePassForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const currentPass = document.getElementById('currentPassInput').value.trim();
    const newPass = document.getElementById('newPassInput').value.trim();

    if (currentPass !== getAdminPassword()) {
      alert('বর্তমান পাসওয়ার্ড সঠিক নয়।');
      return;
    }

    if (!newPass || newPass.length < 4) {
      alert('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }

    setAdminPassword(newPass);
    alert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।');
    hideModal('adminPasswordModal');
    changePassForm.reset();
  });

  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const fee = Number(document.getElementById('serviceFeeInput').value);
    const method = document.getElementById('paymentMethodInput').value;
    const number = document.getElementById('paymentNumberInput').value.trim();

    if (!fee || fee < 0) {
      alert('সার্ভিস ফি সঠিকভাবে লিখুন।');
      return;
    }

    const settings = getSettings();
    settings.serviceFee = fee;
    settings.paymentMethod = method;
    settings.paymentNumber = number;
    saveSettings(settings);

    alert('পেমেন্ট সেটিংস সফলভাবে আপডেট হয়েছে।');
    renderAdminOrders();
    renderUserOrders();
  });

  logoutAdminBtn.addEventListener('click', () => {
    sessionStorage.removeItem('shebaNowAdminLoggedIn');
    window.location.href = 'index.html';
  });

  window.addEventListener('click', (event) => {
    if (event.target === adminPasswordModal) {
      hideModal('adminPasswordModal');
    }
  });

  renderAdminOrders();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'admin') {
    initializeAdminPage();
  } else {
    initializeUserPage();
  }
});