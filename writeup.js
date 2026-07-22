const writeupTableContainer = document.getElementById('writeupTableContainer');
const writeupListContainer = document.getElementById('writeupListContainer');
const manifestPath = 'assets/Ctf/manifest.json';
const MAX_SCORE = 1000;
const POINTS_PER_WRITEUP = 1;

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

function writeupReaderUrl(entry) {
  return `kconk.html?source=${encodeURIComponent(entry.url)}`;
}

function renderWriteupList(entries) {
  if (!writeupListContainer) return;
  if (!entries.length) {
    writeupListContainer.innerHTML = '<div class="writeup-empty">Belum ada write-up.</div>';
    return;
  }

  writeupListContainer.innerHTML = entries.map((entry, index) => {
    const readerUrl = writeupReaderUrl(entry);
    return `
      <article class="writeup-list-item">
        <div class="writeup-list-item__index">${String(index + 1).padStart(2, '0')}</div>
        <div class="writeup-list-item__body">
          <a class="writeup-list-item__title" href="${readerUrl}">${escapeHtml(entry.challenge)}</a>
          <div class="writeup-list-item__meta">
            <span>${escapeHtml(entry.ctfName || 'CTF Archive')}</span>
            <span>/</span>
            <span>${escapeHtml(entry.ctfType)}</span>
            <span>/</span>
            <span>${escapeHtml(entry.fileName)}</span>
          </div>
        </div>
        <a class="writeup-list-item__button" href="${readerUrl}">Buka write-up <span aria-hidden="true">↗</span></a>
      </article>
    `;
  }).join('');
}

async function loadWriteupEntries() {
  try {
    const response = await fetch(manifestPath, { cache: 'no-store' });
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
  const value = Math.min(MAX_SCORE, solved * POINTS_PER_WRITEUP);
  const progress = Math.round((value / MAX_SCORE) * 1000) / 10;
  const remaining = Math.max(0, MAX_SCORE - value);

  scoreValue.innerHTML = `<strong>${value}</strong><span>PTS</span>`;
  scoreStats[0].textContent = `${progress}%`;
  scoreStats[1].textContent = solved;
  scoreStats[2].textContent = `${remaining} pts`;

  if (chart) {
    const width = 1000;
    const height = 330;
    const paddingLeft = 78;
    const paddingRight = 28;
    const paddingTop = 26;
    const paddingBottom = 50;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const scoreHistory = Array.from({ length: solved + 1 }, (_, index) => Math.min(MAX_SCORE, index * POINTS_PER_WRITEUP));
    const currentX = paddingLeft + innerWidth;
    const currentY = paddingTop + innerHeight - innerHeight * (value / MAX_SCORE);

    const ticks = [0, 250, 500, 750, MAX_SCORE];
    const tickMarkup = ticks.map(tick => {
      const y = paddingTop + innerHeight - (tick / MAX_SCORE) * innerHeight;
      return `
        <line x1="${paddingLeft - 6}" y1="${y}" x2="${paddingLeft + innerWidth}" y2="${y}" class="chart-tick"></line>
        <text x="${paddingLeft - 14}" y="${y + 4}" text-anchor="end" class="chart-label">${tick} pts</text>
      `;
    }).join('');

    const points = scoreHistory.map((score, index) => {
      const x = paddingLeft + (innerWidth * index) / Math.max(scoreHistory.length - 1, 1);
      const y = paddingTop + innerHeight - (innerHeight * score) / MAX_SCORE;
      return { x, y };
    });
    const pathD = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      return `${path} H ${point.x} V ${point.y}`;
    }, '');
    const areaD = `${pathD} L ${currentX} ${paddingTop + innerHeight} L ${paddingLeft} ${paddingTop + innerHeight} Z`;
    const xLabels = points.map((point, index) => {
      if (index !== 0 && index !== points.length - 1 && index % Math.ceil(points.length / 5) !== 0) return '';
      return `<text x="${point.x}" y="${height - 16}" text-anchor="middle" class="chart-label">${index === 0 ? 'START' : `WU ${index}`}</text>`;
    }).join('');
    const pointMarkup = points.slice(1).map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" class="chart-point"></circle>`).join('');

    chart.innerHTML = `
      <defs>
        <linearGradient id="scoreArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#39ff88" stop-opacity="0.26"></stop>
          <stop offset="100%" stop-color="#39ff88" stop-opacity="0"></stop>
        </linearGradient>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#39ff88"></path>
        </marker>
      </defs>
      <line x1="${paddingLeft}" y1="${paddingTop + innerHeight}" x2="${paddingLeft + innerWidth}" y2="${paddingTop + innerHeight}" class="chart-axis"></line>
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + innerHeight}" class="chart-axis"></line>
      ${tickMarkup}
      <path d="${areaD}" class="chart-area"></path>
      <path d="${pathD}" class="chart-line" marker-end="url(#arrowhead)"></path>
      ${pointMarkup}
      <circle cx="${currentX}" cy="${currentY}" r="10" class="chart-point-glow"></circle>
      ${xLabels}
    `;
  }
}

async function buildWriteupTable() {
  if (!writeupTableContainer) return;

  const entries = await loadWriteupEntries();
  updateScoreCard(entries);
  renderWriteupList(entries);

  if (!entries.length) {
    writeupTableContainer.innerHTML = '<div class="writeup-empty">Belum ada file markdown di folder CTF.</div>';
    return;
  }

  const writeups = await Promise.all(entries.map(async entry => {
    const response = await fetch(entry.url, { cache: 'no-store' });
    const markdown = response.ok ? await response.text() : 'Tidak dapat memuat isi markdown.';
    const content = parseMdToHtml(markdown);

    return {
      ...entry,
      content,
    };
  }));

  const events = writeups.reduce((groups, entry) => {
    const eventName = entry.ctfName || 'CTF Archive';
    if (!groups[eventName]) groups[eventName] = {};
    if (!groups[eventName][entry.ctfType]) groups[eventName][entry.ctfType] = [];
    groups[eventName][entry.ctfType].push(entry);
    return groups;
  }, {});

  const createCategoryTable = (category, categoryEntries, categoryIndex) => {
    const rows = categoryEntries.map((entry, entryIndex) => `
      <tr>
        <td><span class="challenge-number">${String(entryIndex + 1).padStart(2, '0')}</span></td>
        <td>
          <strong>${escapeHtml(entry.challenge)}</strong>
          <span class="challenge-path">/${escapeHtml(entry.challenge)}/</span>
        </td>
        <td>${escapeHtml(entry.fileName)}</td>
        <td>
          <details class="writeup-details">
            <summary>Open writeup <span aria-hidden="true">↗</span></summary>
            ${entry.content}
          </details>
        </td>
      </tr>
    `).join('');

    return `
      <article class="category-table" style="--category-index: ${categoryIndex}">
        <div class="category-table__header">
          <div>
            <span class="category-table__eyebrow">Folder / ${escapeHtml(category)}</span>
            <h3>${escapeHtml(category)}</h3>
          </div>
          <span class="category-table__count">${categoryEntries.length} writeup${categoryEntries.length > 1 ? 's' : ''}</span>
        </div>
        <div class="table-scroll${categoryEntries.length > 4 ? ' table-scroll--overflow' : ''}" tabindex="0" aria-label="Daftar writeup ${escapeHtml(category)}">
          <table class="writeup-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Judul soal</th>
                <th>File Markdown</th>
                <th>Writeup</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${categoryEntries.length > 4 ? `<p class="table-scroll__hint">↓ Scroll untuk melihat ${categoryEntries.length - 4} writeup lainnya</p>` : ''}
      </article>
    `;
  };

  const eventTables = Object.entries(events).map(([eventName, categories], eventIndex) => {
    const categoryTables = Object.entries(categories)
      .map(([category, categoryEntries], categoryIndex) => createCategoryTable(category, categoryEntries, categoryIndex))
      .join('');
    const challengeCount = Object.values(categories).reduce((total, entriesInCategory) => total + entriesInCategory.length, 0);

    return `
      <section class="ctf-event">
        <div class="ctf-event__header">
          <div>
            <span class="ctf-event__eyebrow">CTF event / ${String(eventIndex + 1).padStart(2, '0')}</span>
            <h3>${escapeHtml(eventName)}</h3>
          </div>
          <span class="ctf-event__count">${challengeCount} challenge${challengeCount > 1 ? 's' : ''}</span>
        </div>
        <div class="ctf-event__categories">${categoryTables}</div>
      </section>
    `;
  }).join('');

  writeupTableContainer.innerHTML = eventTables;
}

window.addEventListener('load', () => {
  buildWriteupTable();
});
