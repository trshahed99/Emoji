// ============================================================
//  STATE
// ============================================================
let editor = null;
let currentProject = null;
let currentFile = null;
let filesCache = {}; // for deploy

// ============================================================
//  MONACO EDITOR
// ============================================================
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
    value: '# Select a file from the tree 🗂\n',
    language: 'python',
    theme: 'neon',
    fontSize: 14,
    automaticLayout: true,
    minimap: { enabled: false },
  });
});

// ============================================================
//  UPLOAD HANDLERS
// ============================================================
const uploadZone = document.getElementById('uploadZone');
const zipInput = document.getElementById('zipInput');
const folderInput = document.getElementById('folderInput');
const uploadStatus = document.getElementById('uploadStatus');
const mainFileSelect = document.getElementById('mainFileSelect');

['dragenter', 'dragover'].forEach(ev =>
  uploadZone.addEventListener(ev, e => { e.preventDefault(); uploadZone.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach(ev =>
  uploadZone.addEventListener(ev, e => { e.preventDefault(); uploadZone.classList.remove('dragover'); })
);

uploadZone.addEventListener('drop', async e => {
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.zip')) await handleZip(file);
});

zipInput.addEventListener('change', async e => {
  if (e.target.files[0]) await handleZip(e.target.files[0]);
});

folderInput.addEventListener('change', async e => {
  filesCache = {};
  for (const f of e.target.files) {
    const path = f.webkitRelativePath || f.name;
    filesCache[path] = await f.text();
  }
  updateStatusAndMainFiles();
});

async function handleZip(file) {
  uploadStatus.textContent = `⏳ Extracting ${file.name}...`;
  const zip = await JSZip.loadAsync(file);
  filesCache = {};
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir) filesCache[path] = await entry.async('string');
  }
  updateStatusAndMainFiles();
}

function updateStatusAndMainFiles() {
  const paths = Object.keys(filesCache);
  uploadStatus.textContent = `✅ ${paths.length} files loaded`;

  mainFileSelect.innerHTML = '<option value="">Auto-detect main file</option>';
  paths.filter(p => p.endsWith('.py')).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    mainFileSelect.appendChild(opt);
  });
}

// ============================================================
//  DEPLOY
// ============================================================
document.getElementById('deployBtn').onclick = async () => {
  const name = document.getElementById('projectName').value.trim();
  if (!name) return alert('Enter a project name');
  if (Object.keys(filesCache).length === 0) return alert('Upload files first');

  const requirements = document.getElementById('reqInput').value;
  const main_file = mainFileSelect.value;

  const btn = document.getElementById('deployBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Deploying...';

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, files: filesCache, requirements, main_file }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Deploy failed');

    alert(`✅ ${name} deployed!\nPort: ${data.port}\nPID: ${data.pid}`);
    filesCache = {};
    uploadStatus.textContent = '';
    document.getElementById('projectName').value = '';
    document.getElementById('reqInput').value = '';
    mainFileSelect.innerHTML = '<option value="">Auto-detect main file</option>';
    loadProjects();
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Deploy';
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
    list.innerHTML = '<p class="empty">No projects deployed yet.</p>';
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
          &nbsp;·&nbsp; ${p.main_file}
        </div>
      </div>
      <div class="actions">
        <button class="neon-btn small" data-act="open" data-name="${p.name}">📝 Open</button>
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
//  WORKSPACE
// ============================================================
async function openProject(name) {
  currentProject = name;
  document.getElementById('workspace').style.display = 'block';
  document.getElementById('wsTitle').textContent = `📁 ${name}`;

  const res = await fetch(`/api/project/${name}`);
  const data = await res.json();
  if (!res.ok) return alert('Failed to load project');

  // File tree
  const tree = document.getElementById('fileTree');
  tree.innerHTML = '';
  data.files.forEach(f => {
    const li = document.createElement('li');
    li.textContent = f.path;
    if (f.is_main) li.classList.add('main-file');
    li.dataset.path = f.path;
    li.onclick = () => loadFile(name, f.path);
    tree.appendChild(li);
  });

  refreshLogs();
  window.scrollTo({ top: document.getElementById('workspace').offsetTop - 20, behavior: 'smooth' });
}

async function loadFile(name, path) {
  currentFile = path;
  document.querySelectorAll('#fileTree li').forEach(li => {
    li.classList.toggle('active', li.dataset.path === path);
  });
  document.getElementById('currentFile').textContent = path;

  const res = await fetch(`/api/project/${name}/file?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (!res.ok) {
    editor.setValue(`// ${data.detail || 'Cannot load file'}`);
    return;
  }

  editor.setValue(data.content);
  const ext = path.split('.').pop();
  const langMap = { py: 'python', js: 'javascript', html: 'html', css: 'css', json: 'json', txt: 'plaintext', md: 'markdown', env: 'plaintext' };
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

    if (data.restarted) {
      alert(`✅ Saved & restarted on port ${data.port}`);
    } else {
      alert('✅ Saved (project not running)');
    }
    loadProjects();
    refreshLogs();
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save & Restart';
  }
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
  if (!res.ok) return alert(data.detail || 'Delete failed');

  alert('🗑 Deleted');
  currentFile = null;
  editor.setValue('');
  document.getElementById('currentFile').textContent = '—';
  openProject(currentProject);
};

// ============================================================
//  PROJECT CONTROLS
// ============================================================
document.getElementById('wsStart').onclick = async () => {
  const res = await fetch(`/api/project/${currentProject}/start`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return alert(data.detail);
  alert(`▶️ Started on port ${data.port}`);
  loadProjects();
};

document.getElementById('wsStop').onclick = async () => {
  await fetch(`/api/project/${currentProject}/stop`, { method: 'POST' });
  alert('⏸ Stopped');
  loadProjects();
};

document.getElementById('wsRestart').onclick = async () => {
  const res = await fetch(`/api/project/${currentProject}/restart`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return alert(data.detail);
  alert(`🔄 Restarted on port ${data.port}`);
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
  editor.setValue('# Select a file from the tree 🗂\n');
}

// ============================================================
//  LOGS
// ============================================================
async function refreshLogs() {
  if (!currentProject) return;
  const res = await fetch(`/api/project/${currentProject}/logs?lines=200`);
  const data = await res.json();
  const consoleEl = document.getElementById('console');
  consoleEl.textContent = data.logs || '(empty log)';
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
