// 명단 해석: 출석부(머리글 있음·없음), 학번+이름, 이름만 형식을 읽는다. DOM에 접근하지 않는다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};

  const MAX_STUDENTS = 60;
  const HEADER_WORDS = new Set(['학번', '번호', '학년', '반', '성명', '이름', '모둠', '조', '비고', '순', '연번']);
  const NAME_RE = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z]/;
  const DIGITS = /^\d+$/;

  // 구조 해석실 roster-core.js의 studentNumber와 같은 규칙: 학년 + 반 + 번호 두 자리, 반은 1~9
  function makeStudentNo(grade, ban, num, maxGrade) {
    if (!(grade >= 1 && grade <= maxGrade)) return null;
    if (!(ban >= 1 && ban <= 9)) return null;
    if (!(num >= 1 && num <= 99)) return null;
    return `${grade}${ban}${String(num).padStart(2, '0')}`;
  }

  function stripParen(s) {
    return s.replace(/\s*[(（][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim();
  }

  function splitCells(line, delim) {
    if (delim === 'ws') return line.trim().split(/\s+/).filter(Boolean);
    return line.split(delim).map((c) => c.trim());
  }

  function pickDelim(line) {
    if (line.includes('\t')) return '\t';
    if (line.includes(',')) return ',';
    if (line.includes(';')) return ';';
    return 'ws';
  }

  // 머리글 줄에 학년·반·번호·성명(이름)이 모두 있으면 그 열 위치를 돌려준다.
  function findHeader(lines) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const delim = pickDelim(line);
      const cells = splitCells(line, delim).map((c) => c.replace(/\s+/g, ''));
      const col = (w) => cells.indexOf(w);
      const nameCol = col('성명') >= 0 ? col('성명') : col('이름');
      if (col('학년') >= 0 && col('반') >= 0 && col('번호') >= 0 && nameCol >= 0) {
        return { index: i, delim, grade: col('학년'), ban: col('반'), num: col('번호'), name: nameCol };
      }
    }
    return null;
  }

  function parseWithHeader(lines, h, rows, skipped) {
    for (let i = h.index + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cells = splitCells(line, h.delim);
      const g = cells[h.grade] || '', b = cells[h.ban] || '', n = cells[h.num] || '';
      const nameRaw = (cells[h.name] || '').trim();
      const studentNo = DIGITS.test(g) && DIGITS.test(b) && DIGITS.test(n) ? makeStudentNo(+g, +b, +n, 9) : null;
      if (!studentNo || !NAME_RE.test(nameRaw)) { skipped.push(i + 1); continue; }
      rows.push({ line: i + 1, studentNo, nameRaw });
    }
  }

  function parseLines(lines, rows, skipped) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cells = line.trim().split(/[\t,;\s]+/).filter(Boolean);
      if (cells.every((c) => HEADER_WORDS.has(c))) continue; // 머리글 줄
      const start = cells.findIndex((c) => NAME_RE.test(c));
      if (start < 0) { skipped.push(i + 1); continue; } // 숫자만 있거나 이름 조각이 없는 줄
      let end = start;
      while (end + 1 < cells.length && NAME_RE.test(cells[end + 1])) end++;
      const nameRaw = cells.slice(start, end + 1).join(' ');
      let studentNo = cells.find((c) => /^\d{4,5}$/.test(c)) || null;
      if (!studentNo) {
        const before = cells.slice(0, start);
        if (before.length === 3 && before.every((c) => DIGITS.test(c))) {
          studentNo = makeStudentNo(+before[0], +before[1], +before[2], 3);
        }
      }
      rows.push({ line: i + 1, studentNo, nameRaw });
    }
  }

  // parseRoster(text) → { students:[{id, studentNo|null, name, nameRaw}], skippedLines, hasStudentNo, duplicateNos, totalFound }
  function parseRoster(text) {
    const lines = String(text == null ? '' : text).split(/\r?\n/);
    let rows = [];
    const skipped = [];
    let hasStudentNo;
    const header = findHeader(lines);
    if (header) {
      parseWithHeader(lines, header, rows, skipped);
      hasStudentNo = true;
    } else {
      parseLines(lines, rows, skipped);
      const withNo = rows.filter((r) => r.studentNo).length;
      hasStudentNo = rows.length > 0 && withNo * 2 >= rows.length;
      if (hasStudentNo) {
        rows = rows.filter((r) => {
          if (!r.studentNo) skipped.push(r.line);
          return !!r.studentNo;
        });
      } else {
        rows.forEach((r) => { r.studentNo = null; });
      }
    }

    // 괄호 표기를 떼어 낸 이름이 비면 그 줄은 건너뛴다.
    rows = rows.filter((r) => {
      r.name = stripParen(r.nameRaw);
      if (!r.name) skipped.push(r.line);
      return !!r.name;
    });

    const totalFound = rows.length;
    if (rows.length > MAX_STUDENTS) rows = rows.slice(0, MAX_STUDENTS);

    const duplicateNos = [];
    if (hasStudentNo) {
      const seen = new Set();
      for (const r of rows) {
        if (seen.has(r.studentNo) && !duplicateNos.includes(r.studentNo)) duplicateNos.push(r.studentNo);
        seen.add(r.studentNo);
      }
    } else {
      const count = new Map();
      for (const r of rows) {
        const k = (count.get(r.name) || 0) + 1;
        count.set(r.name, k);
        if (k >= 2) r.name = `${r.name} (${k})`;
      }
    }

    skipped.sort((a, b) => a - b);
    const students = rows.map((r, id) => ({ id, studentNo: r.studentNo, name: r.name, nameRaw: r.nameRaw }));
    return { students, skippedLines: skipped, hasStudentNo, duplicateNos, totalFound, maxStudents: MAX_STUDENTS };
  }

  TD.roster = { parseRoster, makeStudentNo, MAX_STUDENTS };
})(typeof window !== 'undefined' ? window : globalThis);
