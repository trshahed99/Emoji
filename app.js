// ===== State =====
let files = {};        // { path: content }
let activeFile = null;
let editor = null;

// ===== Monaco Editor Init =====
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
  monaco.editor.defineTheme('neon', {
    base: 'vs-dark',
    inherit: true,
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
    value: '# Upload a ZIP or folder to begin 🚀\n',
    language: 'python',
    theme: 'neon',
    fontSize: 14,
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: 'Consolas, "Courier New", monospace',
  });
});

// ===== Upload Handlers =====
const uploadZone = document.getElementById('uploadZone');
const zipInput = document.getElementById('zipInput');
const folderInput = document.getElementById('folderInput');

['dragenter', 'dragover'].forEach(ev =>
  uploadZone.addEventListener(ev, e => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  })
);
['dragleave', 'drop'].forEach(ev =>
  uploadZone.addEventListener(ev, e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  })
);

uploadZone.addEventListener('drop', async e => {
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.zip')) await handleZip(file);
});

zipInput.addEventListener('change', async e => {
  if (e.target.files[0]) await handleZip(e.target.files[0]);
});

folderInput.addEventListener('change', async e => {
  const list = e.target.files;
  for (const f of list) {
    const content = await f.text();
    files[f.webkitRelativePath || f.name] = content;
  }
  renderFileList();
});

// ===== ZIP Extraction (client-side with JSZip) =====
async function handleZip(file) {
  log(`> Extracting ${file.name}...`);
  const zip = await JSZip.loadAsync(file);
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      files[path] = await entry.async('string');
    }
  }
  log(`> Extracted ${Object.keys(files).length} files ✅`);
  renderFileList();
}

// ===== File List =====
const fileListEl = document.getElementById('fileList');

function renderFileList() {
  fileListEl.innerHTML = '';
  const paths = Object.keys(files);
  if (paths.length === 0) {
    fileListEl.innerHTML = '<li class="empty">No files uploaded yet</li>';
    return;
  }
  paths.forEach(path => {
    const li = document.createElement('li');
    li.textContent = path;
    li.className = path === activeFile ? 'active' : '';
    li.onclick = () => openFile(path);
    fileListEl.appendChild(li);
  });
}

function openFile(path) {
  activeFile = path;
  editor.setValue(files[path]);
  const ext = path.split('.').pop();
  const langMap = { py: 'python', js: 'javascript', html: 'html', css: 'css', json: 'json', txt: 'plaintext', md: 'markdown' };
  monaco.editor.setModelLanguage(editor.getModel(), langMap[ext] || 'plaintext');
  renderFileList();
}

// ===== Buttons =====
document.getElementById('saveBtn').onclick = () => {
  if (!activeFile) return log('> ⚠️ No file selected');
  files[activeFile] = editor.getValue();
  log(`> Saved ${activeFile} 💾`);
};

document.getElementById('deleteBtn').onclick = () => {
  if (!activeFile) return log('> ⚠️ No file selected');
  delete files[activeFile];
  log(`> Deleted ${activeFile} 🗑`);
  activeFile = null;
  editor.setValue('');
  renderFileList();
};

document.getElementById('runBtn').onclick = async () => {
  if (!activeFile) return log('> ⚠️ Select a file to run');
  files[activeFile] = editor.getValue();

  // auto-add requirements.txt if user typed anything
  const reqText = document.getElementById('reqInput').value.trim();
  if (reqText) files['requirements.txt'] = reqText;

  log('> 🚀 Sending to backend...');

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: activeFile,
        files,
        requirements: reqText,
      }),
    });
    const data = await res.json();
    log(`--- STDOUT ---\n${data.stdout || '(empty)'}`);
    if (data.stderr) log(`--- STDERR ---\n${data.stderr}`);
    log(`> Exit code: ${data.returncode}`);
  } catch (err) {
    log(`> ❌ Error: ${err.message}`);
  }
};

// ===== Console =====
const consoleEl = document.getElementById('console');
function log(msg) {
  consoleEl.textContent += '\n' + msg;
  consoleEl.scrollTop = consoleEl.scrollHeight;
                             }
