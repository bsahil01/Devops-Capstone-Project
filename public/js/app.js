/**
 * Cloud-Native Employee Management Portal - Client Application
 */

const state = {
  token: localStorage.getItem('devops_token') || null,
  user: JSON.parse(localStorage.getItem('devops_user') || 'null'),
  employees: [],
  selectedEmployee: null,
  deleteTargetId: null,
};

// DOM Elements
const systemStatusBadge = document.getElementById('systemStatusBadge');
const systemStatusText = document.getElementById('systemStatusText');
const authSection = document.getElementById('authSection');
const unauthSection = document.getElementById('unauthSection');
const userNameDisplay = document.getElementById('userNameDisplay');
const userRoleBadge = document.getElementById('userRoleBadge');
const userAvatar = document.getElementById('userAvatar');
const openLoginBtn = document.getElementById('openLoginBtn');
const openRegisterBtn = document.getElementById('openRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Modals
const employeeModal = document.getElementById('employeeModal');
const employeeModalTitle = document.getElementById('employeeModalTitle');
const employeeForm = document.getElementById('employeeForm');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeEmployeeModalBtn = document.getElementById('closeEmployeeModalBtn');
const cancelEmployeeBtn = document.getElementById('cancelEmployeeBtn');

const authModal = document.getElementById('authModal');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const loginTabBtn = document.getElementById('loginTabBtn');
const registerTabBtn = document.getElementById('registerTabBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');

const deleteModal = document.getElementById('deleteModal');
const deleteConfirmText = document.getElementById('deleteConfirmText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Filters & Table
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const deptFilter = document.getElementById('deptFilter');
const statusFilter = document.getElementById('statusFilter');
const sortBySelect = document.getElementById('sortBySelect');
const refreshBtn = document.getElementById('refreshBtn');
const employeesTableBody = document.getElementById('employeesTableBody');
const emptyState = document.getElementById('emptyState');
const recordCountText = document.getElementById('recordCountText');

// Stats Elements
const statTotalEmployees = document.getElementById('statTotalEmployees');
const statActiveEmployees = document.getElementById('statActiveEmployees');
const statAvgSalary = document.getElementById('statAvgSalary');
const statPayroll = document.getElementById('statPayroll');

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

// Format Currency
function formatCurrency(num) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num || 0);
}

// Health Check API
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const dot = systemStatusBadge.querySelector('.status-dot');
    if (res.ok && data.status === 'UP') {
      dot.className = 'status-dot online';
      systemStatusText.textContent = `Status: Healthy (${data.database.type})`;
    } else {
      dot.className = 'status-dot offline';
      systemStatusText.textContent = 'Status: Degraded';
    }
  } catch (err) {
    const dot = systemStatusBadge.querySelector('.status-dot');
    dot.className = 'status-dot offline';
    systemStatusText.textContent = 'Status: Disconnected';
  }
}

// Fetch Metrics Summary
async function loadSummaryStats() {
  try {
    const res = await fetch('/api/employees/stats');
    if (res.ok) {
      const { data } = await res.json();
      statTotalEmployees.textContent = data.totalEmployees;
      statActiveEmployees.textContent = data.activeEmployees;
      statAvgSalary.textContent = formatCurrency(data.averageSalary);
      statPayroll.textContent = formatCurrency(data.totalPayroll / 12);
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// Fetch Employees with filters
async function loadEmployees() {
  employeesTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-8">Loading employees...</td>
    </tr>
  `;

  const search = searchInput.value.trim();
  const department = deptFilter.value;
  const status = statusFilter.value;
  const [sortField, sortOrder] = sortBySelect.value.split('-');

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (department && department !== 'All') params.append('department', department);
  if (status && status !== 'All') params.append('status', status);
  if (sortField) params.append('sort', sortField);
  if (sortOrder) params.append('order', sortOrder);

  try {
    const res = await fetch(`/api/employees?${params.toString()}`);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch employees');
    }

    state.employees = json.data || [];
    renderEmployeesTable(state.employees);
    recordCountText.textContent = `Showing ${state.employees.length} of ${json.pagination?.total || state.employees.length} records`;
    loadSummaryStats();
  } catch (err) {
    employeesTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8" style="color: var(--danger)">
          Error loading records: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
    showToast(err.message, 'error');
  }
}

// Render Table
function renderEmployeesTable(employees) {
  if (employees.length === 0) {
    employeesTableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  employeesTableBody.innerHTML = employees.map(emp => {
    const statusClass = emp.status.toLowerCase().replace(' ', '-');
    return `
      <tr>
        <td><strong>#${emp.id}</strong></td>
        <td>
          <span class="emp-name">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</span>
          <span class="emp-email">${escapeHtml(emp.email)}</span>
        </td>
        <td><span class="dept-badge">${escapeHtml(emp.department)}</span></td>
        <td>${escapeHtml(emp.role)}</td>
        <td class="salary-cell">${formatCurrency(emp.salary)}</td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="status-dot ${statusClass === 'active' ? 'online' : ''}"></span>
            ${escapeHtml(emp.status)}
          </span>
        </td>
        <td>${escapeHtml(emp.hire_date || '-')}</td>
        <td class="text-right">
          <div class="actions-cell">
            <button class="btn-icon edit-btn" data-id="${emp.id}" title="Edit employee">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon delete-btn" data-id="${emp.id}" title="Delete employee">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button event handlers
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
}

// Modal Handlers: Add & Edit
function openAddModal() {
  state.selectedEmployee = null;
  employeeModalTitle.textContent = 'Add New Employee';
  employeeForm.reset();
  document.getElementById('employeeIdInput').value = '';
  document.getElementById('hireDateInput').value = new Date().toISOString().split('T')[0];
  employeeModal.classList.remove('hidden');
}

function openEditModal(id) {
  const emp = state.employees.find(e => `${e.id}` === `${id}`);
  if (!emp) return;

  state.selectedEmployee = emp;
  employeeModalTitle.textContent = `Edit Employee #${emp.id}`;
  document.getElementById('employeeIdInput').value = emp.id;
  document.getElementById('firstNameInput').value = emp.first_name;
  document.getElementById('lastNameInput').value = emp.last_name;
  document.getElementById('emailInput').value = emp.email;
  document.getElementById('departmentInput').value = emp.department;
  document.getElementById('roleInput').value = emp.role;
  document.getElementById('salaryInput').value = emp.salary;
  document.getElementById('statusInput').value = emp.status;
  document.getElementById('hireDateInput').value = emp.hire_date || '';

  employeeModal.classList.remove('hidden');
}

function closeEmployeeModal() {
  employeeModal.classList.add('hidden');
}

// Submit Employee (Create or Update)
async function handleEmployeeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('employeeIdInput').value;
  const payload = {
    first_name: document.getElementById('firstNameInput').value.trim(),
    last_name: document.getElementById('lastNameInput').value.trim(),
    email: document.getElementById('emailInput').value.trim(),
    department: document.getElementById('departmentInput').value,
    role: document.getElementById('roleInput').value.trim(),
    salary: parseFloat(document.getElementById('salaryInput').value),
    status: document.getElementById('statusInput').value,
    hire_date: document.getElementById('hireDateInput').value,
  };

  const isEdit = Boolean(id);
  const url = isEdit ? `/api/employees/${id}` : '/api/employees';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Operation failed');
    }

    showToast(isEdit ? 'Employee updated successfully!' : 'Employee created successfully!', 'success');
    closeEmployeeModal();
    loadEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modal Handlers: Delete
function openDeleteModal(id) {
  const emp = state.employees.find(e => `${e.id}` === `${id}`);
  state.deleteTargetId = id;
  deleteConfirmText.textContent = emp
    ? `Are you sure you want to delete ${emp.first_name} ${emp.last_name} (#${emp.id})?`
    : 'Are you sure you want to delete this employee?';
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  state.deleteTargetId = null;
}

async function handleConfirmDelete() {
  if (!state.deleteTargetId) return;

  try {
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch(`/api/employees/${state.deleteTargetId}`, {
      method: 'DELETE',
      headers,
    });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete employee');
    }

    showToast('Employee deleted successfully', 'success');
    closeDeleteModal();
    loadEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modal Handlers: Auth
function openAuthModal(mode = 'login') {
  authModal.classList.remove('hidden');
  if (mode === 'login') {
    loginTabBtn.classList.add('active');
    registerTabBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

// Auth Submit
async function handleLogin(e) {
  e.preventDefault();
  const usernameOrEmail = document.getElementById('loginUserInput').value.trim();
  const password = document.getElementById('loginPasswordInput').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Login failed');
    }

    setAuthSession(json.token, json.user);
    showToast(`Welcome back, ${json.user.username}!`, 'success');
    closeAuthModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsernameInput').value.trim();
  const email = document.getElementById('regEmailInput').value.trim();
  const password = document.getElementById('regPasswordInput').value;
  const role = document.getElementById('regRoleInput').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Registration failed');
    }

    setAuthSession(json.token, json.user);
    showToast(`Account created! Logged in as ${json.user.username}`, 'success');
    closeAuthModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setAuthSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('devops_token', token);
  localStorage.setItem('devops_user', JSON.stringify(user));
  updateAuthUI();
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('devops_token');
  localStorage.removeItem('devops_user');
  updateAuthUI();
  showToast('Logged out successfully', 'info');
}

function updateAuthUI() {
  if (state.user) {
    unauthSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    userNameDisplay.textContent = state.user.username;
    userRoleBadge.textContent = state.user.role;
    userAvatar.textContent = (state.user.username[0] || 'U').toUpperCase();
  } else {
    unauthSection.classList.remove('hidden');
    authSection.classList.add('hidden');
  }
}

// Event Listeners
function setupEventListeners() {
  openAddModalBtn.addEventListener('click', openAddModal);
  closeEmployeeModalBtn.addEventListener('click', closeEmployeeModal);
  cancelEmployeeBtn.addEventListener('click', closeEmployeeModal);
  employeeForm.addEventListener('submit', handleEmployeeSubmit);

  openLoginBtn.addEventListener('click', () => openAuthModal('login'));
  openRegisterBtn.addEventListener('click', () => openAuthModal('register'));
  closeAuthModalBtn.addEventListener('click', closeAuthModal);
  cancelLoginBtn.addEventListener('click', closeAuthModal);
  cancelRegisterBtn.addEventListener('click', closeAuthModal);
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);

  loginTabBtn.addEventListener('click', () => openAuthModal('login'));
  registerTabBtn.addEventListener('click', () => openAuthModal('register'));

  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // Search input debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearSearchBtn.classList.toggle('hidden', !searchInput.value);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadEmployees, 300);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    loadEmployees();
  });

  deptFilter.addEventListener('change', loadEmployees);
  statusFilter.addEventListener('change', loadEmployees);
  sortBySelect.addEventListener('change', loadEmployees);
  refreshBtn.addEventListener('click', loadEmployees);

  // Close modals on overlay backdrop click
  [employeeModal, authModal, deleteModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // ESC key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      employeeModal.classList.add('hidden');
      authModal.classList.add('hidden');
      deleteModal.classList.add('hidden');
    }
  });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateAuthUI();
  checkHealth();
  loadEmployees();
  // Poll health every 30 seconds
  setInterval(checkHealth, 30000);
});
