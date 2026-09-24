// ============================================================
//  NeonPy Runner — Frontend v5 (FINAL)
//  With Custom Context Menu (Cut/Copy/Paste/Select All)
//  PC: right-click | Mobile: long-press
// ============================================================

let editor = null;
let currentProject = null;
let currentFile = null;

// ============================================================
//  MONACO EDITOR
// ============================================================
require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
});

require(['vs/editor/editor.main'], function () {

  // ─── Neon Theme ───
  monaco.editor.defineTheme('neon', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a7a8a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff00e0' },
      { token: 'string', foreground: '00fff7' },
      { token: 'number', foreground: '9d00ff' },
      { token: 'function', foreground: '00ff88' },
      { token: 'variable', foreground: 'd8faff' },
    ],
    colors: {
      'editor.background': '#05060a',
      'editor.lineHighlightBackground': '#0f1420',
      'editor.lineHighlightBorder': '#00fff722',
      'editorLineNumber.foreground': '#3a4a5a',
      'editorLineNumber.activeForeground': '#00fff7',
      'editorCursor.foreground': '#00fff7',
      'editor.selectionBackground': '#9d00ff88',
      'editor.inactiveSelectionBackground': '#9d00ff44',
      'editor.selectionHighlightBackground': '#00fff744',
      'editor.wordHighlightBackground': '#ff00e033',
      'editor.wordHighlightStrongBackground': '#ff00e055',
      'editor.findMatchBackground': '#ff00e077',
      'editor.findMatchHighlightBackground': '#ff00e033',
      'editorWidget.background': '#0a0c16',
      'editorWidget.border': '#00fff7',
      'editorWidget.foreground': '#d8faff',
      'menu.background': '#0a0c16',
      'menu.foreground': '#d8faff',
      'menu.selectionBackground': '#00fff744',
      'menu.selectionForeground': '#00fff7',
      'menu.selectionBorder': '#00fff7',
      'menu.border': '#00fff7',
      'menu.separatorBackground': '#00fff733',
    }
  });

  // ─── Editor Config ───
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '# Click "➕" in Files panel to create a file\n# or select one from the tree\n',
    language: 'python',
    theme: 'neon',
    fontSize: 14,
    automaticLayout: true,
    minimap: { enabled: false },

    // Editing
    readOnly: false,
    domReadOnly: false,
    contextmenu: true,                // ← right-click menu ON
    mouseWheelZoom: true,
    selectOnLineNumbers: true,
    roundedSelection: true,

    // Multi-cursor
    multiCursorModifier: 'ctrlCmd',
    multiCursorMergeOverlapping: true,
    multiCursorPaste: 'spread',

    // Auto-format
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    tabSize: 4,
    insertSpaces: true,
    detectIndentation: false,

    // Brackets
    matchBrackets: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',

    // Suggestions
    quickSuggestions: { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    wordBasedSuggestions: 'currentDocument',

    // Display
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    renderLineHighlight: 'all',

    // Find
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'always',
    },
  });

  // ============================================================
  //  CUSTOM ACTIONS (adds to default right-click menu)
  // ============================================================
  editor.addAction({
    id: 'neon-cut',
    label: '✂️ Cut',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 1,
    precondition: 'editorHasSelection',
    run: (ed) => {
      const sel = ed.getSelection();
      const text = ed.getModel().getValueInRange(sel);
      copyToClipboard(text);
      ed.executeEdits('cut', [{ range: sel, text: '', forceMoveMarkers: true }]);
    }
  });

  editor.addAction({
    id: 'neon-copy',
    label: '📋 Copy',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 2,
    precondition: 'editorHasSelection',
    run: (ed) => {
      const sel = ed.getSelection();
      const text = ed.getModel().getValueInRange(sel);
      copyToClipboard(text);
    }
  });

  editor.addAction({
    id: 'neon-paste',
    label: '📥 Paste',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 3,
    run: async (ed) => {
      try {
        const text = await navigator.clipboard.readText();
        const sel = ed.getSelection();
        ed.executeEdits('paste', [{ range: sel, text, forceMoveMarkers: true }]);
      } catch (err) {
        // silently fail — mobile এই alert দেখাবে না
        ed.trigger('keyboard', 'paste', null);
      }
    }
  });

  editor.addAction({
    id: 'neon-select-all',
    label: '🔷 Select All',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 4,
    run: (ed) => ed.trigger('keyboard', 'editor.action.selectAll', null)
  });

  // ─── Extra useful actions in right-click menu ───
  editor.addAction({
    id: 'neon-format',
    label: '✨ Format Document',
    contextMenuGroupId: '1_modification',
    contextMenuOrder: 1,
    run: (ed) => ed.getAction('editor.action.formatDocument').run()
  });

  editor.addAction({
    id: 'neon-comment',
    label: '💬 Toggle Comment',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
    contextMenuGroupId: '1_modification',
    contextMenuOrder: 2,
    run: (ed) => ed.trigger('keyboard', 'editor.action.commentLine', null)
  });

  editor.addAction({
    id: 'neon-dup-line',
    label: '⧉ Duplicate Line',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow],
    contextMenuGroupId: '1_modification',
    contextMenuOrder: 3,
    run: (ed) => ed.trigger('keyboard', 'editor.action.copyLinesDownAction', null)
  });

  editor.addAction({
    id: 'neon-del-line',
    label: '🗑 Delete Line',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK],
    contextMenuGroupId: '1_modification',
    contextMenuOrder: 4,
    run: (ed) => ed.trigger('keyboard', 'editor.action.deleteLines', null)
  });

  editor.addAction({
    id: 'neon-find',
    label: '🔍 Find',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1,
    run: (ed) => ed.getAction('actions.find').run()
  });

  editor.addAction({
    id: 'neon-replace',
    label: '🔁 Find & Replace',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 2,
    run: (ed) => ed.getAction('editor.action.startFindReplaceAction').run()
  });

  editor.addAction({
    id: 'neon-goto',
    label: '🎯 Go to Line',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 3,
    run: (ed) => ed.getAction('editor.action.gotoLine').run()
  });

  // ============================================================
  //  KEYBOARD SHORTCUTS
  // ============================================================
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    document.getElementById('saveBtn')?.click();
  });

  // ============================================================
  //  BUILD EDITOR TOOLBAR
  // ============================================================
  addEditorToolbar();
});


// ============================================================
//  CLIPBOARD HELPERS (works PC + Mobile)
// ============================================================
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  } catch (e) {
    console.warn('Copy failed:', e);
  }
}

async function pasteFromClipboard() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText();
    }
  } catch (e) {
    console.warn('Paste failed:', e);
  }
  return null;
}


// ============================================================
//  EDITOR TOOLBAR (Mobile-friendly)
// ============================================================
function addEditorToolbar() {
  const editorEl = document.getElementById('editor');
  if (!editorEl || document.getElementById('editorToolbar')) return;

  const tb = document.createElement('div');
  tb.id = 'editorToolbar';
  tb.className = 'editor-toolbar-buttons';
  tb.innerHTML = `
    <button class="neon-btn tiny" data-cmd="undo">↩️</button>
    <button class="neon-btn tiny" data-cmd="redo">↪️</button>
    <button class="neon-btn tiny" data-cmd="cut">✂️ Cut</button>
    <button class="neon-btn tiny" data-cmd="copy">📋 Copy</button>
    <button class="neon-btn tiny" data-cmd="paste">📥 Paste</button>
    <button class="neon-btn tiny" data-cmd="selectall">🔷 All</button>
    <button class="neon-btn tiny" data-cmd="find">🔍 Find</button>
    <button class="neon-btn tiny" data-cmd="replace">🔁</button>
    <button class="neon-btn tiny" data-cmd="format">✨</button>
    <button class="neon-btn tiny" data-cmd="comment">💬</button>
    <button class="neon-btn tiny" data-cmd="duplicate">⧉</button>
    <button class="neon-btn tiny" data-cmd="indent">↹</button>
    <button class="neon-btn tiny" data-cmd="outdent">⇤</button>
    <button class="neon-btn tiny" data-cmd="goto">🎯</button>
  `;

  editorEl.parentNode.insertBefore(tb, editorEl.nextSibling);

  tb.querySelectorAll('button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      runEditorCommand(btn.dataset.cmd);
    });
    // prevent editor blur on mobile
    btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  });
}


async function runEditorCommand(cmd) {
  if (!editor) return;
  const ed = editor;

  try {
    switch (cmd) {
      case 'undo':   ed.trigger('toolbar', 'undo', null); break;
      case 'redo':   ed.trigger('toolbar', 'redo', null); break;

      case 'cut': {
        const sel = ed.getSelection();
        const text = ed.getModel().getValueInRange(sel);
        if (!text) return;
        await copyToClipboard(text);
        ed.executeEdits('cut', [{ range: sel, text: '', forceMoveMarkers: true }]);
        break;
      }

      case 'copy': {
        const sel = ed.getSelection();
        const text = ed.getModel().getValueInRange(sel);
        if (!text) return;
        await copyToClipboard(text);
        break;
      }

      case 'paste': {
        const text = await pasteFromClipboard();
        if (text !== null) {
          const sel = ed.getSelection();
          ed.executeEdits('paste', [{ range: sel, text, forceMoveMarkers: true }]);
        } else {
          // fallback — long-press hint
          alert('📥 Paste করতে:\n\nEditor এ long-press করুন, তারপর "Paste" select করুন।');
        }
        break;
      }

      case 'selectall':  ed.trigger('toolbar', 'editor.action.selectAll', null); break;
      case 'find':       ed.getAction('actions.find').run(); break;
      case 'replace':    ed.getAction('editor.action.startFindReplaceAction').run(); break;
      case 'format':     ed.getAction('editor.action.formatDocument').run(); break;
      case 'comment':    ed.trigger('toolbar', 'editor.action.commentLine', null); break;
      case 'duplicate':  ed.trigger('toolbar', 'editor.action.copyLinesDownAction', null); break;
      case 'indent':     ed.trigger('toolbar', 'editor.action.indentLines', null); break;
      case 'outdent':    ed.trigger('toolbar', 'editor.action.outdentLines', null); break;
      case 'goto':       ed.getAction('editor.action.gotoLine').run(); break;
    }
  } catch (err) {
    console.error('Editor cmd failed:', cmd, err);
  }
}


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
