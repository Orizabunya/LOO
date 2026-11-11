/*
 * Loo engine — แปลงภาษาไทย ↔ ภาษาลู
 * รันบนเครื่องผู้ใช้ทั้งหมด ไม่ส่งข้อความออกนอกเครื่อง
 *
 * หลักการ: แบ่งข้อความไทยเป็นพยางค์ แล้วแปลงแต่ละพยางค์เป็น 2 พยางค์
 *   พยางค์ A = ล (หรือ ซ ถ้าต้นเดิมเป็น ร/ล) + สระเดิม + ตัวสะกดเดิม + เสียงวรรณยุกต์เดิม
 *   พยางค์ B = พยัญชนะต้นเดิม + สระ อุ/อู (หรือ อิ/อี ถ้าสระเดิมเป็น อุ/อู/อัว) + ตัวสะกดเดิม + วรรณยุกต์เดิม
 * กฎทั้งหมดปรับได้ที่ DEFAULT_RULES (ใช้ต่อในรุ่น "ตั้งกฎเอง")
 */

const TONE_MARKS = '่้๊๋';
const LEADING = 'เแโใไ';
const MID = 'กจฎฏดตบปอ';
const HIGH = 'ขฃฉฐถผฝศษสห';
const SONORANT_LOW = 'งญนมยรลวณฬ';
const DEAD_FINALS = 'กขคฆจชซฎฏฐฑฒดตถทธศษสบปพฟภ';
const LIVE_FINALS = 'งญณนมยรลวฬ';
const FINALS = DEAD_FINALS + LIVE_FINALS;
const BLOCK = 'ะาำัิีึืุู็่้๊๋์ๅ';
const CLUSTERS = ['กร', 'กล', 'กว', 'ขร', 'ขล', 'ขว', 'คร', 'คล', 'คว', 'ตร', 'ปร', 'ปล', 'พร', 'พล',
  'ผล', 'บร', 'บล', 'ดร', 'ฟร', 'ฟล', 'ทร', 'จร', 'ซร', 'ศร', 'สร'];

const isCons = (ch) => !!ch && ch >= 'ก' && ch <= 'ฮ';
const isThai = (ch) => !!ch && ch >= '\u0E01' && ch <= '\u0E5B';

/* ---------- ตารางสระ: [หน้า, บน/ล่าง, หลัง] แบบไม่มีตัวสะกด (o) / มีตัวสะกด (c) ---------- */
const V = {
  a:   { long: false, o: ['', '', 'ะ'], c: ['', 'ั', 'F'] },
  aa:  { long: true,  o: ['', '', 'า'], c: ['', '', 'าF'] },
  i:   { long: false, o: ['', 'ิ', ''], c: ['', 'ิ', 'F'] },
  ii:  { long: true,  o: ['', 'ี', ''], c: ['', 'ี', 'F'] },
  ue:  { long: false, o: ['', 'ึ', ''], c: ['', 'ึ', 'F'] },
  uee: { long: true,  o: ['', 'ื', 'อ'], c: ['', 'ื', 'F'] },
  u:   { long: false, o: ['', 'ุ', ''], c: ['', 'ุ', 'F'] },
  uu:  { long: true,  o: ['', 'ู', ''], c: ['', 'ู', 'F'] },
  e:   { long: false, o: ['เ', '', 'ะ'], c: ['เ', '็', 'F'] },
  ee:  { long: true,  o: ['เ', '', ''], c: ['เ', '', 'F'] },
  ae:  { long: false, o: ['แ', '', 'ะ'], c: ['แ', '็', 'F'] },
  aae: { long: true,  o: ['แ', '', ''], c: ['แ', '', 'F'] },
  o:   { long: false, o: ['โ', '', 'ะ'], c: ['', '', 'F'] },
  oo:  { long: true,  o: ['โ', '', ''], c: ['โ', '', 'F'] },
  or:  { long: false, o: ['เ', '', 'าะ'], c: ['', '็', 'อF'] },
  oor: { long: true,  o: ['', '', 'อ'], c: ['', '', 'อF'] },
  oe:  { long: false, o: ['เ', '', 'อะ'], c: ['เ', 'ิ', 'F'] },
  oee: { long: true,  o: ['เ', '', 'อ'], c: ['เ', 'ิ', 'F'] },
  ia:  { long: true,  o: ['เ', 'ี', 'ย'], c: ['เ', 'ี', 'ยF'] },
  uea: { long: true,  o: ['เ', 'ื', 'อ'], c: ['เ', 'ื', 'อF'] },
  ua:  { long: true,  o: ['', 'ั', 'ว'], c: ['', '', 'วF'] },
  ai1: { long: false, glide: 'ย', o: ['ไ', '', ''], c: ['ไ', '', 'F'] },
  ai2: { long: false, glide: 'ย', o: ['ใ', '', ''], c: ['ใ', '', 'F'] },
  ai3: { long: false, glide: 'ย', o: ['', 'ั', 'ย'], c: ['', 'ั', 'ยF'] },
  ao:  { long: false, glide: 'ว', o: ['เ', '', 'า'], c: ['เ', '', 'าF'] },
  am:  { long: false, glide: 'ม', o: ['', '', 'ำ'], c: ['', '', 'ำF'] },
  rr:  { long: false, glide: 'น', o: ['', '', 'รร'], c: ['', '', 'รรF'] },
};
const U_FAMILY = ['u', 'uu', 'ua'];

/* ---------- รูปแบบการเขียนที่ใช้แยกพยางค์ (T=วรรณยุกต์, F=ตัวสะกด, f=ตัวสะกดถ้ามี) ---------- */
const BODIES = {
  '': [
    { v: 'a', p: 'Tะ' }, { v: 'a', p: 'ัTF', cost: 0.1 }, { v: 'aa', p: 'Tาf' }, { v: 'am', p: 'Tำ' },
    { v: 'i', p: 'ิTf' }, { v: 'ii', p: 'ีTf' }, { v: 'ue', p: 'ึTf' },
    { v: 'uee', p: 'ืTอ' }, { v: 'uee', p: 'ืTF' }, { v: 'u', p: 'ุTf' }, { v: 'uu', p: 'ูTf' },
    { v: 'ua', p: 'ัTว' }, { v: 'ua', p: 'TวF', cost: 0.2 }, { v: 'oor', p: 'Tอf' },
    { v: 'or', p: '็อF' }, { v: 'ai3', p: 'ัTย' }, { v: 'rr', p: 'รรf' },
    { v: 'o', p: 'TF', cost: 0.4, implicit: true },
    { v: 'a', p: 'T', cost: 1.6, implicit: true },
  ],
  'เ': [
    { v: 'e', p: 'Tะ' }, { v: 'e', p: '็F' }, { v: 'ee', p: 'Tf' }, { v: 'or', p: 'Tาะ' },
    { v: 'ao', p: 'Tา' }, { v: 'oe', p: 'Tอะ' }, { v: 'oee', p: 'Tอ' }, { v: 'oee', p: 'ิTF' },
    { v: 'oee', p: 'Tย', fixedF: 'ย' }, { v: 'ia', p: 'ีTยf' }, { v: 'uea', p: 'ืTอf' },
  ],
  'แ': [{ v: 'ae', p: 'Tะ' }, { v: 'ae', p: '็F' }, { v: 'aae', p: 'Tf' }],
  'โ': [{ v: 'o', p: 'Tะ' }, { v: 'oo', p: 'Tf' }],
  'ไ': [{ v: 'ai1', p: 'Tf' }],
  'ใ': [{ v: 'ai2', p: 'T' }],
};

/* ---------- คำที่อ่านไม่ตรงรูป: เขียนตามเสียงก่อนแปลง ---------- */
const DEFAULT_EXCEPTIONS = {
  'สวัสดี': 'สะหวัดดี', 'ก็': 'ก้อ', 'จริง': 'จิง', 'ทราย': 'ซาย', 'สร้าง': 'ส้าง',
  'อร่อย': 'อะหร่อย', 'ฉลาด': 'ฉะหลาด', 'ตลาด': 'ตะหลาด', 'ทหาร': 'ทะหาน',
  'ผลไม้': 'ผนละไม้', 'ภรรยา': 'พันระยา', 'กรุณา': 'กะรุนา', 'บริษัท': 'บอริสัด',
  'ปัญหา': 'ปันหา', 'ธรรมชาติ': 'ทำมะชาด', 'ประโยชน์': 'ประโหยด', 'ศรี': 'สี',
  'เพราะ': 'เพาะ', 'ครับ': 'คับ', 'ไหม': 'ไหม', 'มั้ย': 'มั้ย', 'ฯลฯ': 'ฯลฯ',
  'ขนม': 'ขะหนม', 'สนุก': 'สะหนุก', 'ถนน': 'ถะหนน', 'สมุด': 'สะหมุด', 'ขยัน': 'ขะหยัน',
  'สบาย': 'สะบาย', 'ฉลอง': 'ฉะหลอง', 'สนาม': 'สะหนาม', 'จมูก': 'จะหมูก', 'อร่าม': 'อะหร่าม',
  'พระ': 'พระ', 'เธอ': 'เทอ', 'เขา': 'เขา', 'น้ำ': 'น้าม', 'เก้า': 'เก้า',
};

export const DEFAULT_RULES = {
  // พยัญชนะต้นของพยางค์ A
  aInitial: 'ล',
  aInitialHigh: 'หล',
  // ใช้เมื่อพยัญชนะต้นเดิมเป็น ร หรือ ล
  aInitialAlt: 'ซ',
  aInitialAltHigh: 'ส',
  altTriggers: 'รลฬ',
  // สระของพยางค์ B
  bShort: 'u', bLong: 'uu',
  // ใช้เมื่อสระเดิมอยู่ในตระกูล อุ/อู/อัว
  bShortAlt: 'i', bLongAlt: 'ii',
  keepCluster: true,
  exceptions: DEFAULT_EXCEPTIONS,
};

/* ---------- วรรณยุกต์ ---------- */
function consClass(leader, init) {
  if (leader === 'ห') return 'high';
  if (leader === 'อ') return 'mid';
  const c = init[0];
  if (MID.includes(c)) return 'mid';
  if (HIGH.includes(c)) return 'high';
  return 'low';
}

function isLive(vkey, F) {
  if (F) return !DEAD_FINALS.includes(F[0]);
  const v = V[vkey];
  return v.long || !!v.glide;
}

// 0 สามัญ, 1 เอก, 2 โท, 3 ตรี, 4 จัตวา
function toneOf(cls, mark, live, long) {
  const m = mark ? TONE_MARKS.indexOf(mark) : -1; // -1 ไม่มี
  if (cls === 'mid') return m >= 0 ? m + 1 : (live ? 0 : 1);
  if (cls === 'high') {
    if (m === 0) return 1;
    if (m === 1) return 2;
    if (m >= 2) return m + 1;
    return live ? 4 : 1;
  }
  if (m === 0) return 2;
  if (m === 1 || m === 2) return 3;
  if (m === 3) return 4;
  if (live) return 0;
  return long ? 2 : 3;
}

// สร้างเสียงวรรณยุกต์ให้พยัญชนะเสียงต่ำที่มีคู่เสียงสูง (ล/หล, ซ/ส)
function toneSpelling(base, high, tone, live, long) {
  switch (tone) {
    case 1: return live ? { cons: high, mark: '่' } : { cons: high, mark: '' };
    case 2: return (live || !long) ? { cons: base, mark: '่' } : { cons: base, mark: '' };
    case 3: return (live || long) ? { cons: base, mark: '้' } : { cons: base, mark: '' };
    case 4: return live ? { cons: high, mark: '' } : { cons: base, mark: '๋' };
    default: return { cons: base, mark: '' };
  }
}

/* ---------- ประกอบพยางค์ ---------- */
function render(s) {
  const v = V[s.vkey];
  let t;
  if (s.vkey === 'oee' && s.F === 'ย') t = ['เ', '', 'ย'];
  else t = s.F ? v.c : v.o;
  let [pre, mid, post] = t;
  if (s.mark && mid === '็') mid = '';
  const fin = (s.vkey === 'oee' && s.F === 'ย') ? '' : (s.F || '');
  post = post.replace('F', fin);
  return pre + (s.leader || '') + s.init + mid + (s.mark || '') + post + (s.silent || '');
}

/* ---------- แยกพยางค์ ---------- */
function matchPattern(w, k, pat, fixedF) {
  // คืนค่าทุกทางเลือก {end, mark, F}
  let states = [{ k, mark: '', F: fixedF || '' }];
  for (const ch of pat) {
    const next = [];
    for (const st of states) {
      if (ch === 'T') {
        if (TONE_MARKS.includes(w[st.k])) next.push({ ...st, k: st.k + 1, mark: w[st.k] });
        else next.push(st);
      } else if (ch === 'F' || ch === 'f') {
        const c = w[st.k];
        const nx = w[st.k + 1];
        const ok = c && FINALS.includes(c) && !(nx && BLOCK.includes(nx));
        if (ok) next.push({ ...st, k: st.k + 1, F: c });
        if (ch === 'f') next.push(st);
      } else if (w[st.k] === ch) {
        next.push({ ...st, k: st.k + 1 });
      }
    }
    states = next;
    if (!states.length) return [];
  }
  return states;
}

const SILENT_RE = /^[ก-ฮ]{1,2}[ิุ]?์/;

function candidates(w, i) {
  const out = [];
  let p = i;
  let pre = '';
  if (LEADING.includes(w[p])) { pre = w[p]; p++; }
  if (!isCons(w[p])) return out;
  const inits = [];
  const c0 = w[p], c1 = w[p + 1];
  if (c0 === 'ห' && c1 && SONORANT_LOW.includes(c1)) inits.push({ leader: 'ห', init: c1, len: 2, cost: -0.15 });
  if (c0 === 'อ' && c1 === 'ย') inits.push({ leader: 'อ', init: 'ย', len: 2, cost: -0.15 });
  if (c1 && CLUSTERS.includes(c0 + c1)) inits.push({ leader: '', init: c0 + c1, len: 2, cost: 0.05 });
  inits.push({ leader: '', init: c0, len: 1, cost: 0 });
  for (const ini of inits) {
    for (const body of BODIES[pre] || []) {
      for (const st of matchPattern(w, p + ini.len, body.p, body.fixedF)) {
        let end = st.k;
        let silent = '';
        const m = w.slice(end).match(SILENT_RE);
        if (m) { silent = m[0]; end += silent.length; }
        if (end === i) continue;
        out.push({
          end, cost: 1 + ini.cost + (body.cost || 0),
          syl: { leader: ini.leader, init: ini.init, mark: st.mark, vkey: body.v, F: st.F, silent,
            implicit: !!body.implicit, raw: w.slice(i, end) },
        });
      }
    }
  }
  return out;
}

function parseRun(w, opts = {}) {
  const n = w.length;
  const best = new Array(n + 1).fill(null);
  best[n] = { cost: 0, list: [] };
  for (let i = n - 1; i >= 0; i--) {
    let b = null;
    for (const c of candidates(w, i)) {
      const r = best[c.end];
      if (!r) continue;
      let cost = c.cost + r.cost;
      if (c.syl.implicit && c.syl.vkey === 'a' && c.end === n) cost += 0.5;
      if (!b || cost < b.cost) b = { cost, list: [c.syl, ...r.list] };
    }
    const r = best[i + 1];
    if (r) {
      const cost = 8 + r.cost;
      if (!b || cost < b.cost) b = { cost, list: [{ rawOnly: true, raw: w[i] }, ...r.list] };
    }
    best[i] = b;
  }
  const list = [];
  for (const s of best[0].list) {
    const last = list[list.length - 1];
    if (s.rawOnly && last && last.rawOnly) last.raw += s.raw;
    else list.push({ ...s });
  }
  if (!opts.keepWritten) applyLeadingClass(list);
  return list;
}

// อักษรนำแบบไม่มี ห: ส-มุด → สะ-หมุด, ขะ-หนม, ตะ-หลาด
function applyLeadingClass(list) {
  for (let k = 0; k < list.length - 1; k++) {
    const a = list[k], b = list[k + 1];
    if (a.rawOnly || b.rawOnly) continue;
    if (!(a.implicit && a.vkey === 'a' && a.init.length === 1 && !a.leader)) continue;
    const cls = consClass('', a.init);
    if (cls === 'low' || b.leader || b.init.length !== 1 || !SONORANT_LOW.includes(b.init)) continue;
    const live = isLive(b.vkey, b.F);
    const tone = toneOf(cls, b.mark, live, V[b.vkey].long);
    const sp = toneSpelling(b.init, 'ห' + b.init, tone, live, V[b.vkey].long);
    b.leader = sp.cons.length > 1 ? 'ห' : '';
    b.mark = sp.mark;
    a.implicit = false;
  }
}

/* ---------- แปลงพยางค์เดียว ---------- */
function encodeSyllable(s, rules) {
  const v = V[s.vkey];
  const live = isLive(s.vkey, s.F);
  const tone = toneOf(consClass(s.leader, s.init), s.mark, live, v.long);
  const soundInit = s.leader === 'ห' ? s.init : s.init[0];
  const alt = rules.altTriggers.includes(soundInit);
  const base = alt ? rules.aInitialAlt : rules.aInitial;
  const high = alt ? rules.aInitialAltHigh : rules.aInitialHigh;
  const sp = toneSpelling(base, high, tone, live, v.long);
  const aLeader = sp.cons.length > 1 ? sp.cons[0] : '';
  const aInit = sp.cons.length > 1 ? sp.cons.slice(1) : sp.cons;
  const A = render({ leader: aLeader, init: aInit, mark: sp.mark, vkey: s.vkey, F: s.F, silent: s.silent });

  const uFam = U_FAMILY.includes(s.vkey);
  const bV = v.long ? (uFam ? rules.bLongAlt : rules.bLong) : (uFam ? rules.bShortAlt : rules.bShort);
  let bF = s.F;
  if (v.glide) bF = (s.vkey === 'rr' && s.F) ? s.F : v.glide;
  const bInit = rules.keepCluster ? s.init : s.init[0];
  const B = render({ leader: s.leader, init: bInit, mark: s.mark, vkey: bV, F: bF, silent: '' });
  return { A, B };
}

/* ---------- ตัดคำ ---------- */
function splitTokens(text) {
  // แยกเป็นช่วงไทย/ไม่ใช่ไทย
  const tokens = [];
  let cur = '', thai = null;
  for (const ch of text) {
    const t = isThai(ch) && ch !== 'ๆ' && ch !== 'ฯ';
    if (thai === null || t === thai) cur += ch;
    else { tokens.push({ thai, text: cur }); cur = ch; }
    thai = t;
  }
  if (cur) tokens.push({ thai, text: cur });
  return tokens;
}

function segmentWords(run) {
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter('th', { granularity: 'word' });
      return Array.from(seg.segment(run), (x) => x.segment);
    }
  } catch (e) { /* ใช้ทั้งช่วงแทน */ }
  return [run];
}

/* ---------- API: ไทย → ลู ---------- */
export function thaiToLoo(text, userRules = {}, opts = {}) {
  const rules = { ...DEFAULT_RULES, ...userRules };
  const spaced = !!opts.spaced;
  const pieces = [];
  const parts = [];
  let lastWordOut = '';
  for (const tok of splitTokens(text)) {
    if (!tok.thai) {
      // ไม้ยมก: ซ้ำคำก่อนหน้า
      let t = tok.text;
      if (t.includes('ๆ') && lastWordOut) t = t.replace(/ๆ/g, (spaced ? ' ' : '') + lastWordOut);
      parts.push({ text: t, sep: true });
      continue;
    }
    for (const word of segmentWords(tok.text)) {
      const spelled = rules.exceptions[word] || word;
      const syls = parseRun(spelled);
      const outs = [];
      for (const s of syls) {
        if (s.rawOnly) { outs.push(s.raw); pieces.push({ orig: s.raw, a: s.raw, b: '' }); continue; }
        const { A, B } = encodeSyllable(s, rules);
        outs.push(A + B);
        pieces.push({ orig: render(s), a: A, b: B });
      }
      lastWordOut = outs.join(spaced ? ' ' : '');
      parts.push({ text: lastWordOut, sep: false });
    }
  }
  let out = '';
  for (let k = 0; k < parts.length; k++) {
    const p = parts[k], prev = parts[k - 1];
    if (spaced && prev && !prev.sep && !p.sep) out += ' ';
    out += p.text;
  }
  return { text: out, pieces };
}

/* ---------- API: ลู → ไทย ---------- */
let reverseCache = null;
function reverseExceptions(rules) {
  if (reverseCache && reverseCache.src === rules.exceptions) return reverseCache.list;
  const list = [];
  for (const [word, spelled] of Object.entries(rules.exceptions)) {
    const key = parseRun(spelled).map((s) => (s.rawOnly ? s.raw : render(s))).join('');
    if (key !== word) list.push([key, word]);
  }
  list.sort((x, y) => y[0].length - x[0].length);
  reverseCache = { src: rules.exceptions, list };
  return list;
}

function isASyllable(s, rules) {
  if (s.rawOnly) return false;
  const full = (s.leader || '') + s.init;
  return [rules.aInitial, rules.aInitialHigh, rules.aInitialAlt, rules.aInitialAltHigh].includes(full);
}

function isBVowel(vkey, rules) {
  return [rules.bShort, rules.bLong, rules.bShortAlt, rules.bLongAlt].includes(vkey);
}

function pairOk(a, b, rules) {
  if (!isASyllable(a, rules) || !isBVowel(b.vkey, rules)) return false;
  const glide = V[a.vkey].glide;
  const expectF = glide ? ((a.vkey === 'rr' && a.F) ? a.F : glide) : (a.F || '');
  return (b.F || '') === expectF;
}

// แยกข้อความลูโดยเลือกทางที่จับคู่ A+B ได้มากที่สุด
function decodeRun(w, rules) {
  const n = w.length;
  const cands = [];
  for (let i = 0; i < n; i++) cands[i] = candidates(w, i);
  const best = new Array(n + 1).fill(null);
  best[n] = { cost: 0, list: [] };
  for (let i = n - 1; i >= 0; i--) {
    let b = null;
    const take = (cost, item, next) => {
      const r = best[next];
      if (!r) return;
      const c = cost + r.cost;
      if (!b || c < b.cost) b = { cost: c, list: [item, ...r.list] };
    };
    for (const ca of cands[i]) {
      take(ca.cost + 3, { single: ca.syl }, ca.end);
      if (ca.end >= n) continue;
      for (const cb of cands[ca.end]) {
        if (pairOk(ca.syl, cb.syl, rules)) take(ca.cost + cb.cost - 1, { a: ca.syl, b: cb.syl }, cb.end);
      }
    }
    take(8, { raw: w[i] }, i + 1);
    best[i] = b;
  }
  return best[0].list;
}

export function looToThai(text, userRules = {}) {
  const rules = { ...DEFAULT_RULES, ...userRules };
  const rev = reverseExceptions(rules);
  const pieces = [];
  let out = '';
  for (const tok of splitTokens(text)) {
    if (!tok.thai) { out += tok.text; continue; }
    let runOut = '';
    for (const it of decodeRun(tok.text, rules)) {
      if (it.a) {
        const { a, b } = it;
        const orig = render({ leader: b.leader, init: b.init, mark: b.mark, vkey: a.vkey, F: a.F, silent: a.silent || b.silent });
        runOut += orig;
        pieces.push({ loo: a.raw + b.raw, orig });
      } else {
        const raw = it.raw || it.single.raw;
        runOut += raw;
        pieces.push({ loo: raw, orig: raw, unmatched: true });
      }
    }
    for (const [key, word] of rev) runOut = runOut.split(key).join(word);
    out += runOut;
  }
  return { text: out, pieces };
}

export const _internal = { parseRun, render, toneOf, encodeSyllable };
