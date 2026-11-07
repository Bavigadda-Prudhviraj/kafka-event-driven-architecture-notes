/* Interactive widgets for the Kafka docs: simulators and step-through flows.
   Each widget is a <div class="kw" data-widget="NAME" data-...> placeholder in a chapter;
   this file renders it. No dependencies, works offline. */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ---------- Kafka's default partitioner hash (Utils.murmur2 + toPositive) ---------- */
  function murmur2(d) {
    var len = d.length, m = 0x5bd1e995, r = 24, h = (0x9747b28c ^ len) | 0, l4 = len >> 2, i, k;
    for (i = 0; i < l4; i++) {
      var i4 = i * 4;
      k = (d[i4] & 0xff) + ((d[i4 + 1] & 0xff) << 8) + ((d[i4 + 2] & 0xff) << 16) + ((d[i4 + 3] & 0xff) << 24);
      k = Math.imul(k, m); k ^= k >>> r; k = Math.imul(k, m); h = Math.imul(h, m); h ^= k;
    }
    var t = len & ~3;
    switch (len % 4) { case 3: h ^= (d[t + 2] & 0xff) << 16; case 2: h ^= (d[t + 1] & 0xff) << 8; case 1: h ^= d[t] & 0xff; h = Math.imul(h, m); }
    h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15; return h | 0;
  }
  var utf8 = function (s) { return new TextEncoder().encode(s); };
  var partitionFor = function (key, n) { return ((murmur2(utf8(key)) & 0x7fffffff) % n); };

  var W = {};

  /* =====================================================================
     1. Partition picker — which partition does a key go to?
     ===================================================================== */
  W.partition = function (root) {
    var n = +(root.dataset.partitions || 3);
    root.innerHTML =
      '<div class="kw-head"><span class="kw-tag">Try it</span><b>Partition picker</b><span class="kw-sub">Kafka’s real default partitioner: murmur2(key) % partitions</span></div>' +
      '<div class="kw-controls">' +
        '<label>Key <input type="text" class="kw-in" value="order-101" maxlength="60" aria-label="Record key"></label>' +
        '<label>Partitions <input type="range" class="kw-n" min="1" max="12" value="' + n + '" aria-label="Number of partitions"> <b class="kw-nv">' + n + '</b></label>' +
        '<button type="button" class="kw-btn kw-send">Send record</button><button type="button" class="kw-btn ghost kw-batch">Send 10 random keys</button><button type="button" class="kw-btn ghost kw-clear">Clear</button>' +
      '</div>' +
      '<div class="kw-out" aria-live="polite"></div><div class="kw-parts"></div>' +
      '<div class="kw-note">Same key → always the same partition, so its events stay in order. Change the partition count and watch existing keys move — that is why adding partitions later breaks per-key ordering. A record with <em>no</em> key is not hashed: the sticky partitioner fills one partition’s batch, then switches.</div>';
    var inp = root.querySelector('.kw-in'), nr = root.querySelector('.kw-n'), nv = root.querySelector('.kw-nv'),
      out = root.querySelector('.kw-out'), parts = root.querySelector('.kw-parts'), sent = [];
    var draw = function (flash) {
      n = +nr.value; nv.textContent = n;
      var html = '';
      for (var p = 0; p < n; p++) {
        var mine = sent.filter(function (k) { return partitionFor(k, n) === p; });
        html += '<div class="kw-part"><div class="kw-ph">P' + p + '</div><div class="kw-cells">' +
          mine.map(function (k, i) { return '<span class="kw-rec' + (k === flash && i === mine.lastIndexOf(k) ? ' new' : '') + '" title="offset ' + i + '">' + esc(k) + '<small>offset ' + i + '</small></span>'; }).join('') +
          (mine.length ? '' : '<span class="kw-empty">empty</span>') + '</div></div>';
      }
      parts.innerHTML = html;
      var key = inp.value;
      if (key) {
        var h = murmur2(utf8(key));
        out.innerHTML = 'murmur2(<code>"' + esc(key) + '"</code>) = <code>' + h + '</code> → positive: <code>' + (h & 0x7fffffff) + '</code> → % ' + n + ' = <b>partition ' + partitionFor(key, n) + '</b>';
      } else { out.innerHTML = 'Empty key → no hashing; the <b>sticky partitioner</b> picks a partition per batch.'; }
    };
    root.querySelector('.kw-send').addEventListener('click', function () { if (inp.value) { sent.push(inp.value); draw(inp.value); } });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); root.querySelector('.kw-send').click(); } });
    root.querySelector('.kw-batch').addEventListener('click', function () {
      for (var i = 0; i < 10; i++) sent.push(['order-', 'user-', 'cust-'][i % 3] + Math.floor(Math.random() * 900 + 100));
      draw();
    });
    root.querySelector('.kw-clear').addEventListener('click', function () { sent = []; draw(); });
    inp.addEventListener('input', function () { draw(); }); nr.addEventListener('input', function () { draw(); });
    draw();
  };

  /* =====================================================================
     2. Consumer group simulator — assignors and rebalances
     ===================================================================== */
  W.groups = function (root) {
    var P = +(root.dataset.partitions || 6);
    root.innerHTML =
      '<div class="kw-head"><span class="kw-tag">Try it</span><b>Consumer group rebalance</b><span class="kw-sub">Add or remove consumers and compare the assignors</span></div>' +
      '<div class="kw-controls">' +
        '<label>Assignor <select class="kw-as" aria-label="Assignment strategy"><option value="range">Range</option><option value="rr">RoundRobin</option><option value="sticky">Sticky</option><option value="coop">CooperativeSticky</option></select></label>' +
        '<label>Partitions <input type="range" class="kw-p" min="1" max="12" value="' + P + '" aria-label="Partitions"> <b class="kw-pv">' + P + '</b></label>' +
        '<button type="button" class="kw-btn kw-add">+ Add consumer</button><button type="button" class="kw-btn ghost kw-rm">− Remove last</button><button type="button" class="kw-btn ghost kw-crash">Crash C2</button><button type="button" class="kw-btn ghost kw-reset">Reset</button>' +
      '</div>' +
      '<div class="kw-cons"></div><div class="kw-stats" aria-live="polite"></div>' +
      '<div class="kw-note">Every partition is owned by exactly one consumer in the group; extra consumers sit idle. <b>Range</b> and <b>RoundRobin</b> recompute from scratch, so partitions move even when they don’t need to. <b>Sticky</b> keeps existing ownership. All three are <em>eager</em> — everyone stops during the rebalance. <b>CooperativeSticky</b> only pauses the partitions that actually move.</div>';
    var as = root.querySelector('.kw-as'), pr = root.querySelector('.kw-p'), pv = root.querySelector('.kw-pv'),
      cons = root.querySelector('.kw-cons'), stats = root.querySelector('.kw-stats'),
      members = ['C1', 'C2', 'C3'], next = 4, prev = {}, assign = {};
    var compute = function (alg, ms, n, old) {
      var a = {}; ms.forEach(function (c) { a[c] = []; });
      if (!ms.length) return a;
      var sorted = ms.slice().sort(function (x, y) { return +x.slice(1) - +y.slice(1); });
      if (alg === 'range') {
        var per = Math.floor(n / sorted.length), extra = n % sorted.length, p = 0;
        sorted.forEach(function (c, i) { var cnt = per + (i < extra ? 1 : 0); for (var j = 0; j < cnt; j++) a[c].push(p++); });
      } else if (alg === 'rr') {
        for (var q = 0; q < n; q++) a[sorted[q % sorted.length]].push(q);
      } else {
        // sticky / cooperative: keep valid previous ownership within the target size, then fill up the least loaded
        var max = Math.ceil(n / sorted.length), owned = {};
        sorted.forEach(function (c) { (old[c] || []).forEach(function (p) { if (p < n && a[c].length < max && !owned[p]) { a[c].push(p); owned[p] = 1; } }); });
        // rebalance down to floor/ceil sizes
        var minSize = Math.floor(n / sorted.length);
        for (var p2 = 0; p2 < n; p2++) {
          if (owned[p2]) continue;
          var target = sorted.slice().sort(function (x, y) { return a[x].length - a[y].length || +x.slice(1) - +y.slice(1); })[0];
          a[target].push(p2); owned[p2] = 1;
        }
        // move from over-full to under-full until balanced
        var moved = true;
        while (moved) {
          moved = false;
          var big = sorted.slice().sort(function (x, y) { return a[y].length - a[x].length; })[0];
          var small = sorted.slice().sort(function (x, y) { return a[x].length - a[y].length; })[0];
          if (a[big].length - a[small].length > 1 && a[small].length < minSize + 1) { a[small].push(a[big].pop()); moved = true; }
        }
        sorted.forEach(function (c) { a[c].sort(function (x, y) { return x - y; }); });
      }
      return a;
    };
    var render = function (why) {
      var n = +pr.value; pv.textContent = n;
      var old = assign; assign = compute(as.value, members, n, old);
      var owner = {}, prevOwner = {};
      Object.keys(assign).forEach(function (c) { assign[c].forEach(function (p) { owner[p] = c; }); });
      Object.keys(old).forEach(function (c) { old[c].forEach(function (p) { prevOwner[p] = c; }); });
      var movedCount = 0, keptCount = 0;
      for (var p = 0; p < n; p++) { if (prevOwner[p] === undefined) continue; if (prevOwner[p] === owner[p]) keptCount++; else movedCount++; }
      var eager = as.value !== 'coop';
      cons.innerHTML = members.length ? members.map(function (c) {
        var ps = assign[c] || [];
        return '<div class="kw-con' + (ps.length ? '' : ' idle') + '"><div class="kw-ch">' + c + (ps.length ? '' : ' · idle') + '</div><div class="kw-cells">' +
          ps.map(function (p) {
            var cls = prevOwner[p] === undefined || why === 'init' ? '' : prevOwner[p] === c ? (eager ? ' paused' : ' kept') : ' moved';
            return '<span class="kw-pp' + cls + '">P' + p + '</span>';
          }).join('') + '</div></div>';
      }).join('') : '<div class="kw-empty">No consumers — nothing is read.</div>';
      if (why === 'init') { stats.innerHTML = members.length + ' consumers · ' + n + ' partitions'; return; }
      stats.innerHTML = '<b>' + movedCount + '</b> partition(s) moved · <b>' + keptCount + '</b> kept their owner · ' +
        (eager ? '<span class="kw-bad">eager: all ' + (movedCount + keptCount) + ' paused during the rebalance</span>' : '<span class="kw-good">cooperative: only the ' + movedCount + ' moved partition(s) paused</span>');
    };
    root.querySelector('.kw-add').addEventListener('click', function () { if (members.length < 12) { members.push('C' + next++); render('change'); } });
    root.querySelector('.kw-rm').addEventListener('click', function () { if (members.length) { members.pop(); render('change'); } });
    root.querySelector('.kw-crash').addEventListener('click', function () { var i = members.indexOf('C2'); if (i >= 0) { members.splice(i, 1); render('change'); } });
    root.querySelector('.kw-reset').addEventListener('click', function () { members = ['C1', 'C2', 'C3']; next = 4; assign = {}; render('init'); });
    as.addEventListener('change', function () { assign = {}; render('init'); });
    pr.addEventListener('input', function () { render('change'); });
    render('init');
  };

  /* =====================================================================
     3. Window simulator — tumbling / hopping / session with grace
     ===================================================================== */
  W.windows = function (root) {
    root.innerHTML =
      '<div class="kw-head"><span class="kw-tag">Try it</span><b>Window & grace simulator</b><span class="kw-sub">Click the timeline to add events in arrival order; late ones are allowed</span></div>' +
      '<div class="kw-controls">' +
        '<label>Type <select class="kw-wt" aria-label="Window type"><option value="tumbling">Tumbling</option><option value="hopping">Hopping</option><option value="session">Session</option></select></label>' +
        '<label class="kw-sz">Size <select class="kw-size"><option>5</option><option selected>10</option><option>15</option></select> min</label>' +
        '<label class="kw-hop">Advance <select class="kw-adv"><option selected>5</option><option>2</option></select> min</label>' +
        '<label class="kw-gap">Gap <select class="kw-g"><option>3</option><option selected>5</option></select> min</label>' +
        '<label>Grace <select class="kw-gr"><option value="0">0</option><option value="5" selected>5</option><option value="10">10</option></select> min</label>' +
        '<button type="button" class="kw-btn ghost kw-demo">Load example</button><button type="button" class="kw-btn ghost kw-undo">Undo</button><button type="button" class="kw-btn ghost kw-clear">Clear</button>' +
      '</div>' +
      '<div class="kw-time"><div class="kw-axis"></div><div class="kw-evs"></div></div>' +
      '<div class="kw-st" aria-live="polite"></div><div class="kw-wins"></div>' +
      '<div class="kw-note">Stream time = the highest timestamp seen so far. A window closes when stream time ≥ window end + grace; a record that arrives for a closed window is <b>dropped</b>. Session windows close at session end + gap + grace, and a late record can merge two sessions.</div>';
    var T0 = 0, T1 = 60, q = function (s) { return root.querySelector(s); }, evs = [];
    var hh = function (m) { return (10 + Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0'); };
    var axis = q('.kw-axis');
    axis.innerHTML = Array.from({ length: 7 }, function (_, i) { return '<span style="left:' + (i * 10 / 60 * 100) + '%">' + hh(i * 10) + '</span>'; }).join('');
    var sync = function () {
      var t = q('.kw-wt').value;
      q('.kw-sz').style.display = t === 'session' ? 'none' : '';
      q('.kw-hop').style.display = t === 'hopping' ? '' : 'none';
      q('.kw-gap').style.display = t === 'session' ? '' : 'none';
    };
    var sim = function () {
      var type = q('.kw-wt').value, size = +q('.kw-size').value, adv = type === 'hopping' ? +q('.kw-adv').value : size,
        gap = +q('.kw-g').value, grace = +q('.kw-gr').value, st = -1, wins = {}, log = [];
      if (type !== 'session') {
        evs.forEach(function (t, i) {
          st = Math.max(st, t);
          var starts = []; for (var s = Math.floor(t / adv) * adv; s > t - size; s -= adv) if (s >= 0) starts.push(s);
          var acc = 0, rej = 0;
          starts.forEach(function (s) {
            var e = s + size, k = s;
            // the window already closed before this (late) record arrived → drop it for this window
            if (t < st && st >= e + grace) { rej++; wins[k] = wins[k] || { s: s, e: e, c: 0 }; wins[k].drop = (wins[k].drop || 0) + 1; return; }
            wins[k] = wins[k] || { s: s, e: e, c: 0 }; wins[k].c++; acc++;
          });
          log.push({ t: t, late: t < st, ok: acc > 0, part: rej > 0 && acc > 0, i: i });
        });
        Object.keys(wins).forEach(function (k) { wins[k].closed = st >= wins[k].e + grace; });
        return { list: Object.keys(wins).map(function (k) { return wins[k]; }).sort(function (a, b) { return a.s - b.s; }), st: st, log: log, close: function (w) { return w.e + grace; } };
      }
      var ss = []; // sessions {s,e,c,closed}
      evs.forEach(function (t, i) {
        st = Math.max(st, t);
        ss.forEach(function (x) { if (st > x.e + gap + grace) x.closed = true; });
        var hits = ss.filter(function (x) { return !x.closed && t >= x.s - gap && t <= x.e + gap; });
        var closedHit = ss.some(function (x) { return x.closed && t >= x.s - gap && t <= x.e + gap; });
        if (!hits.length && closedHit && t < st) { log.push({ t: t, late: true, ok: false, i: i }); return; }
        if (!hits.length) { ss.push({ s: t, e: t, c: 1 }); log.push({ t: t, late: t < st, ok: true, i: i }); return; }
        var m = { s: Math.min.apply(null, hits.map(function (x) { return x.s; }).concat(t)), e: Math.max.apply(null, hits.map(function (x) { return x.e; }).concat(t)), c: 1 + hits.reduce(function (a, x) { return a + x.c; }, 0), merged: hits.length > 1 };
        ss = ss.filter(function (x) { return hits.indexOf(x) < 0; }); ss.push(m);
        log.push({ t: t, late: t < st, ok: true, merged: hits.length > 1, i: i });
      });
      ss.forEach(function (x) { if (st > x.e + gap + grace) x.closed = true; });
      return { list: ss.sort(function (a, b) { return a.s - b.s; }), st: st, log: log, close: function (w) { return w.e + gap + grace; }, session: true };
    };
    var draw = function () {
      sync();
      var r = sim(), pct = function (m) { return (m - T0) / (T1 - T0) * 100; };
      q('.kw-evs').innerHTML = r.log.map(function (l, j) {
        return '<span class="kw-ev ' + (l.ok ? (l.late ? 'late' : 'ok') : 'drop') + '" style="left:' + pct(l.t) + '%;top:' + (8 + (j % 3) * 15) + 'px" title="#' + (j + 1) + ' at ' + hh(l.t) + (l.ok ? '' : ' — dropped') + '">' + (j + 1) + '</span>';
      }).join('') + (r.st >= 0 ? '<span class="kw-stl" style="left:' + pct(r.st) + '%"><em>stream time ' + hh(r.st) + '</em></span>' : '');
      var last = r.log[r.log.length - 1];
      q('.kw-st').innerHTML = !evs.length ? 'Click the timeline above to add a record at that time, or press <b>Load example</b>.' :
        'Last record #' + evs.length + ' at <b>' + hh(last.t) + '</b>' + (last.late ? ' (late — stream time is ' + hh(r.st) + ')' : '') + ': ' +
        (last.ok ? (last.merged ? '<span class="kw-good">accepted and merged two sessions</span>' : '<span class="kw-good">accepted</span>') : '<span class="kw-bad">dropped — its window is already closed</span>');
      var wl = function (w) {
        return '<b>' + (r.session ? '[' + hh(w.s) + ' – ' + hh(w.e) + ']' : '[' + hh(w.s) + ', ' + hh(w.e) + ')') + '</b> count <b>' + w.c + '</b>' +
          (w.drop ? ' · ' + w.drop + ' dropped' : '') + (w.merged ? ' · merged' : '') +
          ' · ' + (w.closed ? 'closed' : 'open until stream time ' + hh(r.close(w)));
      };
      // each window: its label, then a bar on the same 10:00–11:00 scale as the timeline above
      q('.kw-wins').innerHTML = r.list.map(function (w) {
        return '<div class="kw-win' + (w.closed ? ' closed' : '') + '"><div class="kw-wl">' + wl(w) + '</div><div class="kw-track"><div class="kw-bar" style="left:' + pct(w.s) + '%;width:' + Math.max(1.2, pct(w.e) - pct(w.s)) + '%"></div></div></div>';
      }).join('');
    };
    q('.kw-time').addEventListener('click', function (e) {
      var b = q('.kw-time').getBoundingClientRect(), m = Math.round((e.clientX - b.left) / b.width * (T1 - T0) + T0);
      if (m >= T0 && m < T1) { evs.push(m); draw(); }
    });
    q('.kw-demo').addEventListener('click', function () { evs = q('.kw-wt').value === 'session' ? [27, 29, 36, 32] : [31, 32, 41, 33]; draw(); });
    q('.kw-undo').addEventListener('click', function () { evs.pop(); draw(); });
    q('.kw-clear').addEventListener('click', function () { evs = []; draw(); });
    root.querySelectorAll('select').forEach(function (s) { s.addEventListener('change', draw); });
    draw();
  };

  /* =====================================================================
     4. Step-through flows — Next / Back / Play over a list of steps
     ===================================================================== */
  W.steps = function (root) {
    var data = (window.KD_FLOWS || {})[root.dataset.flow];
    if (!data) return;
    var lanes = data.lanes, steps = data.steps, i = 0, timer = null;
    root.innerHTML =
      '<div class="kw-head"><span class="kw-tag">Step through</span><b>' + esc(data.title) + '</b><span class="kw-sub">' + steps.length + ' steps · use Next / Back or the arrow keys</span></div>' +
      '<div class="kw-stage"><div class="kw-lanes">' + lanes.map(function (l, k) { return '<div class="kw-lane" data-k="' + k + '"><div class="kw-lh">' + esc(l.name) + '</div><div class="kw-lst"></div></div>'; }).join('') + '</div>' +
      '<div class="kw-msg"></div></div>' +
      '<div class="kw-cap" aria-live="polite"></div>' +
      '<div class="kw-nav"><button type="button" class="kw-btn ghost kw-prev">← Back</button><span class="kw-dots"></span><button type="button" class="kw-btn kw-next">Next →</button><button type="button" class="kw-btn ghost kw-play">▶ Play</button></div>';
    var q = function (s) { return root.querySelector(s); }, laneEls = root.querySelectorAll('.kw-lane');
    q('.kw-dots').innerHTML = steps.map(function (_, k) { return '<button type="button" class="kw-dot" aria-label="Step ' + (k + 1) + '" data-k="' + k + '"></button>'; }).join('');
    var show = function (k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      var s = steps[i], state = {};
      for (var j = 0; j <= i; j++) { var sj = steps[j]; if (sj.set) Object.keys(sj.set).forEach(function (x) { state[x] = sj.set[x]; }); }
      laneEls.forEach(function (le, n) {
        var on = s.from === n || s.to === n || (s.at && s.at.indexOf(n) >= 0);
        le.classList.toggle('on', !!on);
        le.querySelector('.kw-lst').innerHTML = state[n] != null ? state[n] : '';
      });
      var m = q('.kw-msg');
      if (s.from != null && s.to != null) {
        var a = laneEls[s.from].getBoundingClientRect(), b = laneEls[s.to].getBoundingClientRect(), c = q('.kw-lanes').getBoundingClientRect();
        var x1 = a.left + a.width / 2 - c.left, x2 = b.left + b.width / 2 - c.left;
        m.className = 'kw-msg show' + (s.kind ? ' ' + s.kind : '') + (x2 < x1 ? ' rev' : '');
        m.style.left = Math.min(x1, x2) + 'px'; m.style.width = Math.abs(x2 - x1) + 'px';
        m.innerHTML = '<span>' + s.msg + '</span>';
        // keep the label inside the lanes box: centre it over the arrow, then clamp to both edges.
        // The span is positioned relative to the arrow (m), whose left edge is at min(x1, x2) in lane coordinates.
        var sp = m.firstChild, cw = q('.kw-lanes').clientWidth, left0 = Math.min(x1, x2);
        sp.style.maxWidth = (cw - 4) + 'px';
        var sw = sp.offsetWidth, mid = left0 + Math.abs(x2 - x1) / 2;
        var centreLeft = Math.max(2, Math.min(cw - 2 - sw, mid - sw / 2)); // desired left edge in lane coords
        sp.style.left = (centreLeft - left0) + 'px'; sp.style.transform = 'none';
      } else { m.className = 'kw-msg'; m.innerHTML = ''; }
      q('.kw-cap').innerHTML = '<b class="kw-cn">Step ' + (i + 1) + ' / ' + steps.length + (s.label ? ' · ' + s.label : '') + '</b><span>' + s.text + '</span>';
      // narrow screens: lanes scroll sideways — bring the active part of this step into view
      var stage = q('.kw-stage');
      if (stage.scrollWidth > stage.clientWidth + 4) {
        var act = [s.from, s.to].concat(s.at || []).filter(function (x) { return x != null; });
        if (act.length) {
          var lo = Math.min.apply(null, act.map(function (x) { return laneEls[x].offsetLeft; })),
            hi = Math.max.apply(null, act.map(function (x) { return laneEls[x].offsetLeft + laneEls[x].offsetWidth; }));
          var target = (hi - lo) > stage.clientWidth ? lo - 8 : (lo + hi) / 2 - stage.clientWidth / 2;
          stage.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        }
        stage.classList.add('can-scroll');
      } else { stage.classList.remove('can-scroll'); }
      root.querySelectorAll('.kw-dot').forEach(function (d, n) { d.classList.toggle('on', n === i); d.classList.toggle('done', n < i); });
      q('.kw-prev').disabled = i === 0; q('.kw-next').disabled = i === steps.length - 1;
    };
    var stop = function () { clearInterval(timer); timer = null; q('.kw-play').textContent = '▶ Play'; };
    q('.kw-next').addEventListener('click', function () { stop(); show(i + 1); });
    q('.kw-prev').addEventListener('click', function () { stop(); show(i - 1); });
    q('.kw-dots').addEventListener('click', function (e) { var d = e.target.closest('.kw-dot'); if (d) { stop(); show(+d.dataset.k); } });
    q('.kw-play').addEventListener('click', function () {
      if (timer) return stop();
      if (i === steps.length - 1) show(0);
      q('.kw-play').textContent = '❚❚ Pause';
      timer = setInterval(function () { if (i >= steps.length - 1) stop(); else show(i + 1); }, 2600);
    });
    root.tabIndex = 0;
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); stop(); show(i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); show(i - 1); } });
    window.addEventListener('resize', function () { show(i); });
    show(0);
  };

  document.querySelectorAll('.kw[data-widget]').forEach(function (root) {
    try { (W[root.dataset.widget] || function () {})(root); } catch (e) { root.innerHTML = '<div class="kw-note">This interactive example could not load.</div>'; console.error(e); }
  });
})();
