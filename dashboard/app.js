// Token Radar's plain dashboard. It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the board, a detail view per protocol, a watchlist filter and the live-token view.
// No network: every byte it shows is in data.js. Views are hash routes, so each screenshot is
// one address: the board, #detail=<slug>, and #watchlist for the filtered view.
(function () {
  'use strict';
  var DATA = window.RADAR;
  var app = document.getElementById('app');
  var statsEl = document.getElementById('stats');
  var methodEl = document.getElementById('method');

  function money(n) {
    if (n === null || n === undefined) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) {
    if (n === null || n === undefined) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n === null || n === undefined) return '<span class="flat">—</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    var sign = n > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + n.toFixed(1) + '%</span>';
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function hashParams() {
    var h = window.location.hash.replace(/^#/, '');
    return new URLSearchParams(h);
  }
  function setHash(pairs) {
    var p = hashParams();
    Object.keys(pairs).forEach(function (k) {
      if (pairs[k] === '' || pairs[k] === null || pairs[k] === undefined) p.delete(k);
      else p.set(k, pairs[k]);
    });
    window.location.hash = p.toString();
  }

  var SORTS = {
    rank: function (a, b) { return a.rank - b.rank; },
    implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
    tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
    change: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
    age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); }
  };
  var state = { q: '', cat: '', wl: false, sort: 'rank', view: 'board', slug: '' };

  function readHash() {
    var p = hashParams();
    state.view = p.get('view') || (p.get('slug') ? 'detail' : 'board');
    state.slug = p.get('slug') || '';
    state.q = p.get('q') || '';
    state.cat = p.get('cat') || '';
    state.wl = p.get('wl') === '1';
    state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'rank';
  }

  function categories() {
    var seen = {};
    DATA.rows.forEach(function (r) { if (r.category) seen[r.category] = true; });
    return Object.keys(seen).sort();
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var rows = DATA.rows.filter(function (r) {
      if (state.wl && !r.on_watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    return rows.sort(SORTS[state.sort]);
  }

  function rowHtml(r) {
    var wl = r.on_watchlist ? ' class="wl"' : '';
    var pill = r.on_watchlist ? ' <span class="pill wl">Watchlist</span>' : '';
    return '<tr' + wl + ' data-slug="' + esc(r.slug) + '">' +
      '<td class="rank">#' + r.rank + '</td>' +
      '<td><span class="name">' + esc(r.name) + '</span> <span class="slug">' + esc(r.slug) + '</span>' + pill + '</td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="num">' + ageText(r.age_days) + '</td>' +
      '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td></tr>';
  }

  function renderBoard() {
    var cats = categories();
    var rows = filteredRows();
    var html = '<div class="tabs">' +
      '<button class="tab' + (state.view === 'board' ? ' on' : '') + '" data-view="board">Board</button>' +
      '<button class="tab' + (state.view === 'live' ? ' on' : '') + '" data-view="live">Live tokens</button></div>' +
      '<div class="controls">' +
      '<input type="search" id="q" placeholder="Search name, slug or category…" value="' + esc(state.q) + '">' +
      '<select id="cat"><option value="">All categories</option>' +
      cats.map(function (c) { return '<option value="' + esc(c) + '"' + (state.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
      '</select>' +
      '<label><input type="checkbox" id="wl"' + (state.wl ? ' checked' : '') + '> Watchlist only</label>' +
      '<select id="sort">' +
      '<option value="rank"' + (state.sort === 'rank' ? ' selected' : '') + '>Sort: rank</option>' +
      '<option value="implied"' + (state.sort === 'implied' ? ' selected' : '') + '>Sort: implied value</option>' +
      '<option value="tvl"' + (state.sort === 'tvl' ? ' selected' : '') + '>Sort: TVL</option>' +
      '<option value="change"' + (state.sort === 'change' ? ' selected' : '') + '>Sort: 7-day change</option>' +
      '<option value="age"' + (state.sort === 'age' ? ' selected' : '') + '>Sort: age</option>' +
      '</select></div>' +
      '<p class="note">Showing <b>' + rows.length + '</b> of ' + DATA.board_size + ' ranked protocols · ' +
      DATA.watchlist_size + ' on the watchlist · snapshot ' + esc(DATA.as_of) +
      ' · implied value is this radar\u2019s own claim, not a prediction.</p>';
    if (!rows.length) {
      html += '<div class="empty">No protocols match this filter.</div>';
    } else {
      html += '<table><thead><tr><th data-sort="rank">Rank</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
        '<th class="num" data-sort="tvl">TVL</th><th class="num" data-sort="change">7d</th>' +
        '<th class="num" data-sort="age">Age</th><th class="num" data-sort="implied">Implied value</th></tr></thead><tbody>' +
        rows.map(rowHtml).join('') + '</tbody></table>';
    }
    app.innerHTML = html;
    bindBoard();
  }

  function bindBoard() {
    var q = document.getElementById('q');
    var cat = document.getElementById('cat');
    var wl = document.getElementById('wl');
    var sort = document.getElementById('sort');
    var t;
    q.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { setHash({ q: q.value, view: 'board' }); }, 250);
    });
    cat.addEventListener('change', function () { setHash({ cat: cat.value, view: 'board' }); });
    wl.addEventListener('change', function () { setHash({ wl: wl.checked ? '1' : '', view: 'board' }); });
    sort.addEventListener('change', function () { setHash({ sort: sort.value, view: 'board' }); });
    app.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () { setHash({ sort: th.getAttribute('data-sort'), view: 'board' }); });
    });
    app.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { setHash({ view: b.getAttribute('data-view'), slug: '' }); });
    });
    app.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { setHash({ view: 'detail', slug: tr.getAttribute('data-slug') }); });
    });
  }

  function renderDetail() {
    var r = null;
    DATA.rows.forEach(function (row) { if (row.slug === state.slug) r = row; });
    if (!r) {
      app.innerHTML = '<p class="note"><a class="back" href="#">&larr; Back to the board</a></p><div class="empty">No ranked protocol with that slug.</div>';
      return;
    }
    var base = Math.round(r.tvl_usd * r.category_multiple);
    var afterGrowth = Math.round(base * r.growth_multiplier);
    var afterMaturity = Math.round(afterGrowth * r.maturity_multiplier);
    var html = '<p><a class="back" href="#">&larr; Back to the board</a></p>' +
      '<section class="detail"><h1>' + esc(r.name) + '</h1>' +
      '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' +
      esc(r.chains.join(', ') || '—') + (r.on_watchlist ? ' · <span class="pill wl">Watchlist</span>' : ' · below the watchlist floor') + '</p>' +
      '<div class="grid">' +
      '<div class="cell"><div class="k">Rank</div><div class="v">#' + r.rank + '</div></div>' +
      '<div class="cell"><div class="k">Implied value</div><div class="v">' + money(r.implied_value_usd) + '</div></div>' +
      '<div class="cell"><div class="k">TVL</div><div class="v">' + money(r.tvl_usd) + '</div></div>' +
      '<div class="cell"><div class="k">7-day change</div><div class="v">' + pct(r.change_7d).replace(/<[^>]+>/g, '') + '</div></div>' +
      '<div class="cell"><div class="k">Age, no token</div><div class="v">' + ageText(r.age_days) + '</div></div>' +
      '<div class="cell"><div class="k">Listed</div><div class="v">' + esc(r.listed_at || '—') + '</div></div>' +
      '</div>' +
      '<h2>How the value is built</h2>' +
      '<table class="model"><tbody>' +
      '<tr><td>TVL &times; category multiple (' + r.category_multiple.toFixed(2) + '&times;, the median market-cap-to-TVL of trading ' + esc(r.category || 'protocols') + ' in this snapshot)</td><td>' + moneyFull(base) + '</td></tr>' +
      '<tr><td>&times; growth multiplier (' + r.growth_multiplier.toFixed(2) + '&times; from ' + (r.change_7d === null ? 'no reported 7-day change' : r.change_7d.toFixed(1) + '% over 7 days') + ')</td><td>' + moneyFull(afterGrowth) + '</td></tr>' +
      '<tr><td>&times; maturity multiplier (' + r.maturity_multiplier.toFixed(2) + '&times; from ' + ageText(r.age_days) + ' with no token)</td><td>' + moneyFull(afterMaturity) + '</td></tr>' +
      '<tr><td>&times; chain breadth (' + r.chains_multiplier.toFixed(2) + '&times; across ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ')</td><td><b>' + moneyFull(r.implied_value_usd) + '</b></td></tr>' +
      '</tbody></table>' +
      '<h2>Farm plan</h2><ol class="steps">' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol></section>';
    app.innerHTML = html;
  }

  function renderLive() {
    var html = '<div class="tabs">' +
      '<button class="tab" data-view="board">Board</button>' +
      '<button class="tab on" data-view="live">Live tokens</button></div>' +
      '<p class="note">These protocols already trade. Their values are the market\u2019s own — market cap from the snapshot — never this radar\u2019s model. They are here so the board\u2019s pre-token rows are never confused with them.</p>' +
      '<table><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th></tr></thead><tbody>' +
      DATA.live.map(function (p) {
        return '<tr><td><span class="name">' + esc(p.name) + '</span> <span class="slug">' + esc(p.slug) + '</span></td>' +
          '<td>' + esc(p.category || '—') + '</td>' +
          '<td>' + esc(p.chains.slice(0, 2).join(', ')) + (p.chains.length > 2 ? ' +' + (p.chains.length - 2) : '') + '</td>' +
          '<td class="num">' + money(p.tvl_usd) + '</td>' +
          '<td class="num"><b>' + money(p.mcap_usd) + '</b></td>' +
          '<td class="num">' + pct(p.change_7d) + '</td></tr>';
      }).join('') + '</tbody></table>';
    app.innerHTML = html;
    app.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { setHash({ view: b.getAttribute('data-view'), slug: '' }); });
    });
  }

  function renderMethod() {
    methodEl.innerHTML = '<h2>How the radar works</h2>' +
      '<p><b>Model ' + esc(DATA.model_version) + '.</b> Each pre-token protocol\u2019s implied value is ' +
      'TVL &times; its category\u2019s multiple — the median market-cap-to-TVL of the protocols in that category ' +
      'that already trade, computed from this snapshot (global median ' + DATA.global_multiple.toFixed(2) +
      '&times; where a category has fewer than three trading protocols) — then adjusted for 7-day growth, ' +
      'for how long it has run with no token, and for how many chains it runs on. No protocol name is ' +
      'ever special-cased. The snapshot is sealed: ' + esc(DATA.as_of) + ', ' + esc(DATA.source) + '.</p>' +
      '<p>An implied value is this entry\u2019s own claim about what a launch would be worth if the protocol\u2019s ' +
      'record stayed as it is. It does not predict whether or when a token is issued. A protocol is said to ' +
      'record no token, never to have none: its DefiLlama record may simply not carry one.</p>' +
      '<p>Farm plans are generated from each protocol\u2019s own record — its category, chains, TVL and age — ' +
      'with the capital, the cost and the time each step takes. Nothing here is financial advice.</p>';
  }

  function renderStats() {
    var top = DATA.rows[0];
    statsEl.innerHTML =
      '<span class="stat"><b>' + DATA.board_size + '</b> ranked rows</span>' +
      '<span class="stat"><b>' + DATA.watchlist_size + '</b> on the watchlist</span>' +
      '<span class="stat"><b>' + DATA.early_size + '</b> early finds below the floor</span>' +
      '<span class="stat"><b>' + DATA.live_size + '</b> live tokens set aside</span>' +
      '<span class="stat">Top: <b>' + esc(top ? top.name : '—') + ' · ' + money(top ? top.implied_value_usd : 0) + '</b></span>' +
      '<span class="stat">Snapshot <b>' + esc(DATA.as_of) + '</b></span>';
  }

  function render() {
    readHash();
    if (state.view === 'detail') renderDetail();
    else if (state.view === 'live') renderLive();
    else renderBoard();
  }

  renderStats();
  renderMethod();
  render();
  window.addEventListener('hashchange', render);
})();
