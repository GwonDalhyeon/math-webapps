// 화면 공통 도구: 모둠 모양·색, 이름 칩, 모둠 칸, 대화상자, 정리 가능한 타이머 묶음.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};
  const doc = root.document;

  // 1 ▲ 빨강, 2 ● 파랑, 3 ■ 초록, 4 ◆ 주황, 5 ★ 보라, 6 ⬢ 청록. 7부터 같은 모양에 줄무늬, 13부터 속 빈 무늬
  const SHAPES = ['triangle', 'circle', 'square', 'diamond', 'star', 'hexagon'];
  const SHAPE_CHARS = ['▲', '●', '■', '◆', '★', '⬢'];
  const SHAPE_NAMES = ['세모', '동그라미', '네모', '마름모', '별', '육각형'];
  const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0d9488'];
  const TINTS = ['#fee2e2', '#dbeafe', '#dcfce7', '#ffedd5', '#ede9fe', '#ccfbf1'];
  const PATTERNS = ['', '줄무늬', '빈 무늬', '점선'];

  function meta(g) {
    const i = (g - 1) % 6;
    const cycle = Math.floor((g - 1) / 6);
    return {
      g, shape: SHAPES[i], char: SHAPE_CHARS[i], shapeName: SHAPE_NAMES[i], color: COLORS[i], tint: TINTS[i],
      pattern: cycle, patternName: PATTERNS[Math.min(cycle, 3)], label: `${g}모둠`,
    };
  }

  function shapePath(shape) {
    switch (shape) {
      case 'triangle': return '<polygon points="50,8 94,88 6,88"/>';
      case 'circle': return '<circle cx="50" cy="50" r="42"/>';
      case 'square': return '<rect x="12" y="12" width="76" height="76" rx="4"/>';
      case 'diamond': return '<polygon points="50,4 96,50 50,96 4,50"/>';
      case 'star': return '<polygon points="50,5 61,37 95,37 68,57 78,90 50,70 22,90 32,57 5,37 39,37"/>';
      default: return '<polygon points="50,4 90,27 90,73 50,96 10,73 10,27"/>';
    }
  }

  // 모둠 모양 아이콘(SVG 문자열). onDark면 흰색으로 그린다.
  function shapeSvg(g, size, onDark) {
    const m = meta(g);
    const fill = onDark ? '#ffffff' : m.color;
    let style = `fill="${fill}"`;
    let extra = '';
    if (m.pattern === 1) {
      const id = `stripe-${onDark ? 'w' : m.shape}-${Math.random().toString(36).slice(2, 7)}`;
      extra = `<defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${fill}"/><rect width="4" height="10" fill="${onDark ? 'rgba(15,23,42,.45)' : '#ffffff'}"/></pattern></defs>`;
      style = `fill="url(#${id})" stroke="${fill}" stroke-width="6"`;
    } else if (m.pattern >= 2) {
      style = `fill="none" stroke="${fill}" stroke-width="12"`;
    }
    return `<svg class="shape-icon" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${extra}<g ${style}>${shapePath(m.shape)}</g></svg>`;
  }

  function groupTitle(g) {
    const m = meta(g);
    return `${m.char} ${m.label}`;
  }

  function el(tag, attrs, html) {
    const e = doc.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 이름 칩: 길면 말줄임, title로 전체 이름
  function nameChip(student, extraClass) {
    const chip = el('span', { class: 'name-chip' + (extraClass ? ' ' + extraClass : ''), title: student.nameRaw || student.name, 'data-id': student.id });
    chip.textContent = student.name;
    return chip;
  }

  // 타이머·프레임·이벤트를 한곳에 모아 unmount 때 모두 정리한다.
  const active = { timeouts: 0, intervals: 0, frames: 0, listeners: 0, lifecycles: 0 };
  function lifecycle() {
    const timeouts = new Set(), intervals = new Set(), frames = new Set(), listeners = [], observers = [];
    active.lifecycles++;
    let disposed = false;
    return {
      timeout(fn, ms) {
        if (disposed) return 0;
        const id = root.setTimeout(() => { timeouts.delete(id); active.timeouts--; fn(); }, ms);
        timeouts.add(id); active.timeouts++;
        return id;
      },
      clearTimeout(id) { if (timeouts.delete(id)) { root.clearTimeout(id); active.timeouts--; } },
      interval(fn, ms) {
        if (disposed) return 0;
        const id = root.setInterval(fn, ms);
        intervals.add(id); active.intervals++;
        return id;
      },
      clearInterval(id) { if (intervals.delete(id)) { root.clearInterval(id); active.intervals--; } },
      frame(fn) {
        if (disposed) return 0;
        const id = root.requestAnimationFrame((t) => { frames.delete(id); active.frames--; fn(t); });
        frames.add(id); active.frames++;
        return id;
      },
      on(target, type, fn, opts) {
        if (disposed) return;
        target.addEventListener(type, fn, opts);
        listeners.push([target, type, fn, opts]); active.listeners++;
      },
      observe(observer) { observers.push(observer); return observer; },
      dispose() {
        if (disposed) return;
        disposed = true;
        active.lifecycles--;
        timeouts.forEach((id) => root.clearTimeout(id)); active.timeouts -= timeouts.size; timeouts.clear();
        intervals.forEach((id) => root.clearInterval(id)); active.intervals -= intervals.size; intervals.clear();
        frames.forEach((id) => root.cancelAnimationFrame(id)); active.frames -= frames.size; frames.clear();
        listeners.forEach(([t, ty, fn, o]) => t.removeEventListener(ty, fn, o)); active.listeners -= listeners.length; listeners.length = 0;
        observers.forEach((o) => o.disconnect()); observers.length = 0;
      },
      get disposed() { return disposed; },
    };
  }

  // 모둠 칸: 모둠마다 모양·번호·빈 자리 테두리, 이름 칩이 채워진다.
  function groupBoard(container, sizes, opts) {
    const o = opts || {};
    container.innerHTML = '';
    container.classList.add('group-board');
    container.classList.toggle('two-col', sizes.length > 6);
    const boxes = sizes.map((size, i) => {
      const g = i + 1;
      const m = meta(g);
      const box = el('div', { class: 'gb-box', style: `--gc:${m.color};--gt:${m.tint}`, 'data-g': g });
      box.innerHTML = `<div class="gb-head">${shapeSvg(g, 26)}<span class="gb-label">${m.label}</span><span class="gb-count">0/${size}</span><span class="gb-check" aria-hidden="true">✔</span></div><div class="gb-slots"></div>`;
      const slots = box.querySelector('.gb-slots');
      for (let k = 0; k < size; k++) slots.appendChild(el('span', { class: 'gb-empty' }));
      container.appendChild(box);
      return { box, slots, size, members: [] };
    });
    function refresh(b) {
      b.slots.innerHTML = '';
      b.members.forEach((s) => b.slots.appendChild(nameChip(s, o.chipClass)));
      for (let k = b.members.length; k < b.size; k++) b.slots.appendChild(el('span', { class: 'gb-empty' }));
      b.box.querySelector('.gb-count').textContent = `${b.members.length}/${b.size}`;
      b.box.classList.toggle('full', b.members.length === b.size);
    }
    return {
      place(student, g) {
        const b = boxes[g - 1];
        b.members.push(student);
        refresh(b);
        const chip = b.slots.querySelector(`[data-id="${student.id}"]`);
        if (chip) { chip.classList.add('pop'); }
        return b.members.length === b.size;
      },
      remove(student) {
        for (const b of boxes) {
          const i = b.members.findIndex((s) => s.id === student.id);
          if (i >= 0) { b.members.splice(i, 1); refresh(b); return; }
        }
      },
      fillAll(assign, students) {
        boxes.forEach((b) => { b.members = []; });
        for (const s of students) if (assign.has(s.id)) boxes[assign.get(s.id) - 1].members.push(s);
        boxes.forEach(refresh);
      },
    };
  }

  // 확인·선택 대화상자. Promise로 답을 돌려준다.
  function dialog({ title, body, okLabel, cancelLabel, danger, build }) {
    return new Promise((resolve) => {
      const dlg = doc.getElementById('dialog');
      if (dlg.open) dlg.close();
      const prevFocus = doc.activeElement;
      dlg.innerHTML = '';
      const form = el('form', { method: 'dialog', class: 'dlg-form' });
      if (title) form.appendChild(el('h2', { class: 'dlg-title', text: title }));
      if (body) form.appendChild(el('div', { class: 'dlg-body' }, body));
      // close 이벤트는 화면을 다시 그릴 때까지 늦게 올 수 있어, 답은 바로 돌려준다.
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        dlg.removeEventListener('close', onClose);
        if (dlg.open) dlg.close();
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* 무시 */ }
        resolve(v);
      };
      const onClose = () => finish(false); // Esc 등으로 닫힌 경우
      const api = { close(v) { finish(v); } };
      if (build) build(form, api);
      const actions = el('div', { class: 'dlg-actions' });
      if (cancelLabel !== null) {
        const cancel = el('button', { type: 'button', class: 'btn btn-ghost', text: cancelLabel || '취소' });
        cancel.addEventListener('click', () => api.close(false));
        actions.appendChild(cancel);
      }
      if (okLabel !== null) {
        const ok = el('button', { type: 'submit', class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), text: okLabel || '확인', value: 'ok' });
        actions.appendChild(ok);
      }
      form.appendChild(actions);
      form.addEventListener('submit', (e) => { e.preventDefault(); if (api.onSubmit) { const v = api.onSubmit(); if (v === undefined) return; api.close(v); } else api.close(true); });
      dlg.appendChild(form);
      dlg.addEventListener('close', onClose);
      dlg.showModal();
      const first = form.querySelector('[autofocus]') || form.querySelector('.dlg-actions .btn-primary, .dlg-actions .btn-danger');
      if (first) first.focus();
    });
  }

  function confirm(message, okLabel, danger) {
    return dialog({ title: message, okLabel: okLabel || '확인', danger });
  }

  // 글로 알리기(aria-live)
  function announce(text) {
    const live = doc.getElementById('live');
    if (!live) return;
    live.textContent = '';
    root.setTimeout(() => { live.textContent = text; }, 30);
  }

  const reducedMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  TD.ui = { meta, shapeSvg, groupTitle, el, esc, nameChip, lifecycle, active, groupBoard, dialog, confirm, announce, reducedMotion };
})(window);
