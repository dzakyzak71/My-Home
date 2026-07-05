const writeupTableContainer = document.getElementById('writeupTableContainer');
const manifestPath = 'assets/Ctf/manifest.json';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseMdToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').trim().split('\n');
  const htmlBlocks = [];
  let paragraphLines = [];
  let listItems = [];
  let orderedItems = [];
  let quoteLines = [];
  let inCode = false;
  let codeLines = [];
  let codeLang = '';

  function flushParagraph() {
    if (paragraphLines.length) {
      const content = formatInline(paragraphLines.join(' '));
      htmlBlocks.push(`<p>${content}</p>`);
      paragraphLines = [];
    }
  }

  function flushList() {
    if (listItems.length) {
      htmlBlocks.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
    }
    if (orderedItems.length) {
      htmlBlocks.push(`<ol>${orderedItems.join('')}</ol>`);
      orderedItems = [];
    }
  }

  function flushQuote() {
    if (quoteLines.length) {
      const content = quoteLines.map(line => formatInline(line)).join('<br>');
      htmlBlocks.push(`<blockquote>${content}</blockquote>`);
      quoteLines = [];
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inCode) {
      if (trimmed === '```') {
        htmlBlocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLines = [];
        codeLang = '';
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      flushList();
      flushQuote();
      inCode = true;
      codeLines = [];
      codeLang = trimmed.match(/^```(\w+)?/)?.[1] || '';
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = trimmed.match(/^#+/)[0].length;
      const content = formatInline(trimmed.replace(/^#{1,6}\s+/, ''));
      htmlBlocks.push(`<h${Math.min(level, 6)}>${content}</h${Math.min(level, 6)}>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      flushQuote();
      listItems.push(`<li>${formatInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      flushQuote();
      orderedItems.push(`<li>${formatInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    if (/^>/.test(trimmed)) {
      flushParagraph();
      flushList();
      quoteLines.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }

    if (trimmed === '') {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();

  if (inCode) {
    htmlBlocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return `<div class="writeup-md">${htmlBlocks.join('')}</div>`;
}

function formatInline(text) {
  let html = escapeHtml(text);
  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return html;
}

async function loadWriteupEntries() {
  try {
    const response = await fetch(manifestPath);
    if (!response.ok) {
      throw new Error('Manifest tidak ditemukan');
    }

    const data = await response.json();
    return Array.isArray(data.entries) ? data.entries : [];
  } catch (error) {
    console.error('Tidak bisa memuat data writeup:', error);
    return [];
  }
}

function updateScoreCard(entries) {
  const scoreValue = document.querySelector('.score-card__value');
  const scoreStats = document.querySelectorAll('.score-stats strong');
  const chart = document.getElementById('progressChart');

  if (!scoreValue || !scoreStats.length) return;

  const solved = entries.length;
  const pending = 0;
  const maxValue = 1000;
  const value = Math.min(maxValue, solved);
  const progress = Math.round((value / maxValue) * 100);

  scoreValue.textContent = `${value}/1000`;
  scoreStats[0].textContent = solved;
  scoreStats[1].textContent = pending;
  scoreStats[2].textContent = solved > 0 ? `${Math.min(30, solved)}d` : '0d';

  if (chart) {
    const width = 320;
    const height = 140;
    const paddingLeft = 36;
    const paddingRight = 18;
    const paddingTop = 20;
    const paddingBottom = 24;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const ratio = value / maxValue;
    const currentX = paddingLeft + innerWidth * ratio;
    const currentY = paddingTop + innerHeight - innerHeight * ratio;

    const ticks = [0, 250, 500, 750, 1000];
    const tickMarkup = ticks.map(tick => {
      const y = paddingTop + innerHeight - (tick / maxValue) * innerHeight;
      return `
        <line x1="${paddingLeft - 6}" y1="${y}" x2="${paddingLeft + innerWidth}" y2="${y}" class="chart-tick"></line>
        <text x="${paddingLeft - 12}" y="${y + 4}" text-anchor="end" class="chart-label">${tick}</text>
      `;
    }).join('');

    const pathD = `M ${paddingLeft} ${paddingTop + innerHeight} C ${paddingLeft + innerWidth * 0.3} ${paddingTop + innerHeight - innerHeight * 0.28 * ratio}, ${paddingLeft + innerWidth * 0.7} ${paddingTop + innerHeight - innerHeight * 0.7 * ratio}, ${currentX} ${currentY}`;

    chart.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#39ff88"></path>
        </marker>
      </defs>
      <line x1="${paddingLeft}" y1="${paddingTop + innerHeight}" x2="${paddingLeft + innerWidth}" y2="${paddingTop + innerHeight}" class="chart-axis"></line>
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + innerHeight}" class="chart-axis"></line>
      ${tickMarkup}
      <path d="${pathD}" class="chart-line" marker-end="url(#arrowhead)"></path>
      <circle cx="${currentX}" cy="${currentY}" r="5" class="chart-point"></circle>
      <circle cx="${currentX}" cy="${currentY}" r="10" class="chart-point-glow"></circle>
    `;
  }
}

async function buildWriteupTable() {
  if (!writeupTableContainer) return;

  const entries = await loadWriteupEntries();
  updateScoreCard(entries);

  if (!entries.length) {
    writeupTableContainer.innerHTML = '<div class="writeup-empty">Belum ada file markdown di folder CTF.</div>';
    return;
  }

  const rows = await Promise.all(entries.map(async entry => {
    const response = await fetch(entry.url);
    const markdown = response.ok ? await response.text() : 'Tidak dapat memuat isi markdown.';
    const content = parseMdToHtml(markdown);

    return `
      <tr>
        <td>${escapeHtml(entry.ctfType)}</td>
        <td>${escapeHtml(entry.challenge)}</td>
        <td>${escapeHtml(entry.fileName)}</td>
        <td>
          <details class="writeup-details">
            <summary>Lihat isi markdown</summary>
            ${content}
          </details>
        </td>
      </tr>
    `;
  }));

  writeupTableContainer.innerHTML = `
    <div class="table-scroll">
      <table class="writeup-table">
        <thead>
          <tr>
            <th>Tipe CTF</th>
            <th>Judul Soal</th>
            <th>Nama File</th>
            <th>Isi Markdown</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

window.addEventListener('load', () => {
  buildWriteupTable();
});
