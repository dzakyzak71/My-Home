const manifestPath = 'assets/Ctf/manifest.json';
const readerContent = document.getElementById('readerContent');
const readerTitle = document.getElementById('readerTitle');
const readerMeta = document.getElementById('readerMeta');
const readerFile = document.getElementById('readerFile');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function parseMdToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').trim().split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let ordered = [];
  let quote = [];
  let code = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${formatInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const flushLists = () => {
    if (list.length) { blocks.push(`<ul>${list.join('')}</ul>`); list = []; }
    if (ordered.length) { blocks.push(`<ol>${ordered.join('')}</ol>`); ordered = []; }
  };
  const flushQuote = () => {
    if (quote.length) { blocks.push(`<blockquote>${quote.map(formatInline).join('<br>')}</blockquote>`); quote = []; }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (code) {
      if (trimmed === '```') {
        blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        code = false;
        codeLines = [];
      } else codeLines.push(line);
      return;
    }
    if (trimmed.startsWith('```')) {
      flushParagraph(); flushLists(); flushQuote(); code = true; return;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (heading) {
      flushParagraph(); flushLists(); flushQuote();
      const level = heading[1].length;
      blocks.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(); flushQuote(); list.push(`<li>${formatInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(); flushQuote(); ordered.push(`<li>${formatInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
    } else if (/^>/.test(trimmed)) {
      flushParagraph(); flushLists(); quote.push(trimmed.replace(/^>\s?/, ''));
    } else if (!trimmed) {
      flushParagraph(); flushLists(); flushQuote();
    } else paragraph.push(trimmed);
  });

  flushParagraph(); flushLists(); flushQuote();
  if (code) blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  return blocks.join('');
}

async function loadReader() {
  const requestedUrl = new URLSearchParams(window.location.search).get('source');
  if (!requestedUrl) throw new Error('File write-up tidak dipilih');

  const manifestResponse = await fetch(manifestPath, { cache: 'no-store' });
  if (!manifestResponse.ok) throw new Error('Manifest tidak ditemukan');
  const manifest = await manifestResponse.json();
  const entry = (manifest.entries || []).find(item => item.url === requestedUrl);
  if (!entry) throw new Error('Write-up tidak terdaftar di manifest');

  const response = await fetch(entry.url, { cache: 'no-store' });
  if (!response.ok) throw new Error('File Markdown tidak dapat dibaca');
  const markdown = await response.text();

  document.title = `${entry.challenge} | CTF Writeup`;
  readerMeta.textContent = `${entry.ctfName || 'CTF ARCHIVE'} / ${entry.ctfType}`;
  readerTitle.textContent = entry.challenge;
  readerFile.textContent = `${entry.fileName}  ·  ${entry.url}`;
  readerContent.innerHTML = parseMdToHtml(markdown);
}

document.getElementById('printButton')?.addEventListener('click', () => window.print());
loadReader().catch(error => {
  console.error(error);
  readerMeta.textContent = 'WRITEUP ERROR';
  readerTitle.textContent = 'Write-up tidak ditemukan';
  readerContent.innerHTML = `<p class="reader-error">${escapeHtml(error.message)}</p>`;
});
