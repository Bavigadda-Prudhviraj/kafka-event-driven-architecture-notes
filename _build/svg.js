// Hand-laid-out SVG architecture diagrams (Producer -> Broker/Topic/Partitions <- Consumer groups).
// Used from content fragments as  <!--svg:NAME-->  where NAME is a key of `diagrams` below.
let uid = 0;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function brokerDiagram(o) {
  const id = `ar${++uid}`;
  const parts = o.partitions;
  const ROW = 50, CELLS = o.cells || 6, CW = 26, CH = 24;
  const prodW = o.producer ? 120 : 0;
  const bx = o.producer ? 190 : 20, by = 20;
  const topicPadTop = 58, rowsH = parts.length * ROW;
  const bw = 72 + CELLS * CW + 40, bh = topicPadTop + rowsH + 34;
  const gx = bx + bw + 150, gw = 250;
  const rowY = (i) => by + topicPadTop + 18 + i * ROW;           // top of the cell strip of row i
  const out = [];
  const cons = [];
  // consumer groups (right column)
  let gy = by, gHeights = 0;
  (o.groups || []).forEach((g) => {
    const h = 40 + g.consumers.length * 44 + 6;
    out.push(`<rect class="grp" x="${gx}" y="${gy}" width="${gw}" height="${h}" rx="10"/>`);
    out.push(`<text class="t-h" x="${gx + gw / 2}" y="${gy + 24}" text-anchor="middle">${esc(g.label)}</text>`);
    g.consumers.forEach((c, i) => {
      const cy = gy + 40 + i * 44;
      if (c.dots) { out.push(`<text class="t-m" x="${gx + gw / 2}" y="${cy + 22}" text-anchor="middle">&#8942;</text>`); return; }
      out.push(`<rect class="cons" x="${gx + 45}" y="${cy}" width="${gw - 90}" height="34" rx="7"/>`);
      out.push(`<text x="${gx + gw / 2}" y="${cy + 22}" text-anchor="middle">${esc(c.label)}</text>`);
      if (c.to !== undefined) cons.push({ x: gx + 45, y: cy + 17, to: c.to, label: c.label2 });
    });
    gy += h + 22; gHeights = gy - 22;
  });
  const H = Math.max(by + bh, gHeights) + 20;
  const W = (o.groups && o.groups.length) ? gx + gw + 20 : bx + bw + 20;
  // broker + topic
  out.unshift(
    `<rect class="broker" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12"/>`,
    `<text class="t-h" x="${bx + bw / 2}" y="${by + 22}" text-anchor="middle">${esc(o.broker || 'Kafka Broker')}</text>`,
    `<rect class="topic" x="${bx + 14}" y="${by + 34}" width="${bw - 28}" height="${bh - 48}" rx="8"/>`,
    `<text class="t-s" x="${bx + bw / 2}" y="${by + 52}" text-anchor="middle">Topic name = ${esc(o.topic)}</text>`
  );
  parts.forEach((p, i) => {
    const y = rowY(i);
    if (p.dots) { out.push(`<text class="t-m" x="${bx + bw / 2}" y="${y + 18}" text-anchor="middle">&#8942;</text>`); return; }
    out.push(`<text class="t-h" x="${bx + 30}" y="${y + 17}">${esc(p.label)}</text>`);
    for (let c = 0; c < CELLS; c++) {
      const ev = p.events && p.events[c];
      out.push(`<rect class="cell${p.hot ? ' hot' : ''}${ev ? ' ev' : ''}" x="${bx + 66 + c * CW}" y="${y}" width="${CW}" height="${CH}"/>`);
      if (ev) out.push(`<text class="t-c" x="${bx + 66 + c * CW + CW / 2}" y="${y + 16}" text-anchor="middle">${esc(ev)}</text>`);
    }
  });
  // producer
  if (o.producer) {
    const py = by + bh / 2 - 20;
    out.push(`<rect class="prod" x="20" y="${py}" width="${prodW}" height="40" rx="8"/>`);
    out.push(`<text class="t-w" x="${20 + prodW / 2}" y="${py + 25}" text-anchor="middle">${esc(o.producer)}</text>`);
    out.push(`<path class="arrow" marker-end="url(#${id})" d="M${20 + prodW} ${py + 20} L${bx + 12} ${py + 20}"/>`);
    if (o.producerLabel) out.push(`<text class="t-s" x="${(20 + prodW + bx) / 2}" y="${py + 12}" text-anchor="middle">${esc(o.producerLabel)}</text>`);
  }
  // consumer -> partition arrows (consumers pull from partitions)
  cons.forEach((c) => {
    const tx = bx + 66 + CELLS * CW + 6, ty = rowY(c.to) + CH / 2;
    const mx = (c.x + tx) / 2;
    out.push(`<path class="arrow" marker-end="url(#${id})" d="M${c.x} ${c.y} C${mx} ${c.y}, ${mx} ${ty}, ${tx} ${ty}"/>`);
    if (c.label) out.push(`<text class="t-s lbl" x="${mx}" y="${(c.y + ty) / 2 - 6}" text-anchor="middle">${esc(c.label)}</text>`);
  });
  return `<svg class="ksvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${esc(o.aria || 'Kafka architecture diagram')}">
<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker></defs>
${out.join('\n')}
</svg>`;
}

// Kafka cluster: a row of brokers (topic + leader/follower partition pills) above a controller row.
// o = { producer, consumer, brokers:[{label, topic, parts:[{label, role:'Leader'|'Follower'}]}],
//       controllers:[{label, sub, active}], aria }
function clusterDiagram(o) {
  const id = `ar${++uid}`;
  const BW = 220, BG = 22, PILL = 30;
  const nB = o.brokers.length;
  const cx = o.producer ? 180 : 20, cy = 20;
  const maxParts = Math.max(...o.brokers.map((b) => b.parts.length));
  const bh = 84 + maxParts * (PILL + 10);
  const hasCtl = o.controllers && o.controllers.length;
  const brokersW = nB * BW + (nB + 1) * BG;
  // leave room for the heartbeat labels between controllers
  const cw = Math.max(brokersW, hasCtl ? o.controllers.length * 160 + (o.controllers.length + 1) * 110 : 0);
  const bOff = (cw - brokersW) / 2;
  const bandH = hasCtl ? 32 : 0, ctlH = hasCtl ? 78 : 0;
  const ch = 40 + bh + 12 + bandH + ctlH;
  const out = [];
  out.push(`<rect class="cluster" x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="14"/>`);
  out.push(`<text class="t-h" x="${cx + cw / 2}" y="${cy + 26}" text-anchor="middle">${esc(o.label || 'Kafka Cluster')}</text>`);
  const by = cy + 40;
  o.brokers.forEach((b, i) => {
    const bx = cx + bOff + BG + i * (BW + BG);
    out.push(`<rect class="broker" x="${bx}" y="${by}" width="${BW}" height="${bh}" rx="12"/>`);
    out.push(`<text class="t-h" x="${bx + BW / 2}" y="${by + 22}" text-anchor="middle">${esc(b.label)}</text>`);
    out.push(`<rect class="topic" x="${bx + 12}" y="${by + 34}" width="${BW - 24}" height="${bh - 46}" rx="9"/>`);
    out.push(`<text class="t-s" x="${bx + BW / 2}" y="${by + 52}" text-anchor="middle">Topic name = ${esc(b.topic)}</text>`);
    b.parts.forEach((p, j) => {
      const py = by + 64 + j * (PILL + 10);
      const lead = /lead/i.test(p.role);
      out.push(`<rect class="${lead ? 'pill-l' : 'pill-f'}" x="${bx + 30}" y="${py}" width="${BW - 60}" height="${PILL}" rx="15"/>`);
      out.push(`<text class="${lead ? 't-w' : 't-f'}" x="${bx + BW / 2}" y="${py + 20}" text-anchor="middle">${esc(p.label)} : ${esc(p.role)}</text>`);
    });
  });
  if (hasCtl) {
    const bandY = by + bh + 12;
    out.push(`<line class="sep" x1="${cx}" y1="${bandY}" x2="${cx + cw}" y2="${bandY}"/>`);
    out.push(`<line class="sep" x1="${cx}" y1="${bandY + bandH}" x2="${cx + cw}" y2="${bandY + bandH}"/>`);
    const ax1 = cx + cw / 2 - 60, ax2 = cx + cw / 2 + 60;
    out.push(`<path class="arrow" marker-start="url(#${id})" marker-end="url(#${id})" d="M${ax1} ${bandY - 10} L${ax1} ${bandY + bandH + 12}"/>`);
    out.push(`<text class="t-s lbl" x="${ax1 - 10}" y="${bandY + bandH / 2 + 4}" text-anchor="end">heartbeats</text>`);
    out.push(`<path class="arrow" marker-start="url(#${id})" marker-end="url(#${id})" d="M${ax2} ${bandY - 10} L${ax2} ${bandY + bandH + 12}"/>`);
    out.push(`<text class="t-s lbl" x="${ax2 + 10}" y="${bandY + bandH / 2 + 4}">Metadata updates</text>`);
    const n = o.controllers.length, CW = 160, gap = (cw - n * CW) / (n + 1);
    const ry = bandY + bandH + 14;
    o.controllers.forEach((c, i) => {
      const x = cx + gap + i * (CW + gap);
      out.push(`<rect class="${c.active ? 'ctl-a' : 'ctl'}" x="${x}" y="${ry}" width="${CW}" height="52" rx="10"/>`);
      out.push(`<text class="${c.active ? 't-w' : 't-v'}" x="${x + CW / 2}" y="${ry + 22}" text-anchor="middle">${esc(c.label)}</text>`);
      out.push(`<text class="${c.active ? 't-w' : 't-v'} t-s" x="${x + CW / 2}" y="${ry + 40}" text-anchor="middle">${esc(c.sub || '')}</text>`);
      if (i > 0) {
        const px = x - gap + 4, nx = x - 4;
        out.push(`<path class="arrow" marker-start="url(#${id})" marker-end="url(#${id})" d="M${px} ${ry + 26} L${nx} ${ry + 26}"/>`);
        out.push(`<text class="t-s lbl" x="${(px + nx) / 2}" y="${ry + 18}" text-anchor="middle">heartbeats</text>`);
      }
    });
  }
  const midY = by + bh / 2;
  if (o.producer) {
    out.push(`<rect class="prod" x="20" y="${midY - 20}" width="120" height="40" rx="8"/>`);
    out.push(`<text class="t-w" x="80" y="${midY + 5}" text-anchor="middle">${esc(o.producer)}</text>`);
    out.push(`<path class="arrow" marker-end="url(#${id})" d="M140 ${midY} L${cx + bOff + BG - 4} ${midY}"/>`);
  }
  let W = cx + cw + 20;
  if (o.consumer) {
    const gx = cx + cw + 70;
    out.push(`<rect class="grp" x="${gx}" y="${midY - 26}" width="170" height="52" rx="10"/>`);
    out.push(`<text class="t-h" x="${gx + 85}" y="${midY + 5}" text-anchor="middle">${esc(o.consumer)}</text>`);
    out.push(`<path class="arrow" marker-end="url(#${id})" d="M${gx} ${midY} L${cx + cw - bOff - BG + 4} ${midY}"/>`);
    W = gx + 190;
  }
  const H = cy + ch + 20;
  return `<svg class="ksvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${esc(o.aria || 'Kafka cluster diagram')}">
<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker></defs>
${out.join('\n')}
</svg>`;
}

const P3 = [{ label: 'P0' }, { label: 'P1' }, { label: 'P2' }];

const diagrams = {
  // Chapter 02 — single broker hosting order-events
  broker: () => brokerDiagram({ producer: 'Producer1', topic: 'order-events', partitions: P3, aria: 'Producer1 writes to a Kafka broker hosting topic order-events with partitions P0, P1, P2' }),
  // Chapter 02 — two consumer groups reading order-events
  consumerGroups: () => brokerDiagram({
    producer: 'Producer1', topic: 'order-events', partitions: P3,
    groups: [
      { label: 'Consumer Group1 = notification', consumers: [{ label: 'Consumer 1', to: 0 }, { dots: true }, { label: 'Consumer N', to: 1 }] },
      { label: 'Consumer Group2 = analytics', consumers: [{ label: 'Consumer 1', to: 1 }, { dots: true }, { label: 'Consumer N', to: 2 }] },
    ],
    aria: 'Two consumer groups, notification and analytics, reading partitions of order-events',
  }),
  // Chapter 02 — offset commits of group "notification" land in partition 23 of __consumer_offsets
  consumerOffsets: () => brokerDiagram({
    topic: '__consumer_offsets', cells: 6,
    partitions: [{ label: 'P0' }, { dots: true }, { label: 'P23', hot: true }, { dots: true }, { label: 'P49' }],
    groups: [{ label: 'Consumer Group1 = notification', consumers: [{ label: 'Consumer 1' }, { dots: true }, { label: 'Consumer N', to: 2, label2: 'publish offset commit' }] }],
    aria: 'Consumer group notification publishes its offset commits to partition 23 of __consumer_offsets',
  }),
};

// Chapter 03 — the cluster we are going to set up (2 brokers, 2 KRaft controllers)
diagrams.clusterSetup = () => clusterDiagram({
  producer: 'Producer1', consumer: 'Consumer Group',
  brokers: [
    { label: 'Kafka Broker-1', topic: 'order-events', parts: [{ label: 'P0', role: 'Leader' }, { label: 'P1', role: 'Follower' }] },
    { label: 'Kafka Broker-2', topic: 'order-events', parts: [{ label: 'P1', role: 'Leader' }, { label: 'P2', role: 'Follower' }] },
  ],
  controllers: [{ label: 'Controller1', sub: '(Active)', active: true }, { label: 'Controller2', sub: '(Stand-by)' }],
  aria: 'Kafka cluster with Broker-1 and Broker-2 holding order-events partitions, and Controller1 (active) and Controller2 (stand-by)',
});
// Chapter 03 — actual placement reported by kafka-topics.sh --describe (node 3 = broker1, node 4 = broker2)
diagrams.describePlacement = () => clusterDiagram({
  label: 'Kafka Cluster — order-events-topic (3 partitions, RF = 2)',
  brokers: [
    { label: 'Broker1 (node.id = 3, :9092)', topic: 'order-events-topic', parts: [{ label: 'P0', role: 'Leader' }, { label: 'P1', role: 'Follower' }, { label: 'P2', role: 'Leader' }] },
    { label: 'Broker2 (node.id = 4, :9192)', topic: 'order-events-topic', parts: [{ label: 'P0', role: 'Follower' }, { label: 'P1', role: 'Leader' }, { label: 'P2', role: 'Follower' }] },
  ],
  aria: 'Partition placement of order-events-topic across broker node 3 and node 4',
});

// Generic box-and-arrow helpers for hand-laid-out step diagrams (PDF-style flow charts).
function stepCanvas() {
  const id = `ar${++uid}`, idb = `ab${uid}`;
  const out = [];
  const api = {
    // lines[0] is rendered bold (the "StepN:" title)
    box(x, y, w, h, lines, cls = 'stepbox', bold = true) {
      out.push(`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`);
      const lh = 17, top = y + h / 2 - ((lines.length - 1) * lh) / 2 + 5;
      lines.forEach((l, i) => out.push(`<text class="${i === 0 && bold ? 't-h' : 't-b'}" x="${x + w / 2}" y="${top + i * lh}" text-anchor="middle">${esc(l)}</text>`));
    },
    arrow(d, kind = 'main') {
      out.push(`<path class="${kind === 'main' ? 'arrow' : 'arrow-b'}" marker-end="url(#${kind === 'main' ? id : idb})" d="${d}"/>`);
    },
    note(x, y, lines, anchor = 'start', cls = 't-red') {
      lines.forEach((l, i) => out.push(`<text class="${cls}" x="${x}" y="${y + i * 16}" text-anchor="${anchor}">${esc(l)}</text>`));
    },
    svg(W, H, aria) {
      return `<svg class="ksvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${esc(aria)}">
<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker>
<marker id="${idb}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#2563eb"/></marker></defs>
${out.join('\n')}
</svg>`;
    },
  };
  return api;
}

// Chapter 02 / 06 — the complete consumer read flow drawn like the source notes (13 step boxes).
diagrams.consumerReadFlowBoxes = () => {
  const c = stepCanvas();
  // row 1: Step1 -> Step2 -> Step3, with Broker-1 and Active Controller above Step3
  c.box(655, 20, 150, 50, ['Active', 'Controller'], 'ctl', false);
  c.box(640, 130, 180, 46, ['Broker-1 (any broker)'], 'brkbox', false);
  c.box(40, 250, 240, 76, ['Step1:', 'Consumer starts and wants to', 'join group', 'group.id = "notification-service"']);
  c.box(340, 250, 230, 76, ['Step2:', 'Finds the partition number', 'of topic __consumer_offsets']);
  c.box(620, 250, 220, 76, ['Step3:', 'Consumer requests metadata', '(first time or refresh)']);
  c.arrow('M280 288 L336 288'); c.arrow('M570 288 L616 288');
  c.note(340, 350, ['hash("notification-service-group-id") % 50 = 23', 'Partition 23 of topic __consumer_offsets']);
  // metadata round trips
  c.arrow('M700 250 L700 180', 'b'); c.arrow('M760 180 L760 246', 'b');
  c.note(694, 212, ['Give me metadata:', 'broker vs partition (leader)'], 'end');
  c.note(768, 218, ['Metadata response']);
  c.arrow('M705 130 L705 74', 'b'); c.arrow('M755 74 L755 126', 'b');
  c.note(699, 104, ['Give me metadata'], 'end');
  c.note(763, 104, ['Metadata response']);
  c.note(870, 250, ['Metadata:', 'topic: __consumer_offsets', '  partition 0: leader = Broker 1', '  partition 2: leader = Broker 2', '  partition 23: leader = Broker 3'], 'start', 't-meta');
  // row 2 (right to left): Step4 -> Step6 -> Step8
  c.box(610, 430, 250, 84, ['Step4:', 'Invokes Broker3 (Group Coordinator)', 'and requests to join the', '"notification-service" group']);
  c.box(340, 430, 230, 84, ['Step6:', 'Consumer fetches last offset for', 'topic "order-events"', 'Partition-2']);
  c.box(40, 430, 250, 84, ['Step8:', 'Check the metadata and invoke', 'leader broker of topic', '"order-events" Partition-2']);
  c.arrow('M730 326 L730 426'); c.arrow('M610 472 L574 472'); c.arrow('M340 472 L294 472');
  // Step5 under Step4, followers under Step5
  c.box(610, 620, 250, 140, ['Step5:', 'Broker3 (Group coordinator)', 'Group: notification-service', 'Topic: order-events', 'Consumer1: handle Partition-0', 'Consumer2: handle Partition-1', 'Consumer3: handle Partition-2']);
  c.arrow('M670 514 L670 616', 'b'); c.note(664, 572, ['Join group'], 'end');
  c.arrow('M800 620 L800 518', 'b');
  c.note(810, 552, ['Once all followers get the latest update,', 'group coordinator sends response:', 'Partition-2 assigned', 'for topic "order-events"']);
  c.box(600, 850, 130, 48, ['Broker1', 'Partition 23 (follower)'], 'stepbox', false);
  c.box(745, 850, 130, 48, ['Broker2', 'Partition 23 (follower)'], 'stepbox', false);
  c.arrow('M665 850 L690 764', 'b'); c.arrow('M810 850 L785 764', 'b');
  c.note(737, 914, ['Followers do continuous polling and ack', 'when they updated their partition logs'], 'middle');
  c.note(870, 690, ['Broker3 waits for all followers to', 'update __consumer_offsets, partition 23.', 'No option to provide acks=0/1/all:', 'internally the consumer acts like acks=all']);
  // Step7 under Step6
  c.box(330, 620, 250, 140, ['Step7:', 'Broker3 (Group coordinator)', 'Looks at __consumer_offsets', 'Creates a key: group.id_topic_Partition', 'key: "notificationGroupId_', 'order-events_Partition-2"', 'Value: offset 100']);
  c.arrow('M400 514 L400 616', 'b'); c.arrow('M510 620 L510 518', 'b');
  c.note(394, 564, ['Get offset', 'processed till'], 'end'); c.note(518, 572, ['Return 100']);
  c.note(330, 784, ['Note: consumer offset details are not cluster', 'metadata — stored like normal topic data,', 'not in the controller nodes.']);
  // Step9 under Step8
  c.box(40, 620, 250, 90, ['Step9:', 'Broker2 (Leader of)', 'topic "order-events"', 'Partition-2']);
  c.arrow('M80 514 L80 616', 'b'); c.arrow('M250 620 L250 518', 'b');
  c.note(88, 556, ['Fetch from offset 101', 'max bytes: 200 bytes']); c.note(244, 600, ['Return 101 - 501'], 'end');
  // row 4: Step10 -> Step11 -> Step13, Step12 under Step11
  c.box(40, 960, 220, 60, ['Step10:', 'Consumer processes events']);
  c.box(320, 960, 230, 60, ['Step11:', 'Consumer commits offset', '(manual, batch wise)']);
  c.box(610, 960, 230, 60, ['Step13:', 'Continuous polling and', 'move back to Step 8']);
  c.arrow('M40 472 L20 472 L20 990 L36 990'); c.arrow('M260 990 L316 990'); c.arrow('M550 990 L606 990');
  c.box(320, 1080, 230, 104, ['Step12:', 'Broker3 (Group Coordinator)', 'writes to __consumer_offsets P23:', '(group, topic, partition)', 'offset processed till = 501']);
  c.arrow('M400 1020 L400 1076', 'b'); c.arrow('M470 1080 L470 1024', 'b');
  c.note(394, 1054, ['Commit'], 'end'); c.note(478, 1054, ['ACK']);
  c.arrow('M840 990 L880 990 L880 940 L305 940 L305 500 L294 500', 'b');
  c.note(890, 994, ['loop: back to Step 8']);
  return c.svg(1180, 1200, 'Complete consumer read flow in 13 steps, drawn as connected step boxes');
};

// Chapter 08 — what happens internally when a record cannot be deserialized and lands in the DLT.
diagrams.dltInternalFlow = () => {
  const c = stepCanvas();
  c.box(430, 20, 260, 96, ['Broker: order-events', 'Topic · Partition', 'Raw key bytes[]', 'Raw value bytes[]'], 'brkbox', false);
  c.arrow('M560 116 L560 176');
  c.note(572, 152, ['Deserialization issue happens']);
  c.box(390, 180, 340, 120, ['Wrapper intercepts', '(ErrorHandlingDeserializer)', 'Creates a DeserializationException', 'ConsumerRecord: failed part = null', 'Header: exception + raw bytes']);
  c.note(748, 206, ['springDeserializerExceptionKey', '→ key raw bytes', 'springDeserializerExceptionValue', '→ value raw bytes'], 'start', 't-meta');
  c.note(748, 278, ['Whichever (key, value or both) failed,', 'its raw bytes are stored in this header']);
  c.box(20, 140, 330, 110, ['Example 1: value deserialization failed', 'ConsumerRecord:', 'Value = null', 'Key = O-111', 'Header: springDeserializerExceptionValue']);
  c.box(20, 290, 330, 110, ['Example 2: key deserialization failed', 'ConsumerRecord:', 'Value = Order object', 'Key = null', 'Header: springDeserializerExceptionKey']);
  c.arrow('M386 220 L354 200', 'b'); c.arrow('M386 280 L354 330', 'b');
  c.arrow('M560 300 L560 356');
  c.box(430, 360, 260, 72, ['ErrorHandler', 'retries finished, then calls', 'accept(record, exception)']);
  c.arrow('M560 432 L560 486');
  c.box(400, 490, 320, 70, ['DeadLetterPublishingRecoverer', 'accept(record, exception)']);
  c.arrow('M720 525 L816 525');
  c.note(768, 513, ['Insert into'], 'middle');
  c.box(820, 495, 230, 60, ['order-events-dlt', '<topicName>-dlt topic'], 'topic');
  c.note(560, 592, ['KafkaTemplate sends a new ProducerRecord: the failed key/value', 'is replaced by its raw bytes, the good part is kept as is'], 'middle');
  return c.svg(1100, 630, 'A record that fails deserialization is wrapped with its raw bytes, passed by the error handler to DeadLetterPublishingRecoverer and published to order-events-dlt');
};

// Chapter 09 — one FetchRequest, per-partition and total byte limits.
diagrams.fetchLimits = () => {
  const c = stepCanvas();
  c.box(20, 130, 140, 60, ['Consumer', 'poll()'], 'cons');
  c.box(200, 95, 230, 130, ['FetchRequest', 'Topic: A', 'P0 → offset X', 'P1 → offset Y', 'Topic: B', 'P1 → offset Z']);
  c.arrow('M160 160 L196 160'); c.arrow('M430 160 L476 160');
  c.box(480, 30, 500, 270, [], 'brkbox');
  c.note(730, 54, ['Broker'], 'middle', 't-h');
  c.box(495, 70, 310, 160, [], 'topic');
  c.note(650, 92, ['Topic-A'], 'middle', 't-h');
  c.box(510, 110, 135, 100, ['Partition P0', 'fetch records', 'from offset X', '(≤ 1 MB)']);
  c.box(655, 110, 135, 100, ['Partition P1', 'fetch records', 'from offset Y', '(≤ 1 MB)']);
  c.box(820, 70, 145, 160, [], 'topic');
  c.note(892, 92, ['Topic-B'], 'middle', 't-h');
  c.box(825, 110, 135, 100, ['Partition P1', 'fetch records', 'from offset Z', '(≤ 1 MB)']);
  c.note(730, 256, ['each partition ≤ max.partition.fetch.bytes (1 MB)'], 'middle', 't-meta');
  c.note(730, 278, ['all partitions together ≤ fetch.max.bytes (52 MB)'], 'middle', 't-meta');
  return c.svg(1000, 320, 'One FetchRequest asks for Topic A partitions P0 and P1 and Topic B partition P1; each partition returns at most 1 MB and the total is at most 52 MB');
};

// Chapter 10 — zombie fencing: how PID + epoch stop an old producer from committing.
diagrams.zombieFencing = () => {
  const c = stepCanvas();
  // actors and lifelines
  c.box(20, 20, 170, 50, ['Producer1', 'txn.id = T1'], 'cons');
  c.box(470, 20, 200, 50, ['Transaction', 'Coordinator'], 'ctl', false);
  c.box(104, 70, 2, 560, [], 'lifeline');
  c.box(569, 70, 2, 560, [], 'lifeline');
  c.box(215, 330, 170, 50, ['Producer2', "takes Producer1's place"], 'cons');
  c.box(299, 380, 2, 250, [], 'lifeline');
  // row 1: InitProducerId
  c.arrow('M106 110 L565 110'); c.note(335, 104, ['InitProducerIdRequest (Transaction id = "T1")'], 'middle', 't-b');
  c.arrow('M569 140 L110 140', 'b'); c.note(335, 134, ['PID = 5, Epoch = 0'], 'middle', 't-f');
  c.box(720, 80, 360, 100, ['T1:', 'PID: 5 · Epoch: 0', 'State: EMPTY', 'Partitions involved: []', 'Timeout: 100ms']);
  c.arrow('M571 125 L716 125', 'b');
  // row 2: begin + sends
  c.arrow('M106 230 L565 230'); c.note(335, 212, ['begin_transaction (T1, PID=5, Epoch=0)', 'send(order-events, P0) · send(payment-events, P2)'], 'middle', 't-b');
  c.box(720, 195, 360, 110, ['T1:', 'PID: 5 · Epoch: 0', 'State: ONGOING', 'Partitions involved:', '[{order-events, P0}, {payment-events, P2}]']);
  c.arrow('M571 245 L716 245', 'b');
  c.note(112, 300, ['Producer1: some network pause …']);
  // row 4: Producer2 InitProducerId -> fence
  c.arrow('M301 420 L565 420'); c.note(433, 414, ['InitProducerIdRequest ("T1")'], 'middle', 't-b');
  c.arrow('M569 460 L305 460', 'b'); c.note(433, 454, ['PID = 5, Epoch = 1'], 'middle', 't-f');
  c.box(720, 340, 360, 150, ['Coordinator:', '1. Finds the mapping of this transaction id', '2. ABORTs any ongoing transaction', '3. Increases the epoch', 'T1: PID 5 · Epoch 1 · State: EMPTY', 'Partitions involved: [] · Timeout: 100ms']);
  c.arrow('M571 420 L716 420', 'b');
  // row 5: zombie commits
  c.note(112, 520, ['old producer wakes up']);
  c.arrow('M106 560 L565 560'); c.note(320, 554, ['COMMIT (T1, PID=5, Epoch=0)'], 'start', 't-b');
  c.arrow('M569 600 L110 600', 'b'); c.note(320, 594, ['ProducerFencedException'], 'start', 't-red');
  c.box(720, 530, 360, 100, ['ProducerFencedException', 'Latest version for T1, PID 5 is epoch 1,', 'but this request has old epoch 0', '→ it is from a ZOMBIE producer'], 'topic');
  c.arrow('M571 580 L716 580', 'b');
  return c.svg(1100, 650, 'Producer2 re-initialises transaction id T1, the coordinator aborts the open transaction and bumps the epoch to 1, and the old Producer1 commit with epoch 0 is rejected with ProducerFencedException');
};

// Chapter 12 — the producer's first send() with KafkaAvroSerializer (schema registration).
diagrams.avroFirstSend = () => {
  const c = stepCanvas();
  c.box(40, 30, 300, 60, ['Producer', 'send("order-events", "O-1", order)'], 'cons');
  c.box(40, 130, 300, 60, ['1. Avro Serializer', 'orderObj.getSchema() → schema hash']);
  c.box(40, 230, 300, 70, ['2. Look in cache', 'Do I have a Schema ID', 'for this schema hash?']);
  c.box(40, 350, 300, 60, ['5. Put into cache', 'schema hash → Schema ID 1001']);
  c.box(40, 450, 300, 70, ['6. Serialize', '[magic byte][schema ID][payload]', '[0][1001][O-1 C-1 5 55.0]']);
  c.box(40, 570, 300, 60, ['7. Partitioner → Accumulator →', 'Compression → Sender thread']);
  c.box(560, 210, 260, 110, ['Schema Registry', 'subject "order-events-value"', 'is not present,', 'so register it']);
  c.box(560, 400, 260, 70, ['_schemas topic (Kafka)', 'id 1001 · v1 · BACKWARD'], 'topic');
  c.box(560, 560, 260, 70, ['Kafka', 'topic: order-events'], 'brkbox');
  c.arrow('M190 90 L190 126'); c.arrow('M190 190 L190 226');
  c.arrow('M340 265 L556 265', 'b'); c.note(448, 230, ['NO → 3. HTTP call', '(subject + schema)'], 'middle', 't-b');
  c.arrow('M690 320 L690 396', 'b'); c.note(700, 362, ['store schema']);
  c.arrow('M556 300 L450 300 L450 380 L344 380', 'b'); c.note(458, 345, ['4. Schema ID: 1001'], 'start', 't-f');
  c.arrow('M40 265 L18 265 L18 485 L36 485'); c.note(26, 336, ['YES: cached'], 'start', 't-f');
  c.arrow('M190 410 L190 446'); c.arrow('M190 520 L190 566');
  c.arrow('M340 600 L556 600'); c.note(448, 592, ['publish'], 'middle', 't-b');
  return c.svg(860, 650, 'KafkaAvroSerializer hashes the schema, registers it with Schema Registry on a cache miss, caches the returned schema id and writes magic byte, schema id and Avro payload to Kafka');
};

// Chapter 13 — CDC outbox: app → Postgres (WAL) → Debezium in Kafka Connect → brokers.
diagrams.cdcArchitecture = () => {
  const c = stepCanvas();
  c.box(20, 40, 200, 70, ['Order Service', '@Transactional: orders +', 'outbox_events insert'], 'cons');
  c.box(300, 20, 250, 130, ['Postgres DB', 'orders table', 'outbox_events table', 'WAL (wal_level = logical)', 'publication: cdc_publication'], 'stepbox');
  c.box(640, 20, 260, 130, ['Kafka Connect', 'Debezium Postgres plugin', 'replication slot: debezium_slot', 'EventRouter transform', '(SMT)'], 'ctl');
  c.arrow('M220 75 L296 75'); c.note(258, 66, ['1 txn'], 'middle', 't-b');
  c.arrow('M550 85 L636 85', 'b'); c.note(593, 76, ['WAL stream'], 'middle', 't-b');
  c.box(560, 230, 160, 50, ['Broker1'], 'brkbox', false);
  c.box(740, 230, 160, 50, ['Broker2'], 'brkbox', false);
  c.box(560, 320, 160, 46, ['Controller1'], 'ctl', false);
  c.box(740, 320, 160, 46, ['Controller2'], 'ctl', false);
  c.arrow('M770 150 L770 226'); c.note(780, 196, ['publish to "order-events"']);
  c.box(300, 230, 200, 50, ['Consumers', '(payment, inventory …)'], 'cons');
  c.arrow('M560 255 L504 255');
  c.note(20, 200, ['Debezium registers as a replication', 'follower of Postgres and reads the', 'WAL — no polling queries on tables.']);
  return c.svg(920, 390, 'Order service writes orders and outbox_events in one transaction; Debezium in Kafka Connect reads the Postgres WAL through a replication slot and publishes outbox rows to Kafka');
};

// Kafka Streams tasks drawn side by side: title, Source → processors → Sink, with a RocksDB store.
// o = { tasks:[{title:[...], source:[...], procs:[...], sink:[...], store:'name', note:[...]}], cols, rowLabels:[...], aria }
// `cols` wraps tasks into rows (default: all in one row); `rowLabels` prints a heading above each row.
function streamTasks(o) {
  const c = stepCanvas();
  const TW = 240, GAP = 30, X0 = 20, ROWGAP = 34, LABH = o.rowLabels ? 26 : 0;
  const cols = o.cols || o.tasks.length;
  let H = 0, rowTop = 20, rowMax = 0;
  o.tasks.forEach((t, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) { rowTop = rowMax + ROWGAP; }
    if (col === 0 && o.rowLabels) c.note(X0, rowTop + 16, [o.rowLabels[i / cols]], 'start', 't-h');
    const x = X0 + col * (TW + GAP);
    const titleH = t.title.length * 17 + 14;
    const procH = 26 + t.procs.length * 17;
    let y = rowTop + LABH;
    c.box(x, y, TW, 0, [], 'grp'); // placeholder replaced below
    const top = y;
    y += titleH;
    c.note(x + TW / 2, top + 22, t.title, 'middle', 't-h');
    c.box(x + 20, y, TW - 40, 16 + t.source.length * 17, t.source, 'topic', false);
    let sy = y + 16 + t.source.length * 17;
    c.arrow(`M${x + TW / 2} ${sy} L${x + TW / 2} ${sy + 22}`);
    sy += 26;
    c.box(x + 20, sy, TW - 40, procH, ['Processors', ...t.procs]);
    if (t.store) {
      c.box(x + 20, sy + procH + 10, TW - 40, 30, [`RocksDB: ${t.store}`], 'ctl', false);
    }
    let ky = sy + procH + (t.store ? 44 : 0);
    c.arrow(`M${x + TW / 2} ${ky} L${x + TW / 2} ${ky + 22}`);
    ky += 26;
    c.box(x + 20, ky, TW - 40, 16 + t.sink.length * 17, t.sink, 'brkbox', false);
    ky += 16 + t.sink.length * 17;
    if (t.note) { c.note(x + TW / 2, ky + 24, t.note, 'middle', 't-red'); ky += 14 + t.note.length * 16; }
    t._h = ky + 14 - top;
    t._x = x; t._top = top;
    rowMax = Math.max(rowMax, ky + 14);
    H = Math.max(H, ky + 30);
  });
  // replace the zero-height placeholders with real outer boxes (drawn first so they sit underneath)
  let svg = c.svg(X0 * 2 + cols * TW + (cols - 1) * GAP, H, o.aria || 'Kafka Streams tasks');
  let k = 0;
  svg = svg.replace(/<rect class="grp" x="(\d+)" y="(\d+)" width="(\d+)" height="0" rx="10"\/>/g, (m, x, y, w) => {
    const t = o.tasks[k++];
    return `<rect class="grp" x="${x}" y="${y}" width="${w}" height="${t._h}" rx="10"/>`;
  });
  return svg;
}

diagrams.tasksNoRepartition = () => streamTasks({
  tasks: [
    { title: ['Task1'], source: ['Source', 'order-events · P0'], procs: ['selectKey(productId)', 'groupByKey', 'count'], store: 'P-1 → 2', sink: ['Sink'], note: ['sees O-1, O-3 (P-1)'] },
    { title: ['Task2'], source: ['Source', 'order-events · P1'], procs: ['selectKey(productId)', 'groupByKey', 'count'], store: 'P-1 → 1', sink: ['Sink'], note: ['sees O-2 (P-1)'] },
  ],
  aria: 'Without repartition, Task1 counts P-1 as 2 and Task2 counts P-1 as 1, so the count is split across tasks',
});

diagrams.fourTasks = () => streamTasks({
  tasks: [
    { title: ['Task 0_0', 'Sub-topology 0 · Partition 0'], source: ['Source', 'order-events · P0'], procs: ['selectKey(productId)'], sink: ['Sink', 'repartition-topic'] },
    { title: ['Task 0_1', 'Sub-topology 0 · Partition 1'], source: ['Source', 'order-events · P1'], procs: ['selectKey(productId)'], sink: ['Sink', 'repartition-topic'] },
    { title: ['Task 1_0', 'Sub-topology 1 · Partition 0'], source: ['Source', 'repartition-topic · P0'], procs: ['groupByKey', 'count'], store: 'count-store', sink: ['Sink', 'product-order-counts'] },
    { title: ['Task 1_1', 'Sub-topology 1 · Partition 1'], source: ['Source', 'repartition-topic · P1'], procs: ['groupByKey', 'count'], store: 'count-store', sink: ['Sink', 'product-order-counts'] },
  ],
  cols: 2,
  rowLabels: ['Sub-topology 0 — re-key and write to the repartition topic', 'Sub-topology 1 — read the repartition topic and count'],
  aria: 'Four tasks: tasks 0_0 and 0_1 re-key order-events partitions into the repartition topic; tasks 1_0 and 1_1 count per product from repartition partitions with their own RocksDB count-store',
});

// Chapter 16 — GlobalKTable: every app instance has a global thread holding ALL partitions of the table topic.
diagrams.globalKTable = () => {
  const c = stepCanvas();
  [0, 1].forEach((i) => {
    const x = 20 + i * 470;
    c.box(x, 20, 440, 330, [], 'grp');
    c.note(x + 220, 44, [`Kafka Streams app — instance ${i + 1}`, 'num.stream.threads = 2'], 'middle', 't-h');
    // 2 orders partitions over 2 instances x 2 threads: instance 2's threads get no orders partition
    const t1 = i ? ['StreamThread-1', 'no orders partition (idle)'] : ['StreamThread-1 · Task 0_0', 'KStream: orders P0'];
    const t2 = i ? ['StreamThread-2', 'no orders partition (idle)'] : ['StreamThread-2 · Task 0_1', 'KStream: orders P1'];
    c.box(x + 15, 80, 195, 92, t1, 'cons');
    c.box(x + 230, 80, 195, 92, t2, 'cons');
    c.box(x + 15, 210, 410, 46, ['Global Stream Thread', 'consumes ALL partitions of "countries" (P0, P1)'], 'ctl');
    c.box(x + 70, 280, 300, 50, ['Global state store (RocksDB)', 'countries-store: full copy'], 'brkbox');
    c.arrow(`M${x + 220} 256 L${x + 220} 276`, 'b');
    c.note(x + 220, 196, ['every task in this instance can look up any country'], 'middle', 't-red');
  });
  return c.svg(940, 370, 'Two Kafka Streams instances; in each, a global stream thread reads all partitions of the countries topic into a global RocksDB store that every task of that instance can query');
};

// Chapter 19 — aggregate(): three Alice records, RocksDB lookup → initializer/aggregator → store.
diagrams.aggregateSteps = () => {
  const c = stepCanvas();
  const cols = [
    { rec: 'Record: Alice → 100', look: 'Not found', calc: ['initializer() → 0', 'aggregator(Alice, Order(100), 0)', '= 0 + 100'], store: 'Store Alice → 100' },
    { rec: 'Record: Alice → 150', look: 'Found 100', calc: ['aggregator(Alice, Order(150), 100)', '= 100 + 150'], store: 'Store Alice → 250' },
    { rec: 'Record: Alice → 50', look: 'Found 250', calc: ['aggregator(Alice, Order(50), 250)', '= 250 + 50'], store: 'Store Alice → 300' },
  ];
  cols.forEach((k, i) => {
    const x = 20 + i * 300, w = 260, cx = x + w / 2;
    c.box(x, 20, w, 40, [k.rec], 'cons', false);
    c.arrow(`M${cx} 60 L${cx} 86`);
    c.box(x, 90, w, 54, ['RocksDB lookup', k.look], 'ctl');
    c.arrow(`M${cx} 144 L${cx} 170`);
    c.box(x, 174, w, 78, k.calc, 'stepbox', false);
    c.arrow(`M${cx} 252 L${cx} 278`);
    c.box(x, 282, w, 40, [k.store], 'brkbox', false);
    if (i < 2) c.arrow(`M${x + w} 302 L${x + 296} 302 L${x + 296} 117 L${x + 304} 117`, 'b');
  });
  return c.svg(920, 345, 'aggregate for key Alice: first record not found so initializer gives 0 and the total becomes 100; then 100 plus 150 is 250; then 250 plus 50 is 300');
};

// Chapter 20 — window timelines. Times are minutes after 10:00.
// o = { from, to, events:[{t, n, late}], windows:[{s, e, label, closed}], note, aria }
function windowTimeline(o) {
  const L = 70, R = 30, W = 900, span = o.to - o.from, px = (W - L - R) / span;
  const X = (m) => L + (m - o.from) * px;
  const hh = (m) => `10:${String(m).padStart(2, '0')}`;
  const out = [];
  const evY = 70, rowY = 120, rowH = 30, rows = o.windows.length;
  const axisY = rowY + rows * (rowH + 8) + 12;
  const CH = 6.6; // approx. width of one 12.5px character
  // events — labels alternate between two heights so nearby times don't collide
  out.push(`<text class="t-s" x="${L - 10}" y="${evY + 4}" text-anchor="end">events</text>`);
  [...o.events].sort((a, b) => a.t - b.t).forEach((e, i) => {
    const ly = evY - 14 - (i % 3) * 16;
    out.push(`<circle cx="${X(e.t)}" cy="${evY}" r="7" class="${e.late ? 'pill-l' : 'pill-f'}"/>`);
    out.push(`<text class="t-c" x="${X(e.t)}" y="${ly}" text-anchor="middle">${esc(e.n)}</text>`);
    out.push(`<line x1="${X(e.t)}" y1="${evY + 8}" x2="${X(e.t)}" y2="${axisY}" stroke="#cbd5e1" stroke-dasharray="3 3"/>`);
  });
  // windows — text goes right of the bar if it fits, else inside the bar, else left of it
  o.windows.forEach((w, i) => {
    const y = rowY + i * (rowH + 8), x0 = X(w.s), x1 = X(w.s) + Math.max(6, (w.e - w.s) * px);
    out.push(`<rect class="${w.closed ? 'wclosed' : 'wopen'}" x="${x0}" y="${y}" width="${x1 - x0}" height="${rowH}" rx="7"/>`);
    out.push(`<text class="t-s" x="${L - 10}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(w.label)}</text>`);
    if (!w.text) return;
    const tw = w.text.length * CH, ty = y + rowH / 2 + 4;
    if (x1 + 8 + tw <= W - 4) out.push(`<text class="t-b" x="${x1 + 8}" y="${ty}">${esc(w.text)}</text>`);
    else if (tw + 16 <= x1 - x0) out.push(`<text class="t-b" x="${x0 + 8}" y="${ty}">${esc(w.text)}</text>`);
    else out.push(`<text class="t-b" x="${x0 - 8}" y="${ty}" text-anchor="end">${esc(w.text)}</text>`);
  });
  // axis
  out.push(`<line x1="${L}" y1="${axisY}" x2="${W - R}" y2="${axisY}" stroke="#475569" stroke-width="1.4"/>`);
  for (let m = o.from; m <= o.to; m += o.tick || 5) {
    out.push(`<line x1="${X(m)}" y1="${axisY}" x2="${X(m)}" y2="${axisY + 5}" stroke="#475569"/>`);
    out.push(`<text class="t-c" x="${X(m)}" y="${axisY + 18}" text-anchor="middle">${hh(m)}</text>`);
  }
  const H = axisY + 34 + (o.note ? 18 : 0);
  if (o.note) out.push(`<text class="t-red" x="${L}" y="${axisY + 44}">${esc(o.note)}</text>`);
  return `<svg class="ksvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${esc(o.aria)}">\n${out.join('\n')}\n</svg>`;
}

diagrams.tumblingBasic = () => windowTimeline({
  from: 0, to: 30, tick: 5,
  events: [{ t: 7, n: '10:07' }],
  windows: [
    { s: 0, e: 10, label: 'W1', text: '[10:00, 10:10) ← 10:07 lands here only' },
    { s: 10, e: 20, label: 'W2', text: '[10:10, 10:20)' },
    { s: 20, e: 30, label: 'W3', text: '' },
  ],
  aria: 'Tumbling windows of 10 minutes; an event at 10:07 belongs only to W1',
});

diagrams.tumblingGrace = () => windowTimeline({
  from: 25, to: 50, tick: 5,
  events: [{ t: 31, n: '10:31' }, { t: 32, n: '10:32' }, { t: 41, n: '10:41' }, { t: 33, n: '10:33 late', late: true }],
  windows: [
    { s: 30, e: 35, label: 'no grace', closed: true, text: '[10:30,10:35) closed at stream time 10:35 → 10:33 dropped, count 2' },
    { s: 30, e: 45, label: '+10 grace', text: '[10:30,10:35) open until 10:45 → 10:33 accepted, count 3' },
    { s: 40, e: 45, label: 'next', text: '[10:40,10:45) count 1' },
  ],
  note: 'Bar length shows how long the window accepts records (window end + grace).',
  aria: 'Tumbling 5 minute windows: without grace the late 10:33 event is dropped, with 10 minutes grace it is counted',
});

diagrams.hoppingBasic = () => windowTimeline({
  from: 0, to: 25, tick: 5,
  events: [{ t: 7, n: '10:07' }],
  windows: [
    { s: 0, e: 10, label: 'W1', text: '[10:00,10:10) ✓' },
    { s: 5, e: 15, label: 'W2', text: '[10:05,10:15) ✓' },
    { s: 10, e: 20, label: 'W3', text: '[10:10,10:20)' },
  ],
  aria: 'Hopping windows of 10 minutes advancing by 5; an event at 10:07 belongs to W1 and W2',
});

diagrams.hoppingGrace = () => windowTimeline({
  from: 20, to: 60, tick: 5,
  events: [{ t: 27, n: '10:27' }, { t: 28, n: '10:28' }, { t: 41, n: '10:41' }, { t: 29, n: '10:29 late', late: true }],
  windows: [
    { s: 20, e: 40, label: '[20,30)', closed: true, text: 'closes 10:40 → closed' },
    { s: 25, e: 45, label: '[25,35)', text: 'closes 10:45 → open, count 3' },
    { s: 30, e: 50, label: '[30,40)', text: 'no records' },
    { s: 35, e: 55, label: '[35,45)', text: 'count 1' },
    { s: 40, e: 60, label: '[40,50)', text: 'count 1' },
  ],
  note: 'Hop 5 min, size 10 min, grace 10 min. Each bar runs from window start to window end + grace.',
  aria: 'Hopping windows with grace: the late 10:29 event is rejected by the closed window 10:20-10:30 and counted in 10:25-10:35',
});

diagrams.sessionMerge = () => windowTimeline({
  from: 25, to: 40, tick: 1,
  events: [{ t: 27, n: '10:27' }, { t: 29, n: '10:29' }, { t: 36, n: '10:36' }, { t: 32, n: '10:32 late', late: true }],
  windows: [
    { s: 27, e: 29, label: 'before', closed: true, text: 'session 1 [10:27–10:29] count 2' },
    { s: 36, e: 36.4, label: '', closed: true, text: 'session 2 [10:36] count 1' },
    { s: 27, e: 36, label: 'after', text: 'late 10:32 is within 5 min of both → merged [10:27–10:36], count 4' },
  ],
  note: 'Inactivity gap 5 min: 10:32 − 10:29 = 3 min and 10:36 − 10:32 = 4 min, so the late event bridges the two sessions.',
  aria: 'Session windows with 5 minute gap: sessions 10:27-10:29 and 10:36 are merged by the late 10:32 event into one session of 4 records',
});

// Topics (left) and consumer groups (right); each consumer points at the partitions it reads.
// o = { topics:[{name, parts:['P0',...]}], groups:[{label, consumers:[{label, to:[[topicIdx, partIdx], ...], note}]}], aria }
function consumerMap(o) {
  const c = stepCanvas();
  const TX = 20, TW = 210, PW = 130, PH = 28, GX = 430, GW = 240;
  const tops = [];
  let y = 20;
  o.topics.forEach((t) => {
    const h = 44 + t.parts.length * 40;
    tops.push({ y, h, t });
    y += h + 22;
  });
  const topicsH = y - 22;
  const groupsH = o.groups.reduce((a, g) => a + 44 + g.consumers.length * 50 + 22, 0) - 22;
  const H = Math.max(topicsH, groupsH) + 40;
  // vertically centre the shorter column
  const tOff = (H - 20 - topicsH) / 2, gOff = (H - 20 - groupsH) / 2;
  const partPos = [];
  tops.forEach(({ y: ty, h, t }, ti) => {
    const yy = ty + tOff;
    c.box(TX, yy, TW, h, [], 'topic');
    c.note(TX + TW / 2, yy + 24, [`Topic: ${t.name}`], 'middle', 't-h');
    partPos[ti] = t.parts.map((p, pi) => {
      const py = yy + 38 + pi * 40;
      c.box(TX + (TW - PW) / 2, py, PW, PH, [p], 'pill-f', false);
      return { x: TX + (TW + PW) / 2 + 4, y: py + PH / 2 };
    });
  });
  let gy = 20 + gOff;
  o.groups.forEach((g) => {
    const h = 44 + g.consumers.length * 50;
    c.box(GX, gy, GW, h, [], 'grp');
    c.note(GX + GW / 2, gy + 26, [g.label], 'middle', 't-h');
    g.consumers.forEach((cs, i) => {
      const cy = gy + 40 + i * 50;
      c.box(GX + 50, cy, GW - 100, 36, [cs.label], 'cons', false);
      (cs.to || []).forEach(([ti, pi]) => {
        const p = partPos[ti][pi], sx = GX + 50, sy = cy + 18, mx = (sx + p.x) / 2;
        c.arrow(`M${sx} ${sy} C${mx} ${sy}, ${mx} ${p.y}, ${p.x} ${p.y}`);
      });
      if (cs.note) c.note(GX + GW + 14, cy + 22, cs.note);
    });
    gy += h + 22;
  });
  const W = o.groups.some((g) => g.consumers.some((x) => x.note)) ? GX + GW + 300 : GX + GW + 20;
  return c.svg(W, H, o.aria || 'Topics and consumer groups');
}

// Chapter 07 — the four consumer layouts
diagrams.basicOneConsumer = () => consumerMap({
  topics: [{ name: 'order-events', parts: ['P0', 'P1', 'P2'] }],
  groups: [{ label: 'Consumer Group 1', consumers: [{ label: 'C1', to: [[0, 0], [0, 1], [0, 2]], note: ['Only 1 consumer, so all 3 partitions', 'of order-events are assigned to C1', '(reads P0, P1, P2)'] }] }],
  aria: 'Consumer C1 of Consumer Group 1 reads partitions P0, P1 and P2 of order-events',
});
diagrams.oneConsumerTwoTopics = () => consumerMap({
  topics: [{ name: 'order-events', parts: ['P0'] }, { name: 'payment-events', parts: ['P0'] }],
  groups: [{ label: 'Consumer Group 1', consumers: [{ label: 'C1', to: [[0, 0], [1, 0]] }] }],
  aria: 'One consumer C1 reads order-events P0 and payment-events P0',
});
diagrams.twoConsumersTwoTopics = () => consumerMap({
  topics: [{ name: 'order-events', parts: ['P0'] }, { name: 'payment-events', parts: ['P0'] }],
  groups: [{ label: 'Consumer Group 1', consumers: [{ label: 'C1', to: [[0, 0]] }, { label: 'C2', to: [[1, 0]] }] }],
  aria: 'C1 reads order-events and C2 reads payment-events, both in Consumer Group 1',
});
diagrams.twoConsumersSameTopic = () => consumerMap({
  topics: [{ name: 'order-events', parts: ['P0', 'P1'] }],
  groups: [{ label: 'Consumer Group 1', consumers: [{ label: 'C1', to: [[0, 0]] }, { label: 'C2', to: [[0, 1]] }] }],
  aria: 'C1 reads P0 and C2 reads P1 of order-events in the same group',
});

module.exports = { brokerDiagram, clusterDiagram, consumerMap, diagrams };
