// ============================================================
//  NeonPy Runner — Frontend v4 (FINAL)
// ============================================================

let editor = null;
let currentProject = null;
let currentFile = null;

// ---------- Monaco Editor ----------
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
  monaco.editor.defineTheme('neon', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: '6a7a8a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff00e0' },
      { token: 'string', foreground: '00fff7' },
      { token: 'number', foreground: '9d00ff' },
    ],
    colors: {
      'editor.background': '#05060a',
      'editor.lineHighlightBackground': '#0f1420',
      'editorLineNumber.foreground': '#3a4a5a',
      'editorCursor.foreground': '#00fff7',
      'editor.selectionBackground': '#9d00ff44',
    }
  });

  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '# Click "➕" in Files panel to create a file\n# or select one from the tree\n',
    language: 'python',
    theme: 'neon',
    fontSize: 14,
    automaticLayout: true,
    minimap: { enabled: false },
  });
});

// ============================================================
//  CREATE PROJECT
// ============================================================
document.getElementById('createProjectBtn').onclick = async () => {
  const name = document.getElementById('newProjectName').value.trim();
  if (!name) return alert('Enter a project name');

  const btn = document.getElementById('createProjectBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Creating...';

  try {
    const res = await fetch('/api/project/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Create failed');

    alert(`✅ Project '${name}' created!`);
    document.getElementById('newProjectName').value = '';
    await loadProjects();
    openProject(name);
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '➕ Create Project';
  }
};

// ============================================================
//  PROJECT LIST
// ============================================================
async function loadProjects() {
  const res = await fetch('/api/projects');
  const data = await res.json();
  const list = document.getElementById('projectList');

  if (!data.projects.length) {
    list.innerHTML = '<p class="empty">No projects yet. Create one above 👆</p>';
    return;
  }

  list.innerHTML = '';
  data.projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div>
        <div class="pname">${p.name}</div>
        <div class="pinfo">
          <span class="pstatus ${p.status}">● ${p.status.toUpperCase()}</span>
          &nbsp;·&nbsp; Port: ${p.port || '—'}
          &nbsp;·&nbsp; PID: ${p.pid || '—'}
          &nbsp;·&nbsp; Files: ${p.file_count || 0}
        </div>
      </div>
      <div class="actions">
        <button class="neon-btn small" data-act="open">📝 Open</button>
      </div>
    `;
    card.querySelector('[data-act="open"]').onclick = e => {
      e.stopPropagation();
      openProject(p.name);
    };
    list.appendChild(card);
  });
}

// ============================================================
//  OPEN PROJECT
// ============================================================
async function openProject(name) {
  currentProject = name;
  currentFile = null;
  document.getElementById('workspace').style.display = 'block';
  document.getElementById('wsTitle').textContent = `📁 ${name}`;

  const res = await fetch(`/api/project/${name}`);
  const data = await res.json();
  if (!res.ok) return alert('Failed to load project');

  document.getElementById('startupCommands').value = (data.startup || []).join('\n');
  await loadRequirements(name);
  renderFileTree(data.files);
  refreshLogs();

  window.scrollTo({ top: document.getElementById('workspace').offsetTop - 20, behavior: 'smooth' });
}

function renderFileTree(files) {
  const tree = document.getElementById('fileTree');
  tree.innerHTML = '';

  if (!files || !files.length) {
    tree.innerHTML = '<li class="empty" style="color:#556;cursor:default;">No files. Click ➕ to add.</li>';
    return;
  }

  files.forEach(f => {
    const li = document.createElement('li');
    li.textContent = f.path;
    li.dataset.path = f.path;
    if (f.path === currentFile) li.classList.add('active');
    li.onclick = () => loadFile(currentProject, f.path);
    tree.appendChild(li);
  });
}

// ============================================================
//  LOAD FILE
// ============================================================
async function loadFile(name, path) {
  currentFile = path;
  document.querySelectorAll('#fileTree li').forEach(li => {
    li.classList.toggle('active', li.dataset.path === path);
  });
  document.getElementById('currentFile').textContent = path;

  const res = await fetch(`/api/project/${name}/file?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (!res.ok) {
    editor.setValue(`# Cannot load: ${data.detail || 'unknown'}`);
    return;
  }
  editor.setValue(data.content);

  const ext = path.split('.').pop().toLowerCase();
  const langMap = {
    py: 'python', js: 'javascript', html: 'html', css: 'css',
    json: 'json', txt: 'plaintext', md: 'markdown', env: 'plaintext',
    yaml: 'yaml', yml: 'yaml', sh: 'shell', bash: 'shell',
    c: 'c', cpp: 'cpp', java: 'java', go: 'go', rs: 'rust',
    xml: 'xml', sql: 'sql', toml: 'ini', ini: 'ini', cfg: 'ini',
  };
  monaco.editor.setModelLanguage(editor.getModel(), langMap[ext] || 'plaintext');
}

// ============================================================
//  SAVE FILE
// ============================================================
document.getElementById('saveBtn').onclick = async () => {
  if (!currentProject || !currentFile) return alert('No file selected');
  const content = editor.getValue();

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Saving...';

  try {
    const res = await fetch(`/api/project/${currentProject}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentProject, path: currentFile, content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Save failed');
    alert('✅ Saved!');
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save File';
  }
};

// ============================================================
//  NEW FILE
// ============================================================
document.getElementById('newFileBtn').onclick = async () => {
  if (!currentProject) return alert('Open a project first');
  const path = prompt('File name (e.g., main.py, config.json, .env):');
  if (!path) return;

  const res = await fetch(`/api/project/${currentProject}/create-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentProject, path }),
  });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Create failed'));

  await openProject(currentProject);
  loadFile(currentProject, path);
};

// ============================================================
//  RENAME FILE
// ============================================================
document.getElementById('renameBtn').onclick = async () => {
  if (!currentProject || !currentFile) return alert('No file selected');
  const newPath = prompt('New name:', currentFile);
  if (!newPath || newPath === currentFile) return;

  const res = await fetch(`/api/project/${currentProject}/rename-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentProject, old_path: currentFile, new_path: newPath }),
  });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Rename failed'));

  currentFile = newPath;
  await openProject(currentProject);
  loadFile(currentProject, newPath);
};

// ============================================================
//  DELETE FILE
// ============================================================
document.getElementById('deleteFileBtn').onclick = async () => {
  if (!currentProject || !currentFile) return alert('No file selected');
  if (!confirm(`Delete ${currentFile}?`)) return;

  const res = await fetch(`/api/project/${currentProject}/delete-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentProject, path: currentFile }),
  });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Delete failed'));

  currentFile = null;
  editor.setValue('');
  document.getElementById('currentFile').textContent = '— no file selected —';
  await openProject(currentProject);
};

// ============================================================
//  STARTUP COMMANDS
// ============================================================
document.getElementById('saveStartupBtn').onclick = async () => {
  if (!currentProject) return;
  const raw = document.getElementById('startupCommands').value;
  const cmds = raw.split('\n').map(s => s.trim()).filter(Boolean);

  const res = await fetch(`/api/project/${currentProject}/startup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentProject, startup: cmds }),
  });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Save failed'));
  alert('✅ Startup commands saved!');
};

// ============================================================
//  PACKAGES
// ============================================================
async function loadRequirements(name) {
  const res = await fetch(`/api/project/${name}/requirements`);
  const data = await res.json();
  document.getElementById('reqTextarea').value = data.content || '';
}

document.getElementById('saveReqBtn').onclick = async () => {
  if (!currentProject) return alert('Open a project first');
  const content = document.getElementById('reqTextarea').value;

  const res = await fetch(`/api/project/${currentProject}/requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentProject, content }),
  });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Save failed'));
  alert('✅ requirements.txt saved!');
};

document.getElementById('installReqBtn').onclick = async () => {
  if (!currentProject) return alert('Open a project first');

  const btn = document.getElementById('installReqBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Installing...';

  try {
    const res = await fetch(`/api/project/${currentProject}/install`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.ok) {
      alert('✅ Installation complete!');
    } else {
      alert('❌ Install failed:\n\n' + (data.msg || 'unknown'));
    }
    refreshLogs();
  } catch (err) {
    alert('❌ Network error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📦 Install Now';
  }
};

document.getElementById('clearReqBtn').onclick = () => {
  if (!confirm('Clear requirements.txt content?')) return;
  document.getElementById('reqTextarea').value = '';
};

// ============================================================
//  START / STOP / RESTART / DELETE
// ============================================================
document.getElementById('wsStart').onclick = async () => {
  const res = await fetch(`/api/project/${currentProject}/start`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Start failed'));
  alert(`▶️ Started!\nPort: ${data.port}\nPIDs: ${(data.pids || []).join(', ')}`);
  loadProjects();
  refreshLogs();
};

document.getElementById('wsStop').onclick = async () => {
  await fetch(`/api/project/${currentProject}/stop`, { method: 'POST' });
  alert('⏸ Stopped');
  loadProjects();
};

document.getElementById('wsRestart').onclick = async () => {
  const res = await fetch(`/api/project/${currentProject}/restart`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return alert('❌ ' + (data.detail || 'Restart failed'));
  alert(`🔄 Restarted!\nPort: ${data.port}`);
  loadProjects();
  refreshLogs();
};

document.getElementById('wsDelete').onclick = async () => {
  if (!confirm(`Delete project ${currentProject} permanently?`)) return;
  await fetch(`/api/project/${currentProject}`, { method: 'DELETE' });
  closeWorkspace();
  loadProjects();
};

document.getElementById('wsClose').onclick = closeWorkspace;

function closeWorkspace() {
  document.getElementById('workspace').style.display = 'none';
  currentProject = null;
  currentFile = null;
  editor.setValue('# Click "➕" to create a file\n');
}

// ============================================================
//  LOGS
// ============================================================
async function refreshLogs() {
  if (!currentProject) return;
  const res = await fetch(`/api/project/${currentProject}/logs?lines=300`);
  const data = await res.json();
  const consoleEl = document.getElementById('console');
  consoleEl.textContent = data.logs || '(empty)';
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

document.getElementById('refreshLogs').onclick = refreshLogs;

document.getElementById('clearLogs').onclick = async () => {
  if (!currentProject) return;
  await fetch(`/api/project/${currentProject}/clear-logs`, { method: 'POST' });
  refreshLogs();
};

// ============================================================
//  INIT
// ============================================================
loadProjects();
setInterval(() => { if (currentProject) refreshLogs(); }, 5000);
