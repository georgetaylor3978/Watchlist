/**
 * app.js ΓÇö Stock Watchlist Dashboard
 * Groups stocks by their "group" field, renders a table per group,
 * click to expand details, filter by ROA/ROE/FCF/Growth/PE.
 */
'use strict';

(() => {
  // ---- Helpers ----
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const fmtPct = v => {
    if (v === null || v === undefined || v === 'N/A' || v === '-') return 'ΓÇö';
    return (v * 100).toFixed(1) + '%';
  };
  const fmtNum = (v, dec = 1) => {
    if (v === null || v === undefined || v === '-' || v === 0) return 'ΓÇö';
    return Number(v).toFixed(dec);
  };
  const fmtPrice = (v, curr) => {
    if (v === null || v === undefined) return 'ΓÇö';
    const sym = curr === 'CAD' ? 'C$' : '$';
    return sym + Number(v).toFixed(2);
  };

  // ---- State ----
  let allStocks = typeof STOCKS_DATA !== 'undefined' ? STOCKS_DATA : [];
  let filteredStocks = [...allStocks];
  let expandedSymbols = new Set();

  // ---- Theme ----
  function initTheme() {
    const saved = localStorage.getItem('sw-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sw-theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    $('#icon-moon').style.display = theme === 'dark' ? 'block' : 'none';
    $('#icon-sun').style.display = theme === 'light' ? 'block' : 'none';
  }

  // ---- Filters ----
  function getFilters() {
    const filters = {};
    const fields = ['roa', 'roe', 'fcf', 'growth', 'pe'];
    for (const f of fields) {
      const val = $(`#filter-${f}`).value.trim();
      const op = $(`#filter-${f}-op`).value;
      if (val !== '') {
        filters[f] = { op, val: parseFloat(val) };
      }
    }
    return filters;
  }

  function applyFilters() {
    const filters = getFilters();
    
    filteredStocks = allStocks.filter(s => {
      for (const [field, { op, val }] of Object.entries(filters)) {
        let stockVal;
        if (field === 'roa') stockVal = s.roa;
        else if (field === 'roe') stockVal = s.roe;
        else if (field === 'fcf') stockVal = s.fcfMargin;
        else if (field === 'growth') stockVal = s.salesGrowth;
        else if (field === 'pe') stockVal = s.pe;

        // For ratio fields (roa/roe/fcf/growth): exclude stocks with no data
        // For pe: 0 means not applicable (pre-revenue), treat as no data
        const noData = stockVal === null || stockVal === undefined ||
                       stockVal === 'N/A' || stockVal === '-' ||
                       (field !== 'pe' && typeof stockVal === 'string');
        if (noData) return false;

        // Convert ratios to percentages for comparison (PE is already a number)
        const compareVal = field === 'pe' ? Number(stockVal) : Number(stockVal) * 100;

        if (op === 'gte' && compareVal < val) return false;
        if (op === 'lte' && compareVal > val) return false;
      }
      return true;
    });

    render();
  }

  function clearFilters() {
    ['roa', 'roe', 'fcf', 'growth', 'pe'].forEach(f => {
      $(`#filter-${f}`).value = '';
    });
    filteredStocks = [...allStocks];
    render();
  }

  // ---- Rating badge ----
  function ratingBadge(val) {
    if (val === null || val === undefined || val === '-' || val === '') {
      return '<span class="rating-badge rating-none">ΓÇö</span>';
    }
    const n = Number(val);
    let cls = 'rating-mid';
    if (n >= 8) cls = 'rating-high';
    else if (n <= 4) cls = 'rating-low';
    return `<span class="rating-badge ${cls}">${n.toFixed(1)}</span>`;
  }

  // ---- Pct class ----
  function pctClass(v) {
    if (v === null || v === undefined || v === 'N/A' || v === '-') return 'pct-neutral';
    return v >= 0 ? 'pct-positive' : 'pct-negative';
  }

  // ---- Render ----
  function render() {
    const container = $('#stock-list');

    // Group stocks
    const groups = new Map();
    for (const s of filteredStocks) {
      const g = s.group || 'OTHER';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(s);
    }

    // Update count
    $('#stock-count').textContent = `${filteredStocks.length} stocks`;

    if (filteredStocks.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p>No stocks match your filters.</p>
        </div>`;
      return;
    }

    let html = '';
    for (const [groupName, stocks] of groups) {
      html += `
        <section class="group-section">
          <div class="group-header">
            <span class="group-name">${escHtml(groupName)}</span>
            <span class="group-count">${stocks.length} item${stocks.length !== 1 ? 's' : ''}</span>
          </div>
          <table class="stock-table">
            <thead>
              <tr>
                <th></th>
                <th>Symbol</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Rating</th>
                <th>P/E</th>
                <th>FCF Margin</th>
                <th class="col-industry">Industry</th>
              </tr>
            </thead>
            <tbody>`;

      for (const s of stocks) {
        const isExpanded = expandedSymbols.has(s.symbol);

        html += `
              <tr class="stock-row${isExpanded ? ' expanded' : ''}" data-symbol="${escAttr(s.symbol)}">
                <td><span class="expand-icon">Γû╕</span></td>
                <td class="td-symbol">${escHtml(s.symbol)}</td>
                <td class="td-stock">${escHtml(s.stock)}</td>
                <td class="td-price">${fmtPrice(s.price, s.currency)}</td>
                <td>${ratingBadge(s.corpRank)}</td>
                <td class="td-pe">${fmtNum(s.pe)}</td>
                <td class="${pctClass(s.fcfMargin)}">${fmtPct(s.fcfMargin)}</td>
                <td class="td-industry col-industry" title="${escAttr(s.industry)}">${escHtml(s.industry)}</td>
              </tr>
              <tr class="detail-row${isExpanded ? ' visible' : ''}" data-detail="${escAttr(s.symbol)}">
                <td colspan="8">
                  <div class="detail-content">
                    <div class="detail-grid">
                      <div class="detail-item">
                        <span class="detail-label">Currency</span>
                        <span class="detail-value">${escHtml(s.currency)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">52-Week High</span>
                        <span class="detail-value">${fmtPrice(s.high52, s.currency)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Var. from High</span>
                        <span class="detail-value ${pctClass(s.variance)}">${fmtPct(s.variance)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Rebound Potential</span>
                        <span class="detail-value ${pctClass(s.rebound)}">${fmtPct(s.rebound)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">ROA (5Y Avg)</span>
                        <span class="detail-value ${pctClass(s.roa)}">${fmtPct(s.roa)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">ROE (5Y Avg)</span>
                        <span class="detail-value ${pctClass(s.roe)}">${fmtPct(s.roe)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">FCF Margin (5Y Avg)</span>
                        <span class="detail-value ${pctClass(s.fcfMargin)}">${fmtPct(s.fcfMargin)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Sales Growth (5Y Avg)</span>
                        <span class="detail-value ${pctClass(s.salesGrowth)}">${fmtPct(s.salesGrowth)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Beta</span>
                        <span class="detail-value">${fmtNum(s.beta, 2)}</span>
                      </div>
                    </div>
                    ${(s.comment || s.risks) ? `
                    <div class="detail-comment">
                      ${s.comment ? `
                      <div class="detail-item">
                        <span class="detail-label">Comment</span>
                        <span class="detail-value">${escHtml(s.comment)}</span>
                      </div>` : ''}
                      ${s.risks ? `
                      <div class="detail-item">
                        <span class="detail-label">Key Risks</span>
                        <span class="detail-value">${escHtml(s.risks)}</span>
                      </div>` : ''}
                    </div>` : ''}
                  </div>
                </td>
              </tr>`;
      }

      html += `
            </tbody>
          </table>
        </section>`;
    }

    container.innerHTML = html;
    bindRowClicks();
  }

  // ---- Row click to expand ----
  function bindRowClicks() {
    $$('.stock-row').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.dataset.symbol;
        const detailRow = document.querySelector(`[data-detail="${sym}"]`);
        
        if (expandedSymbols.has(sym)) {
          expandedSymbols.delete(sym);
          row.classList.remove('expanded');
          detailRow.classList.remove('visible');
        } else {
          expandedSymbols.add(sym);
          row.classList.add('expanded');
          detailRow.classList.add('visible');
        }
      });
    });
  }

  // ---- Escape helpers ----
  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ---- Init ----
  function init() {
    initTheme();

    // Theme toggle
    $('#btn-theme').addEventListener('click', toggleTheme);

    // Filter toggle
    $('#btn-toggle-filters').addEventListener('click', () => {
      $('#filter-panel').classList.toggle('hidden');
    });

    // Filter apply/clear
    $('#btn-apply-filters').addEventListener('click', applyFilters);
    $('#btn-clear-filters').addEventListener('click', clearFilters);

    // Enter key in filter inputs
    $$('.filter-row input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyFilters();
      });
    });

    // Initial render
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
