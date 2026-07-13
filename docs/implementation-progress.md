# ความคืบหน้าการปรับปรุง Thai Energy Planner

## Maintenance Phase 1 — Experimental surface cleanup

- สถานะ: เสร็จแล้ว
- ลบ `e2e/presentation.spec.ts`, `demo.mjs`, script `npm run demo` และ dependency Puppeteer ที่เป็น presentation flow รุ่นเก่า
- ลด Battery, EV และ Ecosystem ให้เหลือ unavailable boundary; ลบ UI sub-routes, summary API และ web demo helpers ออกจาก production build โดยคง calculation engine ไว้เป็นฐานสำหรับการพัฒนาในอนาคต
- เพิ่ม E2E ครอบคลุม root/deep links ของโมดูลทดลองและ API ให้ตอบสถานะ unavailable โดยไม่ปรากฏใน navigation
- ตรวจ Acceptance Criteria: `npm run typecheck` และ `npm run lint` ผ่าน; `npm run test:e2e` ผ่าน 16 tests หลังเริ่ม dev runtime ใหม่จาก cache สะอาด

## Maintenance Phase 2 — Tooling and Solar observability

- สถานะ: เสร็จแล้ว
- เพิ่ม app-level ESLint flat config ให้ Next.js 15 ตรวจพบ `@next/next` และ Core Web Vitals rules ระหว่าง production build; คำเตือน plugin เดิมไม่ปรากฏอีก
- เพิ่ม Web Vitals reporter เฉพาะ `/analysis/solar` และ endpoint `/api/observability/web-vitals` เพื่อส่ง metric แบบ allow-list ไปยัง structured server log โดยไม่ส่งข้อมูลผู้ใช้ บิล หรือ Load Profile
- ป้องกัน endpoint ด้วย same-origin/rate-limit guard, payload-size limit และ runtime validation; เพิ่ม E2E ตรวจทั้ง payload ที่ยอมรับและ payload ที่ต้องปฏิเสธ
- เปลี่ยน audit logger จาก `any` เป็น `unknown` พร้อม runtime client guard หลัง app-level lint เปิดเผย type debt เดิม
- ตรวจ Acceptance Criteria: app lint และ typecheck ผ่าน; `npm run build` ผ่าน 51 routes โดยไม่มีคำเตือน Next.js ESLint plugin; E2E ของ observability endpoint ผ่าน

## Maintenance Phase 3 — Repository format and release verification

- สถานะ: เสร็จแล้ว
- เพิ่ม `.prettierignore` สำหรับ agent history, generated output, test artifacts และไฟล์ข้อมูล binary/sample ที่ไม่ควรถูก formatter แตะ
- จัดรูปแบบ source, config และเอกสารที่ดูแลจริงทั้ง repository ด้วย Prettier เพื่อให้ `npm run format` เป็น release gate ที่ใช้งานได้จริง
- ตรวจ Acceptance Criteria: `npm run format`, `npm run lint`, `npm run typecheck` และ `npm run build` ผ่าน; `npm test` ผ่าน 241 tests; `npm run test:e2e` ผ่าน 17 tests

## Maintenance Phase 4 — Dependency security verification

- สถานะ: เสร็จแล้ว
- อัปเกรด SheetJS จาก npm legacy release 0.18.5 เป็น official distribution 0.20.3 เพื่อแก้ high-severity advisories ที่กระทบ XLSX parser ใน production workflow
- ตรวจ `npm audit --omit=dev`: ไม่เหลือ high หรือ critical; เหลือ 2 moderate ใน PostCSS ที่ฝังมากับ Next.js และ npm เสนอ downgrade ที่ไม่เหมาะสม จึงไม่ใช้ `npm audit fix --force`
- critical advisory ที่ยังปรากฏเมื่อรวม dev dependencies อยู่ใน Vitest UI/dev server ซึ่งไม่ถูก deploy; การอัปเกรด Vitest 4 เป็น major migration แยกต่างหาก
- ตรวจ Acceptance Criteria หลังเปลี่ยน parser: `npm run format`, `npm run lint`, `npm run typecheck` และ `npm run build` ผ่าน; `npm test` ผ่าน 241 tests; `npm run test:e2e` ผ่าน 17 tests รวม XLSX upload/preview

## Maintenance Phase 5 — Production release

- สถานะ: เสร็จแล้ว
- Release commit: `85a0e87` ถูก push ไป `origin/staging`
- Production deployment: `dpl_2QVzFMZJvtMEajpkMZsJjJMMAvG5` พร้อม alias `https://thai-energy-planner-web.vercel.app`
- ตรวจ Acceptance Criteria หลัง deploy: `/api/health`, `/analysis/new`, `/analysis/load-data`, `/analysis/solar` และ `/analysis/reports` ตอบ 200; Battery/EV/Ecosystem root และ deep link แสดง unavailable boundary; `/api/observability/web-vitals` รับ allow-listed Solar metric และตอบ 204

## Maintenance Phase 6 — Guided data-order correction

- สถานะ: เสร็จแล้ว
- ปรับลำดับหลักเป็น เริ่มต้น → รูปแบบการใช้ไฟ → บิลค่าไฟ → วิเคราะห์ทางเลือก → สรุปและรายงาน โดยแยก route matching ของแต่ละขั้นเพื่อไม่ให้ path `/analysis/load-data/bills` ถูกนับเป็นขั้นรูปแบบการใช้ไฟ
- ปุ่มหลักหน้าเริ่มต้นนำผู้ใช้ไปสร้างรูปแบบการใช้ไฟเสมอ และเอาปุ่มสร้างโหลดที่ซ้ำออก; การอัปโหลดไฟล์คงเป็นทางเลือกสำหรับผู้ที่มีข้อมูลละเอียด
- ปรับข้อความเป้าหมายและหน้าแรกให้สื่อว่า Load Profile คือข้อมูลตั้งต้น ส่วนบิลใช้ปรับผลประมาณการให้ใกล้เคียงการใช้จริง
- ตรวจ Acceptance Criteria: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test` (241 tests), `npm run build` (51 routes) และ `npm run test:e2e` (18 tests) ผ่านทั้งหมด; เพิ่ม E2E ป้องกันการสลับลำดับกลับ

## Recovery Phase 1 — Production UI audit

- สถานะ: เสร็จแล้ว
- ตรวจหน้า production `/analysis/new` และ `/analysis/load-data` จาก DOM จริง: ทั้งคู่ใช้ AppShell เดียวกัน มีเมนู ภาพรวม / ข้อมูลของฉัน / การวิเคราะห์ / ผลลัพธ์ / ข้อมูลอ้างอิง และไม่มี Battery, EV หรือ Ecosystem ในเมนูหลัก
- ตรวจ Acceptance Criteria: ไม่พบข้อความ `Phase 3 Load Data` หรือ `เปิดหน้าทดสอบ` บนสองหน้าดังกล่าว; `/analysis/load-data` เป็นศูนย์กลางข้อมูลของฉัน จึงไม่ redirect เพื่อไม่ทำลาย flow เดิม
- การทดสอบ: browser production snapshot และ HTTP route checks ผ่าน

## Recovery Phase 2 — Single navigation cleanup

- สถานะ: เสร็จแล้ว
- ลบ `MainNav` ที่เป็น component ว่างและเอา import/markup ออกจากหน้าที่เคยอ้างถึง เพื่อให้มี navigation source เดียวคือ AppShell
- เพิ่ม regression test ครอบคลุม `/analysis/new` และ `/analysis/load-data`: มี navigation group 5 กลุ่ม, ไม่มีลิงก์ Battery/EV/Ecosystem และไม่มีข้อความ Prototype ที่ห้ามแสดง
- ตรวจ Acceptance Criteria: navigation เป็นระบบเดียวกันทุกหน้า; deep link ของโมดูลที่ยังไม่พร้อมยังถูก middleware พาไปหน้า unavailable
- การทดสอบ: `npm run typecheck` และ `npm run lint` ผ่าน

## Recovery Phase 3 — Solar and end-to-end workflow verification

- สถานะ: เสร็จแล้ว
- ลบข้อความ wizard `ขั้นตอนที่ 1 จาก 4` ออกจากหน้าสร้าง Load Profile และคงคำอธิบายที่บอกผลลัพธ์ของงานแทน
- ตรวจ Solar production ใน session ใหม่: หน้า render ครบและไม่มี console error แม้ browser automation จะ timeout ระหว่างคำสั่งนำทาง/คลิก; ตรวจ DOM หลัง timeout ยืนยันหน้า Solar พร้อมใช้งาน
- ตรวจ flow ใน E2E isolated browser context: บิลผู้ใช้ + Load Profile → TOU → Solar → บันทึกรายงาน; ตรวจ export JSON/CSV/PDF และ print ของรายงาน
- ตรวจ Acceptance Criteria: ไม่มีคำว่า Phase/หน้าทดสอบหรือ wizard header เดิมใน route หลัก, Solar ไม่มี runtime failure และ workflow ข้อมูลถึงรายงานถูกครอบคลุมด้วย regression test
- การทดสอบ: `npm run test:e2e` ผ่าน 15 tests

## Recovery Phase 4 — Release verification

- สถานะ: เสร็จแล้ว
- ตรวจ Acceptance Criteria: `MainNav` ถูกลบและไม่มีหน้าใดอ้างอิง; AppShell เป็น navigation เดียว; module Battery/EV/Ecosystem ยังไม่ถูกเสนอในเมนูและ deep link ถูกกั้นไว้
- การทดสอบ: `npm test` ผ่าน 241 tests, `npm run typecheck` ผ่าน, `npm run lint` ผ่าน, `npm run build` ผ่าน (54 routes), `npm run test:e2e` ผ่าน 15 tests และ `git diff --check` ผ่าน
- หมายเหตุ: build เตือนเรื่อง Next.js ESLint plugin configuration ที่มีอยู่เดิม แต่ไม่ทำให้ lint หรือ build ล้มเหลว
- Release: commit `f662bba` ถูก push ไป `origin/staging` และ deploy production สำเร็จเป็น `dpl_2LBsQDUGiH8rgg2rvkR6nZVV3k4V`; ตรวจ production route สำคัญและ redirect หลัง deploy ผ่าน

## Phase 0 — Audit Current State

- สถานะ: เสร็จแล้ว
- สิ่งที่ส่งมอบ: `docs/ux-audit.md`
- ตรวจ Acceptance Criteria: ตรวจ routes, navigation, component reuse, validation/readiness, local storage, calculation packages, responsive/dark mode/accessibility และชื่อ demo/draft แล้ว
- การทดสอบ: ตรวจ type-safe route/component structure และ test configuration ที่มีอยู่; ยังไม่มีโค้ดเปลี่ยนใน phase นี้
- ปัญหาที่แก้ใน phase: ไม่มี — เป็น phase สำรวจเพื่อป้องกันการแตะ calculation logic โดยไม่จำเป็น

## Phase 1 — UX

- สถานะ: เสร็จแล้ว
- สิ่งที่ส่งมอบ: `docs/user-journey.md`, `docs/user-flow.md`, `docs/ux-copy.md`, `AnalysisProgress`, goal-first start wizard
- ตรวจ Acceptance Criteria: หน้าเริ่มวิเคราะห์มีจุดเริ่มต้นจากเป้าหมาย, checklist ระบุขั้นที่เสร็จ/ข้อมูลที่ขาดและย้อนกลับได้, ผู้ไม่มี Load Profile มีสองเส้นทางเริ่มต้น, state เดิมของ import/scenario/report ยังคงอยู่
- การทดสอบ: `npm run typecheck` ผ่าน; `npm run lint` ผ่านหลังลบ import ที่ไม่ได้ใช้
- ปัญหาที่แก้: lint พบ unused `PlugZap` ใน app shell และแก้แล้ว

## Phase 2 — Information Architecture

- สถานะ: เสร็จแล้ว
- สิ่งที่ส่งมอบ: `docs/information-architecture.md`; grouped desktop/mobile navigation, renamed breadcrumbs และ accessible current state
- ตรวจ Acceptance Criteria: navigation สะท้อนภาษาผู้ใช้, ไม่มี URL เดิมถูกลบ, mobile navigation เป็นกลุ่มเดียวกับ desktop, active nav ใช้ pathname เดิม
- การทดสอบ: `npm run typecheck` ผ่าน; `npm run lint` ผ่าน
- ปัญหาที่แก้: ไม่มี redirect ใหม่ เพราะไม่เปลี่ยน path และเป็นแนวทางที่ปลอดภัยต่อ local browser context

## Phase 3 — Wireframe และ Layout Structure

- สถานะ: เสร็จแล้ว
- สิ่งที่ส่งมอบ: `docs/wireframes.md`, shared `PageHeader`/`SectionHeader`/`ActionBar`/`EmptyState`, page headers สำหรับ data, dashboard, bill, appliance, TOU, Solar และ reports
- ตรวจ Acceptance Criteria: หน้าหลักมี H1 เดียวใน header, data/action context อยู่ก่อน content, container และ responsive spacing ใช้ร่วมกัน, checklist รองรับ narrow screens โดย horizontal scroll
- การทดสอบ: `npm run typecheck` และ `npm run lint` ผ่านหลังเพิ่ม import `Badge` ที่หน้าข้อมูลการใช้ไฟ
- ปัญหาที่แก้: typecheck พบ `Badge` ถูกใช้อยู่ใน card แต่ import ถูกลบระหว่างจัด header; เพิ่ม import กลับแล้ว

## Phase 4 — Design System

- สถานะ: เสร็จแล้ว
- สิ่งที่ส่งมอบ: `docs/design-system.md`; semantic light/dark tokens, Thai-first font stack, chart color tokens, reduced-motion support, `Alert`/`MetricCard`/`DataConfidence`/`Skeleton`/`LoadingState`
- ตรวจ Acceptance Criteria: card/button/input ใช้ token กลาง, focus ring มีความชัดเจน, dark theme ไม่ใช้ดำสนิท, dashboard ใช้ MetricCard และ DataConfidence จาก shared system
- การทดสอบ: `npm run typecheck` ผ่าน; `npm run lint` ผ่าน
- ปัญหาที่แก้: ไม่มี

## Phase 5 — Modern UI

- สถานะ: เสร็จแล้ว
- สิ่งที่ส่งมอบ: homepage ใหม่แบบ goal-oriented พร้อม product preview ที่ระบุว่าเป็นตัวอย่าง, Solar results แบบ recommendation-first, copy ภาษาไทยในจุดสำคัญ และ visual hierarchy ที่ใช้ system tokens
- ตรวจ Acceptance Criteria: หน้าแรกระบุสิ่งที่เว็บทำ/เหมาะกับใคร/ต้องเตรียมอะไร/เวลาที่ใช้/จุดเริ่มต้น; คำแนะนำ Solar มาก่อนกราฟ; preview ไม่อ้างว่าเป็นข้อมูลผู้ใช้; dark mode และ responsive ใช้ token/layout เดียวกัน
- การทดสอบ: `npm run typecheck` ผ่าน; `npm run lint` ผ่าน; `npm run build` ผ่าน; `npm test` ผ่าน (calculation, tariff, shared types และ report engines)
- ปัญหาที่แก้: ไม่มี

## สถานะรวม

ดำเนินการครบ Phase 0–5 ตามลำดับ โดยไม่แก้ Local Storage schema. สถานะเดิมต้องอ่านร่วมกับการตรวจซ้ำด้านล่าง เพราะในเวลานั้นยังไม่ได้ครอบคลุม deep link สาธารณะทุก route

## การตรวจ flow หลังจบ Phase

- ทดลองผ่าน Browser MCP: เริ่มวิเคราะห์ → ข้อมูลตัวอย่าง → dashboard → ผล Solar → รายงาน
- ปัญหาที่พบ: dashboard ไม่แสดงบิลโหมด `sample` แม้ปุ่ม “ดูตัวอย่างผลลัพธ์” สร้างข้อมูลนั้นสำเร็จ
- การแก้: dashboard อ่าน workspace โหมด sample ได้เฉพาะเพื่อแสดง flow พร้อม badge และข้อความ “ข้อมูลตัวอย่าง”; checklist และ report readiness ยังคงไม่นับเป็นข้อมูลจริง
- การทดสอบ: `npm run typecheck` ผ่าน และตรวจ DOM บน browser ว่าแสดงยอดเฉลี่ย 6 เดือนพร้อมสถานะข้อมูลตัวอย่าง

## Recovery — Route migration และ release verification

- สถานะ: เสร็จแล้วสำหรับขอบเขต UX/IA ที่เปิดให้ผู้ใช้ใช้งาน
- แก้ `/analysis/solar` ให้ใช้ `SolarPageShell` และ `PageHeader` เดียวกับ Solar sub-routes; เอา copy ขั้นตอนเก่าออก
- ย้าย deep link เก่า `/analysis/scenarios/new`, `/analysis/scenarios/compare`, `/analysis/scenarios/results` ไป `/analysis/scenarios` และย้าย `/estimate` ไป `/analysis/new`
- ปรับ middleware เพื่อไม่ rewrite scenario deep links ไปหน้า “เร็ว ๆ นี้” ก่อน redirect ทำงาน
- เอา Battery, EV และเส้นทางเปรียบเทียบเก่าออกจาก navigation หลัก; โมดูลที่ยังไม่พร้อมคงหน้า unavailable สำหรับ deep link เท่านั้น
- ปรับ metadata หน้าเว็บ, breadcrumb และข้อความ recommendation/demo ที่อาจถูกส่งถึงผู้ใช้ให้เป็นภาษาผลิตภัณฑ์
- เพิ่ม E2E ครอบคลุม legacy redirects และ Solar shell ใหม่
- ตรวจ Acceptance Criteria: ไม่มี route หลักหรือ deep link ที่กำหนดเปิด Scenario/Estimate UI เก่า, Solar overview ใช้ shell กลาง, เมนูไม่ชี้ไปฟีเจอร์ที่ยังไม่พร้อม, theme label และ tariff route ยังถูกต้อง
- การทดสอบ: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` ผ่านทั้งหมด; E2E 14 tests ผ่าน และตรวจ DOM บน localhost ของ Solar ซ้ำ
- Release: พร้อม commit และ push หลังตรวจ clean diff; ไม่ได้ deploy ในรอบนี้
