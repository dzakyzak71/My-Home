const categories = ['Crypto', 'Osint', 'Rev', 'Web', 'Misc'];
const basePath = '/assets/';
const scoreValue = document.getElementById('scoreValue');
const scoreProgressFill = document.getElementById('scoreProgressFill');
const writeupTableContainer = document.getElementById('writeupTableContainer');
const maxScore = 10000;

async function fetchDirectory(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load directory: ${url}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = Array.from(doc.querySelectorAll('a'))
    .map(a => a.getAttribute('href'))
    .filter(href => href && href !== '../');

  return links.map(href => new URL(href, url).href);
}

function parseMdToHtml(markdown) {
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n+/g, '</p><p>');

  html = '<p>' + html + '</p>';
  html = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-3][^>]*>.*?<\/h[1-3]>)/g, '$1')
    .replace(/<\/p><p>(<h[1-3][^>]*>)/g, '$1');

  html = html.replace(/<p>([^<]+)<\/p>/g, '<p>$1</p>');
  return html;
}

function extractTitle(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

async function loadWriteupEntries() {
  const entries = [];

  for (const category of categories) {
    const categoryUrl = `${basePath}${category}/`;

    try {
      const categoryItems = await fetchDirectory(categoryUrl);

      for (const itemUrl of categoryItems) {
        if (itemUrl.endsWith('/')) {
          try {
            const subItems = await fetchDirectory(itemUrl);
            const challengeTitle = decodeURIComponent(itemUrl.split('/').slice(-2, -1)[0]);

            for (const subItemUrl of subItems) {
              if (subItemUrl.toLowerCase().endsWith('.md')) {
                entries.push({
                  category,
                  challenge: challengeTitle,
                  url: subItemUrl,
                });
              }
            }
          } catch (e) {
            console.warn('Unable to scan subfolder', itemUrl, e);
          }
        } else if (itemUrl.toLowerCase().endsWith('.md')) {
          const challengeTitle = decodeURIComponent(itemUrl.split('/').pop().replace(/\.md$/i, ''));
          entries.push({
            category,
            challenge: challengeTitle,
            url: itemUrl,
          });
        }
      }
    } catch (error) {
      console.warn('Category not found or empty:', categoryUrl);
    }
  }

  return entries;
}

async function buildWriteupTable() {
  const entries = await loadWriteupEntries();
  const score = entries.length;
  scoreValue.textContent = score;
  scoreProgressFill.style.width = `${Math.min((score / maxScore) * 100, 100)}%`;
  const gauge = document.getElementById('scoreGauge');
  if (gauge) {
    gauge.style.setProperty('--progress', Math.min((score / maxScore) * 100, 100));
  }

  if (!entries.length) {
    writeupTableContainer.innerHTML = `
      <div class="writeup-empty">
        <p>Silakan tambahkan file .md di dalam subfolder kategori yang sesuai untuk melihat tampilan writeup di sini.</p>
      </div>
    `;
    return;
  }

  const rows = await Promise.all(
    entries.map(async entry => {
      const response = await fetch(entry.url);
      const markdown = response.ok ? await response.text() : 'Tidak dapat memuat file markdown.';
      const title = extractTitle(markdown, entry.challenge);
      const content = parseMdToHtml(markdown);

      return `
        <tr>
          <td>${entry.category}</td>
          <td>${title}</td>
          <td>
            <details class="writeup-details">
              <summary>Lihat writeup</summary>
              <div class="writeup-md">${content}</div>
            </details>
          </td>
        </tr>
      `;
    })
  );

  writeupTableContainer.innerHTML = `
    <div class="table-scroll">
      <table class="writeup-table">
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Judul</th>
            <th>Writeup</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.addEventListener('load', () => {
  buildWriteupTable().catch(error => {
    console.error('Gagal memuat writeup:', error);
    writeupTableContainer.innerHTML = '<div class="writeup-empty">Terjadi kesalahan saat memuat writeup.</div>';
  });
});
