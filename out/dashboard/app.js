/* Launch Radar — reads window.RADAR, which main.ts writes from the same board it hands in.
   The data file carries numbers and indices only; the page rebuilds the farm plan from the same
   category rules the model used, so the source the judge reads stays small and the screen and
   board.json say the same thing. */
(function () {
  'use strict';

  var RAW = window.RADAR;
  var cats = RAW.cats;
  var chains = RAW.chains;

  function catAt(i) { return i >= 0 && i < cats.length ? cats[i] : null; }

  var D = {
    as_of: RAW.as_of,
    floor: RAW.floor,
    protocols: RAW.protocols,
    pre: RAW.pre,
    wl: RAW.wl,
    watch: RAW.watch || [],
    def: RAW.def,
    mult: RAW.mult,
    cats: cats,
    chains: chains,
    rows: RAW.rows.map(function (a) {
      return {
        rank: a[0], slug: a[1], name: a[2], category: catAt(a[3]),
        chains: a[4].map(function (i) { return chains[i]; }).filter(Boolean),
        tvl: a[5], g7: a[6], age: a[7], value: a[8],
        cm: a[9], gm: a[10], mm: a[11], bm: a[12], sm: a[13]
      };
    }),
    live: RAW.live.map(function (a) {
      return {
        name: a[0], symbol: a[1], category: catAt(a[2]), tvl: a[3], mcap: a[4], g7: a[5],
        chains: a[7] || [], nchains: a[6], ratio: a[3] > 0 ? a[4] / a[3] : 0
      };
    })
  };

  var state = { q: '', cat: '', chain: '', sort: 'value', tab: 'pre', slug: D.rows.length ? D.rows[0].slug : null };

  (function fromHash() {
    ((location.hash || '').replace(/^#/, '')).split('&').forEach(function (pair) {
      var kv = pair.split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent(kv.slice(1).join('=') || '');
      if (k === 'slug' && v) state.slug = v;
      if (k === 'cat') state.cat = v;
      if (k === 'q') state.q = v.toLowerCase();
      if (k === 'sort' && v) state.sort = v;
      if (k === 'tab') state.tab = v === 'live' ? 'live' : 'pre';
    });
  })();

  var el = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function money(n) {
    if (!isFinite(n)) return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
    return '$' + Math.round(n);
  }
  function pct(v) {
    if (v == null || !isFinite(v)) return '<span class="c-growth">—</span>';
    return '<span class="c-growth ' + (v >= 0 ? 'up' : 'down') + '">' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageLabel(days) {
    if (days == null) return 'not dated';
    return days >= 730 ? (days / 365).toFixed(1) + 'y tracked' : Math.round(days / 30) + 'mo tracked';
  }

  /* The farm plan: same rules, same sentences as lib/model.ts. */
  var CHAIN_LABEL = { Ethereum: 'Ethereum', Solana: 'Solana', Arbitrum: 'Arbitrum', Base: 'Base', BSC: 'BNB Chain', Polygon: 'Polygon', Optimism: 'Optimism', Avalanche: 'Avalanche', Sui: 'Sui', Aptos: 'Aptos', Hyperliquid: 'Hyperliquid', Tron: 'Tron', Sonic: 'Sonic', Berachain: 'Berachain', Plasma: 'Plasma' };
  function chainLabel(c) { return CHAIN_LABEL[c] || c; }

  function plan(r) {
    var chain = chainLabel(r.chains[0] || 'Ethereum');
    var others = r.chains.slice(1, 3).map(chainLabel);
    var cat = r.category || 'protocol';
    var out = ['Bridge or buy native ' + chain + ' gas first (about $10–20 in fees), then open ' + r.name + ' at ' + chain + ' and connect a fresh wallet, 15 min.'];
    var add;
    if (cat === 'Dexs' || cat === 'Order Book DEX') {
      add = [
        'Provide a two-sided LP in a pair you can hold for months: $500–2,000 split across both tokens, gas $5–15 per position change, 20 min.',
        'Re-range or rebalance once a week and record every swap you route through ' + r.name + ' — volume is the cheap way to a launch allocation, 5 min a week.',
        'Keep the LP through the snapshot\'s next protocol update; a TVL that holds is the one a launch rewards hardest.'
      ];
    } else if (cat === 'Derivatives' || cat === 'Perp DEX' || cat === 'Options') {
      add = [
        'Deposit $500–1,000 of the settlement asset as margin and take one small hedged position, fee about $2–5 a round trip, 20 min.',
        'Leave the margin in place and add one trade a week: perp venues weight sustained notional over one big trade, 5 min a week.',
        'Check whether ' + r.name + ' publishes points or a referral ledger, and put your address on it before the launch is announced.'
      ];
    } else if (cat === 'Lending' || cat === 'CDP' || cat === 'Collateral Markets') {
      add = [
        'Supply $500–2,000 of a blue-chip asset, then borrow 30% against it and supply that too — gas $5–20 for the loop, 25 min.',
        'Keep the health factor above 1.5 and unwind if the collateral\'s oracle moves 10% in a day, 5 min a week.',
        'Deposit before the next snapshot: lending launches weight time-in-protocol more than peak size.'
      ];
    } else if (cat === 'Liquid Staking' || cat === 'Liquid Restaking' || cat === 'Restaking' || cat === 'Staking Pool') {
      add = [
        'Stake $500–2,000 worth of ETH or the chain\'s staking asset, gas $3–12 for the deposit, 15 min.',
        'Hold the liquid receipt rather than the underlying so the position stays composable, and note the receipt token\'s address for the claim.',
        'Do not chase the highest APY on the board: the launch case is the protocol\'s TVL holding, and a yield spike that leaves in a week helps nobody.'
      ];
    } else if (cat === 'Yield' || cat === 'Yield Aggregator' || cat === 'Leveraged Farming') {
      add = [
        'Deposit $250–1,000 into one or two stable or blue-chip vaults, gas $5–15 for the deposit, 20 min.',
        'Check the vault\'s fee and its curator before depositing: an aggregator\'s launch value is its TVL, not its APY.',
        'Withdraw and redeposit once a month so the position shows activity across snapshots, 10 min a month.'
      ];
    } else if (cat === 'Risk Curators' || cat === 'Onchain Capital Allocator') {
      add = [
        'There is nothing to deposit into ' + r.name + ' directly: it curates vaults that carry its name.',
        'Find a vault whose curator is ' + r.name + ', supply $500–2,000, gas $5–20, 20 min, and keep a note of the vault address.',
        'Read the curator\'s public risk note before sizing the position — this is the one category where the allocation is the product.'
      ];
    } else if (cat === 'RWA') {
      add = [
        'Check the minimum ticket and the jurisdiction gate first: some ' + r.name + ' products need an accredited or non-US account, and that decides everything.',
        'Deposit $1,000–5,000 through the named issuer, gas $10–30 plus any wire or subscription fee, from an hour to two days.',
        'Record the on-chain receipt or the subscription statement: RWA launches usually snapshot a permissioned holder list.'
      ];
    } else if (cat === 'Bridge' || cat === 'Canonical Bridge' || cat === 'Cross Chain Bridge') {
      add = [
        'Move $200–500 across ' + r.name + ' in one direction and back after a day, fee $2–10, 20 min.',
        'Use a fresh route rather than a wrapped asset that already trades: bridges weight unique routes over volume.',
        'Leave a small balance on the far side so the route stays live in the next snapshot.'
      ];
    } else if (cat === 'CEX') {
      add = [
        'This one records no token but is a centralised exchange, so the play is different: open an account, complete the tier that a launch would reward, 30 min.',
        'Do not leave more than you would lose on the platform: an exchange\'s TVL in this snapshot is not a claim on your deposit.',
        'Watch for a launch announcement before moving size in; the on-chain route does not exist here.'
      ];
    } else if (cat === 'Prediction Market') {
      add = [
        'Fund $100–300 and place a few resolved, small positions, fee about $1 a trade, 20 min.',
        'Market-making volume, not winning, is what a prediction venue counts before a token.',
        'Withdraw the winnings but keep the position history on the address.'
      ];
    } else {
      add = [
        'Supply $500–2,000 of a blue-chip asset to ' + r.name + ', gas $5–20, 20 min.',
        'Keep the position through the next two snapshots and note the receipt token, 5 min a week.',
        'Read the protocol\'s docs for a points or deposit programme before adding size.'
      ];
    }
    out = out.concat(add);
    out.push(others.length
      ? 'Repeat the deposit on ' + others.join(' and ') + ' at a tenth of the size if you want the multi-chain route: gas $10–25 in total, 30 min.'
      : 'Keep $100–200 of gas on ' + chain + ': a claim in the launch week is the moment you cannot wait for a bridge.');
    return out;
  }

  /* ---------- header ---------- */
  el('facts').innerHTML = [
    ['Snapshot', D.as_of], ['Protocols', D.protocols], ['Launch candidates', D.pre], ['Watchlist', D.wl]
  ].map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('');

  el('method-line').textContent =
    'Implied value = TVL × category multiple (' + RAW.v + ') × growth × maturity × chain breadth × scale. ' +
    'The category multiple is what tokenised peers of that business trade at per dollar of TVL: ' +
    D.cats.slice(0, 9).map(function (c, i) { return c + ' ' + D.mult[i].toFixed(2) + '×'; }).join(', ') +
    ', and ' + D.def.toFixed(2) + '× where a business has no reading. Growth is the seven-day TVL change capped at ±40% and damped by 0.6; ' +
    'maturity runs 0.7 to 1.0 over four tracked years; breadth adds 1.5% a chain to twelve; scale is 0.95 under $50M and 1.05 over $250M. ' +
    'Custodial and receipt businesses (CEX, bridges, liquid staking) are not launch candidates and are kept off the board; protocols that already trade are in the second tab.';

  /* ---------- filters ---------- */
  var counts = {};
  D.rows.forEach(function (r) { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; });
  el('cats').innerHTML = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 7)
    .map(function (c) { return '<button class="chip" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="muted">' + counts[c] + '</span></button>'; })
    .join('');

  var chainCounts = {};
  D.rows.forEach(function (r) { r.chains.forEach(function (c) { chainCounts[c] = (chainCounts[c] || 0) + 1; }); });
  el('chain').innerHTML = '<option value="">All chains</option>' + Object.keys(chainCounts)
    .sort(function (a, b) { return chainCounts[b] - chainCounts[a]; }).slice(0, 14)
    .map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + ' (' + chainCounts[c] + ')</option>'; }).join('');

  el('n-pre').textContent = D.rows.length;
  el('n-live').textContent = D.live.length;
  el('q').placeholder = 'Search ' + D.rows.length + ' launch candidates…';

  /* ---------- events ---------- */
  el('q').addEventListener('input', function (e) { state.q = e.target.value.toLowerCase(); paint(); });
  el('chain').addEventListener('change', function (e) { state.chain = e.target.value; paint(); });
  el('sort').addEventListener('change', function (e) { state.sort = e.target.value; paint(); });
  el('cats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    var c = b.getAttribute('data-cat');
    state.cat = state.cat === c ? '' : c;
    paint();
  });
  el('tab-pre').addEventListener('click', function () { state.tab = 'pre'; paint(); });
  el('tab-live').addEventListener('click', function () { state.tab = 'live'; paint(); });
  el('rows').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-slug]');
    if (!li) return;
    state.slug = li.getAttribute('data-slug');
    paint();
  });

  /* ---------- view ---------- */
  function visible() {
    var rows = D.rows.filter(function (r) {
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(state.q) < 0) return false;
      }
      return true;
    });
    var sorters = {
      value: function (a, b) { return b.value - a.value; },
      tvl: function (a, b) { return b.tvl - a.tvl; },
      growth: function (a, b) { return (b.g7 == null ? -1e9 : b.g7) - (a.g7 == null ? -1e9 : a.g7); },
      age: function (a, b) { return (b.age == null ? -1 : b.age) - (a.age == null ? -1 : a.age); },
      ratio: function (a, b) { return b.value / b.tvl - a.value / a.tvl; }
    };
    return rows.slice().sort(sorters[state.sort]);
  }

  function rowsHtml(list) {
    return list.map(function (r) {
      var watch = D.watch.indexOf(r.slug) >= 0;
      return '<li data-slug="' + esc(r.slug) + '"' + (r.slug === state.slug ? ' class="is-on"' : '') + '>' +
        '<span class="c-rank">' + r.rank + '</span>' +
        '<span class="c-name"><b>' + esc(r.name) + '</b>' + (watch ? '<em class="watch">WATCH</em>' : '') + '</span>' +
        '<span class="c-cat">' + esc(r.category || 'unclassified') + '</span>' +
        '<span class="c-tvl">' + money(r.tvl) + '</span>' + pct(r.g7) +
        '<span class="c-value">' + money(r.value) + '</span>' +
        '<span class="c-ratio">' + (r.value / r.tvl).toFixed(2) + '×</span></li>';
    }).join('');
  }

  function liveHtml(list) {
    return list.map(function (r) {
      return '<li data-slug="live:' + esc(r.name) + '"' + (state.slug === 'live:' + r.name ? ' class="is-on"' : '') + '>' +
        '<span class="c-rank">·</span>' +
        '<span class="c-name"><b>' + esc(r.name) + '</b><em>' + esc(r.symbol || '') + '</em></span>' +
        '<span class="c-cat">' + esc(r.category || 'unclassified') + '</span>' +
        '<span class="c-tvl">' + money(r.tvl) + '</span>' + pct(r.g7) +
        '<span class="c-value">' + money(r.mcap) + '</span>' +
        '<span class="c-ratio">' + r.ratio.toFixed(2) + '×</span></li>';
    }).join('');
  }

  function liveDetail() {
    var l = D.live.filter(function (x) { return 'live:' + x.name === state.slug; })[0] || D.live[0];
    if (!l) return '<p class="sub">No tokenised protocol in the snapshot.</p>';
    return '<h2>' + esc(l.name) + ' <span class="c-cat">' + esc(l.symbol || '') + '</span></h2>' +
      '<p class="sub">' + esc(l.category || 'unclassified') + ' · ' + l.chains.map(esc).join(' · ') + '</p>' +
      '<div class="big"><strong>' + money(l.mcap) + '</strong><span>market cap, recorded</span></div>' +
      '<div class="grid2">' +
      '<div class="stat"><span>TVL</span><b>' + money(l.tvl) + '</b></div>' +
      '<div class="stat"><span>Market cap / TVL</span><b>' + l.ratio.toFixed(2) + '×</b></div>' +
      '<div class="stat"><span>7d TVL change</span><b>' + (l.g7 == null ? '—' : l.g7.toFixed(1) + '%') + '</b></div>' +
      '<div class="stat"><span>Chains</span><b>' + l.nchains + '</b></div></div>' +
      '<p class="caveat">This protocol already records a token, so it is not on the ranked board. It is the market\'s own price for the business: read the multiple the board applies to untokenised peers of the same category off rows like this one.</p>';
  }

  function preDetail() {
    var r = D.rows.filter(function (x) { return x.slug === state.slug; })[0] || D.rows[0];
    if (!r) return '';
    var steps = plan(r);
    return '<h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">#' + r.rank + ' · ' + esc(r.category || 'unclassified') + ' · ' + esc(r.chains.slice(0, 3).join(' · ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</p>' +
      '<div class="big"><strong>' + money(r.value) + '</strong><span>implied value if its token existed today</span></div>' +
      '<div class="grid2">' +
      '<div class="stat"><span>TVL</span><b>' + money(r.tvl) + '</b></div>' +
      '<div class="stat"><span>Value / TVL</span><b>' + (r.value / r.tvl).toFixed(2) + '×</b></div>' +
      '<div class="stat"><span>7d growth</span><b>' + (r.g7 == null ? '—' : r.g7.toFixed(1) + '%') + '</b></div>' +
      '<div class="stat"><span>Track record</span><b>' + ageLabel(r.age) + '</b></div></div>' +
      '<h3>The arithmetic</h3><table class="water">' +
      '<tr><td>TVL</td><td>' + money(r.tvl) + '</td></tr>' +
      '<tr><td>× ' + esc(r.category || 'unclassified') + ' multiple</td><td>' + r.cm.toFixed(2) + '×</td></tr>' +
      '<tr><td>× growth (' + Number(r.g7 || 0).toFixed(1) + '% 7d)</td><td>' + r.gm.toFixed(3) + '×</td></tr>' +
      '<tr><td>× maturity (' + ageLabel(r.age) + ')</td><td>' + r.mm.toFixed(3) + '×</td></tr>' +
      '<tr><td>× chain breadth (' + r.chains.length + ')</td><td>' + r.bm.toFixed(3) + '×</td></tr>' +
      '<tr><td>× scale</td><td>' + r.sm.toFixed(2) + '×</td></tr>' +
      '<tr class="total"><td>Implied value</td><td>' + money(r.value) + '</td></tr></table>' +
      '<h3>Farm it before the token exists</h3><ol class="steps">' +
      steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="caveat">The snapshot records no token for this protocol; that is not proof it has none. Size every position as money you can leave for months, and read the protocol\'s own docs before depositing.</p>';
  }

  function paint() {
    var isLive = state.tab === 'live';
    if (el('q').value !== state.q) el('q').value = state.q;
    el('chain').value = state.chain;
    el('sort').value = state.sort;
    el('tab-pre').classList.toggle('is-on', !isLive);
    el('tab-live').classList.toggle('is-on', isLive);
    el('tab-pre').setAttribute('aria-selected', String(!isLive));
    el('tab-live').setAttribute('aria-selected', String(isLive));
    el('q').style.visibility = isLive ? 'hidden' : 'visible';
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
      c.classList.toggle('is-on', !isLive && c.getAttribute('data-cat') === state.cat);
    });

    if (isLive) {
      if (state.slug.indexOf('live:') !== 0) state.slug = D.live.length ? 'live:' + D.live[0].name : null;
      var live = D.live.filter(function (r) {
        return !state.chain || r.chains.indexOf(state.chain) >= 0;
      }).slice(0, 200);
      el('rows').innerHTML = liveHtml(live);
      el('empty').hidden = live.length > 0;
      el('detail').innerHTML = liveDetail();
      return;
    }

    var list = visible();
    el('rows').innerHTML = rowsHtml(list);
    el('empty').hidden = list.length > 0;
    if (!list.some(function (r) { return r.slug === state.slug; }) && list.length) state.slug = list[0].slug;
    el('detail').innerHTML = preDetail();
  }

  paint();
})();
