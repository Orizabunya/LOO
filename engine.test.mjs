// รัน: node tests/engine.test.mjs
import { thaiToLoo, looToThai } from '../src/loo-engine.js';

// [ไทย, ลูที่คาดหวัง]  — แก้ค่าคาดหวังได้เมื่อชุมชนแจ้งว่าไม่ตรงกับที่พูดจริง
const CASES = [
  ['กิน', 'ลินกุน'],
  ['รัก', 'ซักรุก'],
  ['ดี', 'ลีดู'],
  ['ไป', 'ไลปุย'],
  ['ไม่', 'ไล่มุ่ย'],
  ['กุ้ง', 'ลุ่งกิ้ง'],
  ['ขา', 'หลาขู'],
  ['บ้าน', 'ล่านบู้น'],
  ['คน', 'ลนคุน'],
  ['จะ', 'หละจุ'],
  ['สวัสดี', 'หละสุหลัดหวุดลีดู'],
  ['เรียน', 'เซียนรูน'],
  ['เพื่อน', 'เลื่อนพู่น'],
  ['ข้าว', 'ล่าวขู้ว'],
  ['หมา', 'หลาหมู'],
  ['ตัว', 'ลัวตี'],
  ['เลย', 'เซยลูย'],
  ['ทำ', 'ลำทุม'],
  ['เขา', 'เหลาขุว'],
  ['ไหน', 'ไหลหนุย'],
];

let pass = 0, fail = 0;
for (const [th, expected] of CASES) {
  const loo = thaiToLoo(th).text;
  const back = looToThai(loo).text;
  const ok = loo === expected && back === th;
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ผ่าน' : 'ไม่ผ่าน'}  ${th} → ${loo}${loo !== expected ? ` (คาด ${expected})` : ''} → ${back}${back !== th ? ' (ถอดกลับไม่ตรง)' : ''}`);
}

// ประโยค
for (const s of ['กินข้าวยัง', 'ไปไหนมา', 'รักนะ', 'วันนี้อากาศดีมากๆ', 'สวัสดีค่ะ 123 OK']) {
  const loo = thaiToLoo(s).text;
  console.log(`ประโยค: ${s} → ${loo} → ${looToThai(loo).text}`);
}
console.log(`\nผ่าน ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
