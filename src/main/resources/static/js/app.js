/**
 * ScholarSync Frontend Application
 * Handles authentication, project dashboards, and the 5-column Kanban engine.
 */

const AppState = {
  token: localStorage.getItem('scholarsync_token') || null,
  user: JSON.parse(localStorage.getItem('scholarsync_user')) || null,
  currentProject: null,
  currentTasks: []
};

// API HELPER
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (AppState.token) {
    headers['Authorization'] = `Bearer ${AppState.token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

// TOAST NOTIFICATIONS
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// VIEW MANAGEMENT
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(section => {
    section.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = 'block';
  }

  updateNavbar();
}

function updateNavbar() {
  const navPanel = document.getElementById('nav-user-panel');
  if (AppState.token && AppState.user) {
    navPanel.style.display = 'flex';
    document.getElementById('nav-user-name').innerText = AppState.user.name;
    const rolePill = document.getElementById('nav-user-role');
    rolePill.innerText = AppState.user.role;
    rolePill.className = `role-pill ${AppState.user.role}`;
  } else {
    navPanel.style.display = 'none';
  }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();

  if (AppState.token) {
    try {
      const user = await apiCall('/api/auth/me');
      AppState.user = user;
      localStorage.setItem('scholarsync_user', JSON.stringify(user));
      loadDashboard();
    } catch {
      logout();
    }
  } else {
    showView('auth-view');
  }
});

// EVENT LISTENERS
function setupEventListeners() {
  // Auth tabs
  document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('form-login').style.display = 'block';
    document.getElementById('form-register').style.display = 'none';
  });

  document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('form-login').style.display = 'none';
    document.getElementById('form-register').style.display = 'block';
  });

  // Login form
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      AppState.token = data.token;
      AppState.user = data.user;
      localStorage.setItem('scholarsync_token', data.token);
      localStorage.setItem('scholarsync_user', JSON.stringify(data.user));

      showToast(`Signed in as ${data.user.name}`, 'success');
      loadDashboard();
    } catch {}
  });

  // Register form
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    try {
      await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });

      showToast('Registration successful! Please sign in.', 'success');
      document.getElementById('tab-login').click();
      document.getElementById('login-email').value = email;
    } catch {}
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Navigation: Back to Dashboard
  document.getElementById('btn-back-dashboard').addEventListener('click', loadDashboard);

  // Modal open buttons
  document.getElementById('btn-open-create-project').addEventListener('click', () => {
    document.getElementById('modal-create-project').style.display = 'flex';
  });

  document.getElementById('btn-open-create-task').addEventListener('click', () => {
    populateStudentDropdown();
    document.getElementById('modal-create-task').style.display = 'flex';
  });

  document.getElementById('btn-open-add-member').addEventListener('click', () => {
    document.getElementById('modal-add-member').style.display = 'flex';
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      document.getElementById(modalId).style.display = 'none';
    });
  });

  // Create Project Form
  document.getElementById('form-create-project').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('new-proj-title').value;
    const description = document.getElementById('new-proj-desc').value;

    try {
      await apiCall('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title, description })
      });

      document.getElementById('modal-create-project').style.display = 'none';
      document.getElementById('form-create-project').reset();
      showToast('Research project created!', 'success');
      loadDashboard();
    } catch {}
  });

  // Create Task Form
  document.getElementById('form-create-task').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('new-task-title').value;
    const description = document.getElementById('new-task-desc').value;
    const studentVal = document.getElementById('new-task-student').value;
    const assignedStudentId = studentVal ? parseInt(studentVal, 10) : null;

    try {
      await apiCall(`/api/projects/${AppState.currentProject.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title, description, assignedStudentId })
      });

      document.getElementById('modal-create-task').style.display = 'none';
      document.getElementById('form-create-task').reset();
      showToast('Research task created in PROPOSED state!', 'success');
      loadProjectTasks(AppState.currentProject.id);
    } catch {}
  });

  // Add Member Form
  document.getElementById('form-add-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = parseInt(document.getElementById('member-student-id').value, 10);

    try {
      const updatedProject = await apiCall(`/api/projects/${AppState.currentProject.id}/students/${studentId}`, {
        method: 'POST'
      });

      AppState.currentProject = updatedProject;
      document.getElementById('modal-add-member').style.display = 'none';
      document.getElementById('form-add-member').reset();
      showToast('Student successfully assigned to project!', 'success');
      renderProjectHeader(updatedProject);
    } catch {}
  });
}

function logout() {
  AppState.token = null;
  AppState.user = null;
  AppState.currentProject = null;
  AppState.currentTasks = [];
  localStorage.removeItem('scholarsync_token');
  localStorage.removeItem('scholarsync_user');
  showView('auth-view');
  showToast('You have signed out.', 'info');
}

// DASHBOARD
async function loadDashboard() {
  showView('dashboard-view');

  const isSupervisor = AppState.user?.role === 'SUPERVISOR';
  document.getElementById('btn-open-create-project').style.display = isSupervisor ? 'inline-flex' : 'none';

  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '<div class="empty-state">Loading research projects...</div>';

  try {
    const projects = await apiCall('/api/projects');

    if (!projects || projects.length === 0) {
      grid.innerHTML = `<div class="empty-state">No research projects found. ${isSupervisor ? 'Click "+ New Project" above to create one.' : 'You have not been assigned to any research projects yet.'}</div>`;
      return;
    }

    grid.innerHTML = projects.map(proj => `
      <div class="project-card">
        <div>
          <h3>${escapeHtml(proj.title)}</h3>
          <p>${escapeHtml(proj.description || 'No description provided.')}</p>
        </div>
        <div class="project-card-footer">
          <span>Supervisor: <strong>${escapeHtml(proj.supervisor?.name || 'N/A')}</strong></span>
          <span>Students: <strong>${proj.students?.length || 0}</strong></span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="openProject(${proj.id})">Open Project & Kanban →</button>
      </div>
    `).join('');
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">Failed to load projects: ${escapeHtml(error.message)}</div>`;
  }
}

// OPEN PROJECT VIEW
async function openProject(projectId) {
  try {
    const project = await apiCall(`/api/projects/${projectId}`);
    AppState.currentProject = project;
    showView('project-view');
    renderProjectHeader(project);
    await loadProjectTasks(projectId);
  } catch (error) {
    showToast(`Cannot open project: ${error.message}`, 'error');
  }
}

function renderProjectHeader(project) {
  document.getElementById('proj-title').innerText = project.title;
  document.getElementById('proj-desc').innerText = project.description || 'No description provided.';
  document.getElementById('proj-supervisor').innerText = project.supervisor?.name || 'Unknown';

  const isSupervisor = AppState.user?.role === 'SUPERVISOR';
  document.getElementById('btn-open-add-member').style.display = isSupervisor ? 'inline-flex' : 'none';

  const chipsContainer = document.getElementById('proj-members-chips');
  if (project.students && project.students.length > 0) {
    chipsContainer.innerHTML = project.students.map(s => `
      <span class="member-chip">${escapeHtml(s.name)} (ID: ${s.id})</span>
    `).join('');
  } else {
    chipsContainer.innerHTML = '<span class="unassigned-badge">No students enrolled yet</span>';
  }
}

function populateStudentDropdown() {
  const select = document.getElementById('new-task-student');
  select.innerHTML = '<option value="">-- Unassigned --</option>';

  if (AppState.currentProject?.students) {
    AppState.currentProject.students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.email})`;
      select.appendChild(opt);
    });
  }
}

// LOAD TASKS & KANBAN COLUMNS
async function loadProjectTasks(projectId) {
  const states = ['PROPOSED', 'LITERATURE_REVIEW', 'EXPERIMENTATION', 'UNDER_REVIEW', 'APPROVED'];
  states.forEach(state => {
    document.getElementById(`cards-${state}`).innerHTML = '';
    document.getElementById(`count-${state}`).innerText = '0';
  });

  try {
    const tasks = await apiCall(`/api/projects/${projectId}/tasks`);
    AppState.currentTasks = tasks || [];

    const counts = { PROPOSED: 0, LITERATURE_REVIEW: 0, EXPERIMENTATION: 0, UNDER_REVIEW: 0, APPROVED: 0 };

    AppState.currentTasks.forEach(task => {
      if (counts[task.currentState] !== undefined) {
        counts[task.currentState]++;
      }
      renderTaskCard(task);
    });

    states.forEach(state => {
      document.getElementById(`count-${state}`).innerText = counts[state];
    });
  } catch (error) {
    showToast(`Error loading tasks: ${error.message}`, 'error');
  }
}

// RENDER TASK CARD WITH ROLE-AWARE TRANSITIONS
function renderTaskCard(task) {
  const container = document.getElementById(`cards-${task.currentState}`);
  if (!container) return;

  const isSupervisor = AppState.user?.role === 'SUPERVISOR';
  const card = document.createElement('div');
  card.className = 'task-card';

  // Build contextual transition buttons based on State Pattern rules
  let actionButtonsHtml = '';

  switch (task.currentState) {
    case 'PROPOSED':
      actionButtonsHtml = `
        <button class="btn btn-sm btn-primary" onclick="transitionTask(${task.id}, 'LITERATURE_REVIEW')">
          → Start Literature Review
        </button>
      `;
      break;

    case 'LITERATURE_REVIEW':
      actionButtonsHtml = `
        <button class="btn btn-sm btn-primary" onclick="transitionTask(${task.id}, 'EXPERIMENTATION')">
          → Start Experiments
        </button>
        <button class="btn btn-sm btn-outline" onclick="transitionTask(${task.id}, 'PROPOSED')">
          ← Revise Proposal
        </button>
      `;
      break;

    case 'EXPERIMENTATION':
      actionButtonsHtml = `
        <button class="btn btn-sm btn-primary" onclick="transitionTask(${task.id}, 'UNDER_REVIEW')">
          → Submit for Review
        </button>
        <button class="btn btn-sm btn-outline" onclick="transitionTask(${task.id}, 'LITERATURE_REVIEW')">
          ← Revisit Literature
        </button>
      `;
      break;

    case 'UNDER_REVIEW':
      if (isSupervisor) {
        actionButtonsHtml = `
          <button class="btn btn-sm btn-primary" style="background-color: var(--success);" onclick="transitionTask(${task.id}, 'APPROVED')">
            ✓ Approve Task
          </button>
          <button class="btn btn-sm btn-outline" onclick="transitionTask(${task.id}, 'EXPERIMENTATION')">
            ← Request Revisions
          </button>
        `;
      } else {
        actionButtonsHtml = `
          <span class="role-pill" style="background: rgba(234, 179, 8, 0.15); color: var(--warning); border-color: rgba(234, 179, 8, 0.3);">
            Pending Supervisor Approval
          </span>
        `;
      }
      break;

    case 'APPROVED':
      actionButtonsHtml = `
        <span class="role-pill" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border-color: rgba(16, 185, 129, 0.3);">
          ✓ Complete & Approved
        </span>
      `;
      break;
  }

  // Supervisor delete button
  const deleteBtnHtml = isSupervisor ? `
    <button class="btn btn-sm btn-danger" style="margin-left: auto;" onclick="deleteTask(${task.id})">
      ✕
    </button>
  ` : '';

  card.innerHTML = `
    <div class="task-card-title">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>` : ''}
    <div class="task-card-meta">
      ${task.assignedStudent ? `
        <span class="assigned-badge">👤 ${escapeHtml(task.assignedStudent.name)}</span>
      ` : `
        <span class="unassigned-badge">Unassigned</span>
      `}
    </div>
    <div class="task-actions">
      ${actionButtonsHtml}
      ${deleteBtnHtml}
    </div>
  `;

  container.appendChild(card);
}

// TRANSITION TASK HANDLER
async function transitionTask(taskId, targetState) {
  try {
    const updated = await apiCall(`/api/tasks/${taskId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetState })
    });

    showToast(`Task moved to ${targetState.replace('_', ' ')}!`, 'success');
    loadProjectTasks(AppState.currentProject.id);
  } catch {}
}

// DELETE TASK HANDLER
async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this research task?')) return;

  try {
    await apiCall(`/api/tasks/${taskId}`, { method: 'DELETE' });
    showToast('Task deleted successfully.', 'info');
    loadProjectTasks(AppState.currentProject.id);
  } catch {}
}

// HTML ESCAPING
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
