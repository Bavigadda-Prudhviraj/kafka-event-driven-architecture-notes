// Builds kafka-docs/*.html from template.html + content/NN.html fragments.
// Usage: node _build/build.js            (builds every page whose fragment exists)
//        node _build/build.js 1 2        (builds only the listed page numbers)
const fs = require('fs');
const path = require('path');
const site = require('./pages');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'kafka-docs');
const CONTENT = path.join(__dirname, 'content');
// Interactive widgets (assets/widgets.js) placed into chapters without editing the chapter files:
// each entry inserts a placeholder just BEFORE the given anchor (the next heading after the topic it belongs to).
const WIDGETS = {
  2: [
    { before: '<h3 id="custom-partitioning">', html: '<div class="kw" data-widget="partition" data-partitions="3"></div>' },
    { before: '<div class="diagram">\n  <div class="diagram-head"><span class="dt">Consumer join, offset fetch, read and commit</span>', html: '<div class="kw" data-widget="steps" data-flow="consumerRead"></div>' },
  ],
  4: [{ before: '<h2 id="accumulator"', html: '<div class="kw" data-widget="partition" data-partitions="3"></div>' }],
  6: [{ before: '<h2 id="dependency">', html: '<div class="kw" data-widget="steps" data-flow="consumerRead"></div>' }],
  9: [{ before: '<h3 id="assignor-config">', html: '<div class="kw" data-widget="groups" data-partitions="6"></div>' }],
  10: [
    { before: '<h2 id="step4">', html: '<div class="kw" data-widget="steps" data-flow="zombieFencing"></div>' },
    { before: '<h2 id="implementation">', html: '<div class="kw" data-widget="steps" data-flow="twoPhaseCommit"></div>' },
  ],
  20: [
    { before: '<h3 id="tumbling-api">', html: '<div class="kw" data-widget="steps" data-flow="windowGrace"></div>' },
    { before: '<h2 id="compare">', html: '<div class="kw" data-widget="windows"></div>' },
  ],
};
function addWidgets(n, html) {
  (WIDGETS[n] || []).forEach((w) => {
    const at = html.indexOf(w.before);
    if (at < 0) throw new Error(`chapter ${n}: widget anchor not found: ${w.before}`);
    html = html.slice(0, at) + w.html + '\n' + html.slice(at);
  });
  return html;
}
const flowsJson = JSON.stringify(require('./flows')).replace(/</g, '\\u003c');

// Glossary terms are embedded once into the template; the page script adds hover/tap definitions.
const glossary = require('./glossary');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const glossaryJson = JSON.stringify(glossary.map((g) => ({
  t: g.term, m: g.match, d: g.def, id: slug(g.term), f: site.pages.find((p) => p.n === g.ch).file, n: g.ch,
}))).replace(/</g, '\\u003c');
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8').replace('{{GLOSSARY}}', () => glossaryJson).replace('{{FLOWS}}', () => flowsJson);
fs.mkdirSync(OUT, { recursive: true });
// Copy hand-written assets (widgets.js) into the docs folder; mermaid and fonts already live there.
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.readdirSync(path.join(__dirname, 'assets')).forEach((f) => fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(OUT, 'assets', f)));

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const pad = (n) => String(n).padStart(2, '0');

function parseFragment(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: missing <!--meta {...} --> header`);
  return { meta: JSON.parse(m[1]), html: raw.slice(m[0].length) };
}

function sidebar(activeN) {
  return site.groups.map((g) => {
    const links = site.pages.filter((p) => p.group === g).map((p) => isBuilt(p)
      ? `    <a class="side-link${p.n === activeN ? ' active' : ''}" href="${p.file}"><span class="num">${pad(p.n)}</span><span>${p.short}</span></a>`
      : `    <span class="side-link soon" title="Coming soon"><span class="num">${pad(p.n)}</span><span>${p.short}</span><em>soon</em></span>`
    ).join('\n');
    return `  <div class="side-group">\n    <h4>${g}</h4>\n${links}\n  </div>`;
  }).join('\n');
}

function pager(p) {
  const prev = site.pages.find((x) => x.n === p.n - 1);
  const next = site.pages.find((x) => x.n === p.n + 1);
  const prevHtml = prev
    ? `<a class="prev" href="${prev.file}"><small>&larr; Previous &middot; ${pad(prev.n)}</small><b>${prev.title}</b></a>`
    : `<a class="prev" href="index.html"><small>&larr; Back to</small><b>Documentation Home</b></a>`;
  const nextHtml = next && !isBuilt(next)
    ? `<span class="next ph-soon"><small>Next &middot; ${pad(next.n)} &middot; coming soon</small><b>${next.title}</b></span>`
    : next
    ? `<a class="next" href="${next.file}"><small>Next &middot; ${pad(next.n)} &rarr;</small><b>${next.title}</b></a>`
    : `<a class="next" href="index.html"><small>Finished &rarr;</small><b>Back to Documentation Home</b></a>`;
  return `<nav class="pager" aria-label="Page navigation">\n  ${prevHtml}\n  <a class="home" href="index.html" title="Documentation Home">&#8962; Home</a>\n  ${nextHtml}\n</nav>`;
}

function related(meta) {
  if (!meta.related || !meta.related.length) return '';
  const cards = meta.related.map((r) => {
    const p = site.pages.find((x) => x.n === r.n);
    const body = `<small>${pad(p.n)} &middot; ${p.group}</small><span>${p.title}</span><em>${r.why}</em>`;
    return isBuilt(p)
      ? `  <a href="${p.file}">${body}</a>`
      : `  <div class="soon" title="Coming soon">${body}<i>Coming soon</i></div>`;
  }).join('\n');
  return `\n<h2 id="related-topics">Related Topics</h2>\n<div class="related">\n${cards}\n</div>\n`;
}

// <!--svg:NAME--> placeholders become hand-laid-out SVG diagrams from svg.js.
const { diagrams } = require('./svg');
function expandSvg(html) {
  return html.replace(/<!--svg:(\w+)-->/g, (m, name) => {
    if (!diagrams[name]) throw new Error(`unknown svg diagram: ${name}`);
    return diagrams[name]();
  });
}

// Inline links to chapters that are not written yet become plain "coming soon" text.
function disableUnbuiltLinks(html) {
  return site.pages.filter((p) => !isBuilt(p)).reduce((h, p) =>
    h.replace(new RegExp(`<a href="${p.file.replace(/\./g, '\\.')}(#[^"]*)?">([\\s\\S]*?)</a>`, 'g'),
      '<span class="soon-link" title="Coming soon">$2</span>'), html);
}

// "Test yourself" interview-prep questions from quiz.js, with answers revealed on click.
const quizzes = require('./quiz');
const LEVELS = { 1: 'SDE1', 2: 'SDE2', 3: 'SDE3' };
const levelBadge = (lv) => `<span class="lv lv${lv}" title="${{ 1: 'Fundamentals', 2: 'Applied / how it works', 3: 'Design & production troubleshooting' }[lv]}">${LEVELS[lv]}</span>`;
function quiz(n) {
  const qs = quizzes[n];
  if (!qs || !qs.length) return '';
  const items = qs.map(([q, a, lv], i) => `  <div class="qi">
    <div class="qh"><span class="qn">${i + 1}</span><div class="qq">${q} ${levelBadge(lv)}</div><button class="qbtn" type="button" aria-expanded="false">Show answer</button></div>
    <div class="qa"><p>${a}</p></div>
  </div>`).join('\n');
  return `
<h2 id="quiz">Test Yourself</h2>
<section class="quiz" aria-label="Interview practice questions">
  <p>${qs.length} quick interview-style questions on this chapter. Try to answer before revealing.</p>
  <div class="qtools"><button type="button" data-q="all">Show all answers</button><button type="button" data-q="none">Hide all</button></div>
${items}
</section>
`;
}

function words(html) {
  return html.replace(/<div class="mermaid[^"]*">[\s\S]*?<\/div>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

// Mermaid reserves some words; using them as classDef / node ids renders a "Syntax error" bomb.
const RESERVED = /\b(?:classDef|class)\s+(?:[\w,]*,)?(call|click|end|style|default|graph|subgraph|href|callback)\b/;
function lintMermaid(html, file) {
  const blocks = html.match(/<div class="mermaid[^"]*">[\s\S]*?<\/div>/g) || [];
  blocks.forEach((b) => {
    const m = b.match(RESERVED);
    if (m) throw new Error(`${file}: Mermaid reserved word "${m[1]}" used as a class/style name`);
  });
}

function buildPage(p) {
  const file = path.join(CONTENT, `${pad(p.n)}.html`);
  if (!fs.existsSync(file)) return false;
  const { meta, html } = parseFragment(file);
  lintMermaid(html, file);
  const mins = Math.max(3, Math.round(words(html) / 200));
  const hero = `<section class="hero">
  <span class="chapter">Chapter ${pad(p.n)} &middot; ${p.group}</span>
  <h1>${p.title}</h1>
  <p class="lead">${meta.lead}</p>
  <div class="meta">
    <span>&#9998; Author: <b>${site.author}</b></span>
    <span>&#128197; Source notes: <b>${meta.date}</b></span>
    <span>&#9201; ~${mins} min read</span>
    <span>&#128196; Source: <b>${p.pdf}</b></span>
  </div>
</section>`;
  const crumb = `<div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>${p.group}</span><span>/</span><span>${p.short}</span></div>`;
  const out = template
    .replace(/{{AUTHOR}}/g, site.author)
    .replace('{{PAGE_TITLE}}', `${pad(p.n)}. ${p.title} | ${site.siteTitle}`)
    .replace('{{DESCRIPTION}}', escAttr(meta.lead.replace(/<[^>]+>/g, '')))
    .replace('{{PAGE_NUM}}', String(p.n))
    .replace('{{SIDEBAR}}', sidebar(p.n))
    .replace('{{BREADCRUMB}}', crumb)
    .replace('{{HERO}}', hero)
    .replace('{{CONTENT}}', () => disableUnbuiltLinks(expandSvg(addWidgets(p.n, html))) + quiz(p.n) + related(meta))
    .replace('{{PAGER}}', pager(p));
  fs.writeFileSync(path.join(OUT, p.file), out);
  console.log(`built ${p.file}  (~${mins} min, ${words(html)} words)`);
  return true;
}

const isBuilt = (p) => fs.existsSync(path.join(CONTENT, `${pad(p.n)}.html`));

function buildIndex() {
  const done = site.pages.filter(isBuilt).length;
  const hero = `<section class="hero">
  <span class="chapter">Documentation Home &middot; ${site.pages.length} Chapters</span>
  <h1>Apache Kafka Documentation</h1>
  <p class="lead">A structured, end-to-end guide to Apache Kafka — from Event Driven Architecture fundamentals, through cluster, producer and consumer setup, transactions, Schema Registry and the Outbox pattern, to Kafka Streams processing and windowing. Each chapter explains the concepts, architecture diagrams, configurations, code and logs in a clear learning sequence.</p>
  <div class="meta">
    <span>&#9998; Author: <b>${site.author}</b></span>
    <span>&#128218; Chapters: <b>${site.pages.length}</b></span>
    <span>&#9989; Available now: <b>${done} / ${site.pages.length}</b></span>
  </div>
</section>`;
  const first = site.pages.find(isBuilt);
  const intro = `
<h2 id="about"><span class="sec-num">1</span>About this Documentation</h2>
<p>This documentation turns a complete Apache Kafka learning series into an interconnected reference. The chapters follow the order in which the topics build on each other: first <strong>why</strong> event-driven systems exist, then <strong>how</strong> Kafka is built, then how to <strong>produce</strong> and <strong>consume</strong> reliably, how to keep data <strong>consistent</strong>, and finally how to <strong>process streams</strong> with Kafka Streams.</p>
${first ? `<p><a class="home-btn-inline" href="${first.file}">Start reading &rarr; ${pad(first.n)}. ${first.title}</a></p>` : ''}
<div class="callout tip"><span class="ci">&#127891;</span><div><p><strong>Revising for an interview?</strong> The <a href="interview-questions.html">Interview Question Bank</a> collects every question in one place — filter by part and by SDE1 / SDE2 / SDE3 level, with extra scenario and system-design questions. Every chapter also ends with a <strong>Test Yourself</strong> section, the <a href="cheatsheet.html">Configuration Cheat Sheet</a> lists every property used in the chapters with its default, and the <a href="glossary.html">Glossary</a> defines every key term (hover any dotted-underlined term in a chapter to see it).</p></div></div>

<h2 id="learning-path"><span class="sec-num">2</span>Learning Path</h2>
<div class="diagram">
  <div class="diagram-head"><span class="dt">How the five parts connect</span><span class="db">flowchart</span></div>
  <div class="diagram-body">
<div class="mermaid">
flowchart LR
    A["Foundations&lt;br/&gt;01–02"] --> B["Cluster &amp; Producer&lt;br/&gt;03–05"] --> C["Consumer&lt;br/&gt;06–09"] --> D["Transactions &amp; Patterns&lt;br/&gt;10–13"] --> E["Kafka Streams&lt;br/&gt;14–20"]
    classDef s fill:#111a2e,stroke:#ea580c,color:#fff,stroke-width:2px
    class A,B,C,D,E s
</div>
  </div>
  <div class="diagram-explain">
    <h4>Reading order</h4>
    <ul>
      <li><strong>Foundations</strong> — the event-driven mindset and Kafka's architecture.</li>
      <li><strong>Cluster &amp; Producer</strong> — running a cluster and writing data into it without duplicates.</li>
      <li><strong>Consumer</strong> — reading data, consumer internals, error handling and configuration.</li>
      <li><strong>Transactions &amp; Patterns</strong> — Kafka transactions, schema management and the Outbox pattern.</li>
      <li><strong>Kafka Streams</strong> — continuous processing: streams, tables, SerDes, stateless/stateful nodes and windows.</li>
    </ul>
  </div>
</div>

<h2 id="chapters"><span class="sec-num">3</span>All Chapters</h2>
`;
  const groups = site.groups.map((g) => {
    const cards = site.pages.filter((p) => p.group === g).map((p) => {
      const body = `<small>Chapter ${pad(p.n)}</small><span>${p.title}</span><em>${p.desc}</em>`;
      return isBuilt(p)
        ? `  <a class="chapter-card" href="${p.file}">${body}<i class="status ok">Available</i></a>`
        : `  <div class="chapter-card soon" title="This chapter is being written">${body}<i class="status">Coming soon</i></div>`;
    }).join('\n');
    return `<h3>${g}</h3>\n<div class="chapter-grid">\n${cards}\n</div>`;
  }).join('\n');
  const out = template
    .replace(/{{AUTHOR}}/g, site.author)
    .replace('{{PAGE_TITLE}}', `${site.siteTitle} | Home`)
    .replace('{{DESCRIPTION}}', 'Apache Kafka Documentation — complete learning and reference guide.')
    .replace('{{PAGE_NUM}}', '0')
    .replace('{{SIDEBAR}}', sidebar(0))
    .replace('{{BREADCRUMB}}', '')
    .replace('{{HERO}}', hero)
    .replace('{{CONTENT}}', () => intro + groups)
    .replace('{{PAGER}}', '');
  fs.writeFileSync(path.join(OUT, 'index.html'), out.replace('<a class="side-home" href', '<a class="side-home active" href'));
  console.log(`built index.html  (${done}/${site.pages.length} chapters available)`);
}

// Cheat sheet: every config property from all chapters, generated from cheatsheet.js.
function buildCheatsheet() {
  const cs = require('./cheatsheet');
  const chap = (n) => {
    const p = site.pages.find((x) => x.n === n);
    return `<a class="cs-chip" href="${p.file}" title="${escAttr(p.title)}">${pad(n)}</a>`;
  };
  const total = cs.sections.reduce((a, s) => a + s.rows.length, 0);
  const sections = cs.sections.map((s, i) => `
<h2 id="${s.id}"><span class="sec-num">${i + 1}</span>${s.title}</h2>
<div class="table-wrap">
  <table class="cs-table">
    <thead><tr><th>Property</th><th>Default</th><th>Used in the docs</th><th>What it does</th><th>Chapter</th></tr></thead>
    <tbody>
${s.rows.map(([name, def, used, what, ch]) => `      <tr><td><code>${name}</code></td><td>${def}</td><td>${used}</td><td>${what}</td><td>${ch.map(chap).join(' ')}</td></tr>`).join('\n')}
    </tbody>
  </table>
</div>`).join('\n');
  const hero = `<section class="hero">
  <span class="chapter">Reference &middot; ${total} properties</span>
  <h1>Configuration Cheat Sheet</h1>
  <p class="lead">Every Kafka, Spring Kafka, Schema Registry, Debezium and Kafka Streams property used in the 20 chapters — with its default, the value used in the docs, and a link to the chapter that explains it.</p>
  <div class="meta"><span>&#9998; Author: <b>${site.author}</b></span><span>&#128218; Sections: <b>${cs.sections.length}</b></span></div>
</section>`;
  const filter = `<div class="callout note"><span class="ci">&#8505;</span><div><p>${cs.intro}</p></div></div>
<input class="cs-filter" id="csFilter" type="search" placeholder="Filter properties… e.g. timeout, acks, serde" aria-label="Filter properties">
<p class="cs-count" id="csCount"></p>`;
  const crumb = `<div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Reference</span><span>/</span><span>Cheat Sheet</span></div>`;
  const out = template
    .replace(/{{AUTHOR}}/g, site.author)
    .replace('{{PAGE_TITLE}}', `Configuration Cheat Sheet | ${site.siteTitle}`)
    .replace('{{DESCRIPTION}}', 'Every Kafka configuration property from the documentation in one table.')
    .replace('{{PAGE_NUM}}', '0')
    .replace('{{SIDEBAR}}', sidebar(0))
    .replace('{{BREADCRUMB}}', crumb)
    .replace('{{HERO}}', hero)
    .replace('{{CONTENT}}', () => filter + sections)
    .replace('{{PAGER}}', `<nav class="pager" aria-label="Page navigation">\n  <a class="prev" href="index.html"><small>&larr; Back to</small><b>Documentation Home</b></a>\n  <a class="home" href="index.html" title="Documentation Home">&#8962; Home</a>\n  <a class="next" href="${site.pages[0].file}"><small>Start reading &rarr;</small><b>${site.pages[0].title}</b></a>\n</nav>`);
  fs.writeFileSync(path.join(OUT, 'cheatsheet.html'), out.replace('<a class="side-home side-cheat" href', '<a class="side-home side-cheat active" href'));
  console.log(`built cheatsheet.html  (${total} properties)`);
}

// Interview question bank: every chapter quiz question plus extra scenario questions, filterable by part and level.
function buildQuestionBank() {
  const extra = require('./bank-extra');
  const all = [];
  site.pages.forEach((p) => (quizzes[p.n] || []).forEach(([q, a, lv]) => all.push({ q, a, lv, ch: [p.n], kind: 'quiz' })));
  extra.forEach((e) => all.push({ q: e.q, a: e.a, lv: e.level, ch: e.ch, kind: 'scenario' }));
  const partOf = (x) => site.pages.find((p) => p.n === x.ch[0]).group;
  const count = (f) => all.filter(f).length;
  const chips = (x) => x.ch.map((n) => {
    const p = site.pages.find((y) => y.n === n);
    return `<a class="cs-chip" href="${p.file}#quiz" title="${escAttr(p.title)}">${pad(n)}</a>`;
  }).join(' ');
  let num = 0;
  const sections = site.groups.map((g, gi) => {
    const qs = all.filter((x) => partOf(x) === g).sort((a, b) => a.lv - b.lv || a.ch[0] - b.ch[0]);
    const items = qs.map((x) => `  <div class="qi" data-part="${gi}" data-lv="${x.lv}">
    <div class="qh"><span class="qn">${++num}</span><div class="qq">${x.q} ${levelBadge(x.lv)}${x.kind === 'scenario' ? ' <span class="lv lvs" title="Scenario / design question, only on this page">Scenario</span>' : ''}</div><button class="qbtn" type="button" aria-expanded="false">Show answer</button></div>
    <div class="qa"><p>${x.a}</p><p class="qsrc">Chapter: ${chips(x)}</p></div>
  </div>`).join('\n');
    return `<h2 id="part-${gi}" data-part="${gi}"><span class="sec-num">${gi + 1}</span>${g}</h2>
<div class="qgroup" data-part="${gi}">
${items}
</div>`;
  }).join('\n');
  const btn = (attr, val, label, n) => `<button type="button" class="fbtn${val === 'all' ? ' on' : ''}" data-${attr}="${val}">${label} <em>${n}</em></button>`;
  const controls = `
<div class="callout key"><span class="ci">&#127919;</span><div>
  <p><strong>How to use this page:</strong> pick a part and a level, try to answer out loud, then reveal. <span class="lv lv1">SDE1</span> = fundamentals and definitions · <span class="lv lv2">SDE2</span> = how it works, configs and trade-offs · <span class="lv lv3">SDE3</span> = design, failure scenarios and production troubleshooting. Questions marked <span class="lv lvs">Scenario</span> appear only here; the rest are the chapters' Test Yourself questions.</p>
</div></div>
<div class="qbank-filters">
  <div class="frow"><span class="flab">Part</span>${btn('fpart', 'all', 'All', all.length)}${site.groups.map((g, gi) => btn('fpart', gi, g, count((x) => partOf(x) === g))).join('')}</div>
  <div class="frow"><span class="flab">Level</span>${btn('flv', 'all', 'All', all.length)}${[1, 2, 3].map((l) => btn('flv', l, LEVELS[l], count((x) => x.lv === l))).join('')}</div>
  <div class="frow"><input class="cs-filter" id="qbSearch" type="search" placeholder="Search questions and answers… e.g. ISR, rebalance, grace" aria-label="Search questions"></div>
  <div class="frow qbar"><span class="cs-count" id="qbCount"></span><span class="qtools" style="margin:0"><button type="button" data-q="all">Show all answers</button><button type="button" data-q="none">Hide all</button></span></div>
</div>`;
  const hero = `<section class="hero">
  <span class="chapter">Reference &middot; ${all.length} questions</span>
  <h1>Interview Question Bank</h1>
  <p class="lead">Every Test Yourself question from the 20 chapters plus extra scenario and system-design questions, grouped by part and tagged SDE1, SDE2 or SDE3 — filter, try to answer, then reveal.</p>
  <div class="meta"><span>&#9998; Author: <b>${site.author}</b></span><span>SDE1: <b>${count((x) => x.lv === 1)}</b></span><span>SDE2: <b>${count((x) => x.lv === 2)}</b></span><span>SDE3: <b>${count((x) => x.lv === 3)}</b></span></div>
</section>`;
  const crumb = `<div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Reference</span><span>/</span><span>Interview Questions</span></div>`;
  const out = template
    .replace(/{{AUTHOR}}/g, site.author)
    .replace('{{PAGE_TITLE}}', `Interview Question Bank | ${site.siteTitle}`)
    .replace('{{DESCRIPTION}}', 'Kafka interview questions for SDE1, SDE2 and SDE3, grouped by topic with answers.')
    .replace('{{PAGE_NUM}}', '0')
    .replace('{{SIDEBAR}}', sidebar(0))
    .replace('{{BREADCRUMB}}', crumb)
    .replace('{{HERO}}', hero)
    .replace('{{CONTENT}}', () => `<section class="quiz qbank">${controls}\n${sections}\n</section>`)
    .replace('{{PAGER}}', `<nav class="pager" aria-label="Page navigation">\n  <a class="prev" href="cheatsheet.html"><small>&larr; Reference</small><b>Configuration Cheat Sheet</b></a>\n  <a class="home" href="index.html" title="Documentation Home">&#8962; Home</a>\n  <a class="next" href="${site.pages[0].file}"><small>Start reading &rarr;</small><b>${site.pages[0].title}</b></a>\n</nav>`);
  fs.writeFileSync(path.join(OUT, 'interview-questions.html'), out.replace('<a class="side-home side-qbank" href', '<a class="side-home side-qbank active" href'));
  console.log(`built interview-questions.html  (${all.length} questions: SDE1 ${count((x) => x.lv === 1)}, SDE2 ${count((x) => x.lv === 2)}, SDE3 ${count((x) => x.lv === 3)})`);
}

// Glossary page: every term A–Z with its definition and the chapter that explains it.
function buildGlossary() {
  const terms = [...glossary].sort((a, b) => a.term.replace(/^_+/, '').localeCompare(b.term.replace(/^_+/, ''), 'en', { sensitivity: 'base' }));
  let letter = '';
  const items = terms.map((g) => {
    const p = site.pages.find((x) => x.n === g.ch);
    const L = g.term.replace(/^_+/, '')[0].toUpperCase();
    const head = L !== letter ? `<div class="gl-letter">${(letter = L)}</div>` : '';
    return `${head}<div class="gl-item" id="${slug(g.term)}"><h4>${escAttr(g.term)}<a class="cs-chip" href="${p.file}" title="${escAttr(p.title)}">${pad(p.n)}</a></h4><p>${escAttr(g.def)}</p></div>`;
  }).join('\n');
  const hero = `<section class="hero">
  <span class="chapter">Reference &middot; ${terms.length} terms</span>
  <h1>Glossary</h1>
  <p class="lead">Every key Kafka term used in the chapters, in one line each, with a link to the chapter that explains it. In the chapters, terms with a dotted underline show this definition when you hover over them or tap them.</p>
  <div class="meta"><span>&#9998; Author: <b>${site.author}</b></span></div>
</section>`;
  const body = `<input class="cs-filter" id="glFilter" type="search" placeholder="Filter terms… e.g. offset, transaction, window" aria-label="Filter glossary">
<p class="cs-count" id="glCount">${terms.length} terms</p>
<div class="gl-list" id="glList">
${items}
</div>
<script>(function () {
  var f = document.getElementById('glFilter'), c = document.getElementById('glCount'), items = document.querySelectorAll('.gl-item'), letters = document.querySelectorAll('.gl-letter');
  f.addEventListener('input', function () {
    var q = f.value.toLowerCase().trim(), n = 0;
    items.forEach(function (i) { var ok = !q || i.textContent.toLowerCase().indexOf(q) >= 0; i.style.display = ok ? '' : 'none'; if (ok) n++; });
    letters.forEach(function (l) { var e = l.nextElementSibling, any = false; while (e && e.classList.contains('gl-item')) { if (e.style.display !== 'none') any = true; e = e.nextElementSibling; } l.style.display = any ? '' : 'none'; });
    c.textContent = q ? n + ' of ' + items.length + ' terms' : items.length + ' terms';
  });
})();</script>`;
  const crumb = `<div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Reference</span><span>/</span><span>Glossary</span></div>`;
  const out = template
    .replace(/{{AUTHOR}}/g, site.author)
    .replace('{{PAGE_TITLE}}', `Glossary | ${site.siteTitle}`)
    .replace('{{DESCRIPTION}}', 'Kafka glossary: one-line definitions of every key term in the documentation.')
    .replace('{{PAGE_NUM}}', '0')
    .replace('<body data-page="0">', '<body data-page="0" class="no-glossary">')
    .replace('{{SIDEBAR}}', sidebar(0))
    .replace('{{BREADCRUMB}}', crumb)
    .replace('{{HERO}}', hero)
    .replace('{{CONTENT}}', () => body)
    .replace('{{PAGER}}', `<nav class="pager" aria-label="Page navigation">\n  <a class="prev" href="interview-questions.html"><small>&larr; Reference</small><b>Interview Question Bank</b></a>\n  <a class="home" href="index.html" title="Documentation Home">&#8962; Home</a>\n  <a class="next" href="${site.pages[0].file}"><small>Start reading &rarr;</small><b>${site.pages[0].title}</b></a>\n</nav>`);
  fs.writeFileSync(path.join(OUT, 'glossary.html'), out.replace('<a class="side-home side-gloss" href', '<a class="side-home side-gloss active" href'));
  console.log(`built glossary.html  (${terms.length} terms)`);
}

const only = process.argv.slice(2).map(Number);
site.pages.filter((p) => !only.length || only.includes(p.n)).forEach(buildPage);
buildIndex(); // always refresh so availability badges stay current
buildCheatsheet();
buildQuestionBank();
buildGlossary();
