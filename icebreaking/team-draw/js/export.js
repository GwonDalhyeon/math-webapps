// 결과 형식: 학번·모둠 복사, 이름·모둠 복사, CSV, 추첨 기록 JSON, 기록으로 다시 계산하기. DOM에 접근하지 않는다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};

  // 학번 순(학번이 없으면 명단 순)
  function byStudentNo(a, b) {
    if (a.studentNo && b.studentNo && a.studentNo !== b.studentNo) return Number(a.studentNo) - Number(b.studentNo);
    return a.id - b.id;
  }

  // 구조 해석실 parseGroupPaste용: "학번<TAB>모둠", 학번 순
  function groupPasteText(students, assign) {
    const rows = students.slice().sort(byStudentNo).map((s) => `${s.studentNo}\t${assign.get(s.id)}`);
    return ['학번\t모둠', ...rows].join('\n');
  }

  // "이름<TAB>모둠", 명단 순
  function namePasteText(students, assign) {
    const rows = students.slice().sort((a, b) => a.id - b.id).map((s) => `${s.name}\t${assign.get(s.id)}`);
    return ['이름\t모둠', ...rows].join('\n');
  }

  function csvCell(value) {
    let s = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // 엑셀이 수식으로 읽지 않게
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  // UTF-8 BOM, 열 "모둠,학번,이름", 모둠 순 → 학번 순
  function csvText(students, assign) {
    const rows = students.slice().sort((a, b) => (assign.get(a.id) - assign.get(b.id)) || byStudentNo(a, b));
    const lines = ['모둠,학번,이름', ...rows.map((s) => [assign.get(s.id), s.studentNo || '', s.name].map(csvCell).join(','))];
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  function csvFileName(date) {
    const d = date || new Date();
    const p = (x) => String(x).padStart(2, '0');
    return `team-draw-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.csv`;
  }

  // 추첨 기록: 학생 이름은 넣지 않고 명단 id만 쓴다.
  function recordJson(rec) {
    const out = { v: 1, n: rec.n, present: rec.present, sizes: rec.sizes, apart: rec.apart, mode: rec.mode };
    if (rec.mode === 'vector') out.vec = rec.vec;
    out.seed = rec.seed;
    out.u = rec.u;
    if (rec.order) out.order = rec.order;
    if (rec.fixes) out.fixes = rec.fixes;
    out.redraws = rec.redraws;
    return JSON.stringify(out);
  }

  // 기록(과 명단 id)만으로 결과를 다시 계산한다. → { assign, cardOf?, deck? }
  function replay(rec) {
    const R = TD.random, Gr = TD.groups;
    const s = R.createSession(R.fromHex(rec.seed), rec.u);
    const base = { presentIds: rec.present, sizes: rec.sizes, apart: rec.apart, stream: s.assign };
    if (rec.mode === 'marble' || rec.mode === 'slot') {
      return { assign: Gr.sampleFull(base.presentIds, base.sizes, base.apart, base.stream) };
    }
    if (rec.mode === 'card') {
      return { assign: Gr.replayDraws({ ...base, order: rec.order, fixes: rec.fixes || [] }).assignment() };
    }
    const deck = TD.vectors.generateDeck({ sizes: rec.sizes, colorOn: rec.vec.color, R0: rec.vec.R, stream: s.vector });
    const cards = deck.teams.map((vs) => vs.map((_, i) => i));
    if (rec.vec.deal === 'all') {
      const assign = Gr.sampleFull(base.presentIds, base.sizes, base.apart, base.stream);
      return { assign, cardOf: Gr.dealCards(base.presentIds, assign, cards, base.stream), deck };
    }
    const d = Gr.replayDraws({ ...base, cards, order: rec.order, fixes: rec.fixes || [] });
    const cardOf = new Map(rec.present.filter((id) => d.isDrawn(id)).map((id) => [id, d.cardOf(id)]));
    return { assign: d.assignment(), cardOf, deck };
  }

  TD.exporter = { byStudentNo, groupPasteText, namePasteText, csvText, csvFileName, recordJson, replay };
})(typeof window !== 'undefined' ? window : globalThis);
