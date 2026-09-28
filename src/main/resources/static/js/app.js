/**
 * ScholarSync Frontend Application
 * Handles authentication, project dashboards, and the 5-column Kanban engine.
 */

const AppState = {
  token: localStorage.getItem('scholarsync_token') || null,
  user: JSON.parse(localStorage.getItem('scholarsync_user')) || null,
  currentProject: null,
  currentTasks: [],
  currentTaskId: null
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
    loadEligibleStudents(AppState.currentProject?.id);
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
    const selectVal = document.getElementById('member-student-select').value;
    const manualVal = document.getElementById('member-student-id').value;
    const studentId = selectVal ? parseInt(selectVal, 10) : (manualVal ? parseInt(manualVal, 10) : null);

    if (!studentId) {
      showToast('Please select or enter a student ID', 'error');
      return;
    }

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

  // Submit Deliverable Form (Submit for Review)
  document.getElementById('form-submit-deliverable').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleDeliverableSubmit(false);
  });

  // Save Deliverable as Draft
  document.getElementById('btn-save-draft').addEventListener('click', async () => {
    await handleDeliverableSubmit(true);
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
    <div class="task-actions" style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;">
      <button class="btn btn-sm btn-outline" style="border-color: rgba(99, 102, 241, 0.4);" onclick="openDeliverables(${task.id})">
        📦 Deliverables
      </button>
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

// ELIGIBLE STUDENTS LOADER
async function loadEligibleStudents(projectId) {
  const select = document.getElementById('member-student-select');
  if (!projectId || !select) return;

  select.innerHTML = '<option value="">-- Loading eligible students... --</option>';

  try {
    const students = await apiCall(`/api/projects/${projectId}/eligible-students`);
    if (!students || students.length === 0) {
      select.innerHTML = '<option value="">-- No other eligible students available --</option>';
      return;
    }

    select.innerHTML = '<option value="">-- Select a registered student --</option>' +
      students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.email)}) [ID: ${s.id}]</option>`).join('');
  } catch (error) {
    select.innerHTML = '<option value="">-- Failed to load eligible students --</option>';
  }
}

// DELIVERABLES / SUBMISSIONS ENGINE
async function openDeliverables(taskId) {
  AppState.currentTaskId = taskId;
  const task = AppState.currentTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('deliv-modal-title').innerText = `Deliverables: ${task.title}`;
  const stateBadge = document.getElementById('deliv-modal-state');
  stateBadge.innerText = task.currentState.replace('_', ' ');
  stateBadge.className = `role-pill ${task.currentState}`;

  document.getElementById('deliv-modal-assignee').innerText = task.assignedStudent
    ? `👤 ${task.assignedStudent.name}`
    : 'Unassigned';

  document.getElementById('modal-deliverables').style.display = 'flex';
  await loadTaskSubmissions(taskId);
}

async function loadTaskSubmissions(taskId) {
  const container = document.getElementById('submissions-list-container');
  container.innerHTML = '<div class="empty-state">Loading deliverables...</div>';

  try {
    const submissions = await apiCall(`/api/tasks/${taskId}/submissions`);
    document.getElementById('deliv-version-count').innerText = `${submissions ? submissions.length : 0} Versions`;
    renderSubmissions(submissions || [], taskId);
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Failed to load deliverables: ${escapeHtml(error.message)}</div>`;
  }
}

function renderSubmissions(submissions, taskId) {
  const container = document.getElementById('submissions-list-container');
  const isSupervisor = AppState.user?.role === 'SUPERVISOR';

  if (!submissions || submissions.length === 0) {
    container.innerHTML = '<div class="empty-state">No deliverables submitted for this task yet. Students can submit deliverables using the form below.</div>';
    return;
  }

  container.innerHTML = submissions.map(sub => {
    const feedbackItemsHtml = (sub.feedbackList && sub.feedbackList.length > 0)
      ? sub.feedbackList.map(f => `
          <div class="feedback-bubble">
            <div class="feedback-meta">
              <strong>${escapeHtml(f.supervisor?.name || 'Supervisor')}</strong> • ${new Date(f.createdAt).toLocaleString()}
            </div>
            <div>${escapeHtml(f.comment)}</div>
          </div>
        `).join('')
      : '<p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.35rem;">No supervisor review feedback yet.</p>';

    const supervisorActionsHtml = isSupervisor ? `
      <div style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 6px;">
        <div style="display: flex; gap: 0.5rem;">
          <input type="text" id="feedback-input-${sub.id}" placeholder="Write supervisor review feedback..." style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.8rem;" />
          <button class="btn btn-sm btn-outline" onclick="addSupervisorFeedback(${sub.id})">Add Feedback</button>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button class="btn btn-sm btn-primary" style="background-color: var(--success);" onclick="updateSubmissionStatus(${sub.id}, 'APPROVED')">✓ Approve Version</button>
          <button class="btn btn-sm btn-danger" onclick="updateSubmissionStatus(${sub.id}, 'REJECTED')">✕ Reject Version</button>
        </div>
      </div>
    ` : '';

    return `
      <div class="submission-card">
        <div class="submission-meta">
          <div>
            <span class="submission-version-pill">${escapeHtml(sub.versionNumber)}</span>
            <strong style="margin-left: 0.5rem; font-size: 0.95rem;">${escapeHtml(sub.title)}</strong>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="status-pill ${sub.status}">${sub.status}</span>
            <button class="btn btn-sm btn-outline" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" onclick="viewSnapshot(${sub.id})">
              📜 Memento Snapshot
            </button>
          </div>
        </div>

        ${sub.description ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${escapeHtml(sub.description)}</p>` : ''}

        ${sub.artifactLocation ? `
          <div class="artifact-box">
            📦 <strong>Artifact:</strong> <a href="${escapeHtml(sub.artifactLocation)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sub.artifactLocation)}</a>
          </div>
        ` : ''}

        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>Submitted by: <strong>${escapeHtml(sub.submittedBy?.name || 'Unknown')}</strong></span>
          <span>${sub.createdAt ? new Date(sub.createdAt).toLocaleString() : ''}</span>
        </div>

        <div class="feedback-thread">
          <strong style="font-size: 0.8rem; color: var(--accent);">Supervisor Feedback & Review Thread:</strong>
          ${feedbackItemsHtml}
          ${supervisorActionsHtml}
        </div>
      </div>
    `;
  }).join('');
}

async function handleDeliverableSubmit(isDraft) {
  if (!AppState.currentTaskId) {
    showToast('No active task selected', 'error');
    return;
  }

  const title = document.getElementById('new-sub-title').value;
  const description = document.getElementById('new-sub-desc').value;
  const artifactLocation = document.getElementById('new-sub-artifact').value;

  if (!title || !title.trim()) {
    showToast('Deliverable title is required', 'error');
    return;
  }

  try {
    const response = await apiCall(`/api/tasks/${AppState.currentTaskId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        description: description ? description.trim() : null,
        artifactLocation: artifactLocation ? artifactLocation.trim() : null,
        draft: isDraft
      })
    });

    document.getElementById('form-submit-deliverable').reset();
    showToast(`Deliverable ${response.versionNumber} submitted successfully!`, 'success');

    await loadTaskSubmissions(AppState.currentTaskId);
    await loadProjectTasks(AppState.currentProject.id);
  } catch {}
}

async function viewSnapshot(submissionId) {
  try {
    const snapshot = await apiCall(`/api/submissions/${submissionId}/snapshot`);
    document.getElementById('snapshot-json-display').textContent = JSON.stringify(snapshot, null, 2);
    document.getElementById('modal-snapshot').style.display = 'flex';
  } catch (error) {
    showToast(`Could not load snapshot: ${error.message}`, 'error');
  }
}

async function addSupervisorFeedback(submissionId) {
  const input = document.getElementById(`feedback-input-${submissionId}`);
  if (!input || !input.value.trim()) {
    showToast('Feedback comment cannot be blank', 'error');
    return;
  }

  try {
    await apiCall(`/api/submissions/${submissionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ comment: input.value.trim() })
    });

    showToast('Review feedback posted!', 'success');
    input.value = '';
    await loadTaskSubmissions(AppState.currentTaskId);
  } catch {}
}

async function updateSubmissionStatus(submissionId, status) {
  try {
    const updated = await apiCall(`/api/submissions/${submissionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    showToast(`Deliverable status updated to ${status}!`, 'success');
    await loadTaskSubmissions(AppState.currentTaskId);
    await loadProjectTasks(AppState.currentProject.id);
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

