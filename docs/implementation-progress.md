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
- Release: commit `c9aae45` ถูก push ไป `origin/staging` และ deploy production สำเร็จเป็น `dpl_HtEtq5FMJB9sLNAKV8VPzXpC986L` ที่ `https://thai-energy-planner-web.vercel.app`

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

## Product refinement Phase 1 — Goal-aware recommendations

- สถานะ: เสร็จแล้ว
- เชื่อมเป้าหมาย 4 แบบกับพฤติกรรมจริงของระบบ: ลดค่าไฟ, ตรวจความเหมาะสมของ TOU, ประเมิน Solar และทำความเข้าใจการใช้ไฟ
- แต่ละเป้าหมายเปลี่ยนลำดับคำแนะนำ จุดโฟกัส ปุ่มดำเนินการถัดไป และปลายทางที่เหมาะสม โดยไม่เปลี่ยนสูตรหรือค่าผลการคำนวณ
- หน้าบิล, TOU, Solar และรายงานแสดงเป้าหมายที่กำลังใช้ เพื่อให้ผู้ใช้เข้าใจว่าระบบกำลังจัดลำดับคำแนะนำจากอะไร
- หน้ารายงานจัดลำดับความพร้อมของโมดูลตามเป้าหมาย และยังคงแสดงผลลัพธ์โมดูลอื่นเพื่อให้เปลี่ยนใจภายหลังได้
- ตรวจ Acceptance Criteria: เป้าหมายทั้ง 4 ให้คำแนะนำและ CTA ต่างกัน, ไปยังปลายทางต่างกันตามเจตนา, การคำนวณเดิมไม่ถูกแก้ และไม่มีเส้นทางใดถูกปิดกั้น
- การทดสอบ: `npm run lint`, `npm run typecheck`, web unit tests 51 tests, targeted E2E ครบ 4 เป้าหมาย และ `npm run build` ผ่าน (51 routes)

## Product refinement Phase 2 — Decision-first content hierarchy

- สถานะ: เสร็จแล้ว
- เพิ่มโครงเนื้อหาร่วมแบบ คำตอบ → เหตุผล → หลักฐานสำคัญ → ข้อจำกัด → สิ่งที่ควรทำต่อ เพื่อให้ผู้ใช้เข้าใจข้อสรุปก่อนอ่านรายละเอียดเชิงเทคนิค
- หน้าเปรียบเทียบ Normal / TOU แสดงแผนที่เหมาะสม ผลต่างรายปี สัดส่วน Off-Peak ช่วงข้อมูล ระดับความน่าเชื่อถือ และข้อจำกัดไว้ก่อนตารางกับกราฟ
- หน้าผล Solar ใช้โครงคำแนะนำเดียวกัน พร้อมผลประหยัด ระยะคืนทุน ขนาดที่ผ่านเกณฑ์ risk สำคัญ และ next action
- หน้ารายงานย้ายสถานะความพร้อมและข้อมูลที่ยังขาดขึ้นก่อนรายการรายงาน เพื่อให้ผู้ใช้รู้ทันทีว่าสร้างหรือส่งออกรายงานได้หรือยัง
- แก้การแปลระดับคุณภาพข้อมูลให้รองรับค่าจริงจาก engine (`HIGH/MEDIUM/LOW`) และไม่แสดงระดับต่ำผิดพลาดเมื่อข้อมูลมีคุณภาพสูง
- ตรวจ Acceptance Criteria: หน้าผลลัพธ์หลักมีข้อสรุปก่อนรายละเอียด, มีเหตุผลและหลักฐานตรวจย้อนกลับได้, แสดงข้อจำกัดใกล้คำแนะนำ และบอกการดำเนินการถัดไปอย่างชัดเจน
- การทดสอบ: `npm run lint`, `npm run typecheck` และ targeted E2E ตั้งแต่บิล + Load Profile → TOU → Solar → รายงานผ่าน

## Product refinement Phase 3 — Modern visual foundation

- สถานะ: เสร็จแล้ว
- ปรับ design tokens ของพื้นหลัง ตัวอักษร muted surface เส้นขอบ radius และเงา ให้มี contrast ชัดแต่พื้นผิวเบาลง พร้อมรองรับ light/dark theme เดิม
- เพิ่มพื้นหลังแบบแสงอ่อน, translucent sticky header และ elevated surface เพื่อสร้างมิติแบบเรียบโดยไม่รบกวนกราฟหรือข้อมูลตัวเลข
- ปรับ shared Card, Button, Badge และ PageHeader ให้ใช้ radius, spacing, typography, hover, active และ focus treatment เดียวกัน
- navigation desktop แสดงกลุ่มที่กำลังใช้งานแม้ dropdown ปิดอยู่ และปรับ popover/header ให้มีลำดับชั้นชัดขึ้น
- เพิ่ม global visible focus, text rendering, balanced heading และ reduced-motion เดิมยังทำงาน เพื่อไม่แลกความทันสมัยกับ accessibility
- แนวทางภาพอ้างอิงจากหน้า iPad ปัจจุบันของ Apple เฉพาะหลักการ hierarchy, whitespace และ lightweight surfaces โดยคงภาษาและตัวตนของผลิตภัณฑ์วางแผนพลังงาน
- ตรวจ Acceptance Criteria: shared components ใช้ token กลาง, navigation มี active state ชัด, focus มองเห็นได้, dark mode มี token ครบ และ production CSS compile สำเร็จ
- การทดสอบ: `npm run lint`, `npm run typecheck` และ `npm run build` ผ่าน (51 routes)

## Product refinement Phase 4 — Home and guided-start redesign

- สถานะ: เสร็จแล้ว
- ออกแบบ hero หน้าแรกใหม่ให้สื่อคุณค่าหลักและแสดง workflow 4 ขั้น: เลือกเป้าหมาย → สร้างรูปแบบการใช้ไฟ → เพิ่มบิลเพื่อปรับความแม่นยำ → ดูคำแนะนำและรายงาน
- ปรับส่วนเริ่มต้นของหน้าแรกให้การ์ดสร้าง Load Profile เด่นและใหญ่ที่สุด, การนำเข้าไฟล์เป็นทางเลือกของผู้มีข้อมูลละเอียด และบิลเป็นขั้นเสริมภายหลัง
- หน้าเริ่มวิเคราะห์แสดงผลของเป้าหมายทั้ง 4 ชัดขึ้นด้วยข้อความ “ระบบจะเน้น” ที่ต่างกัน และสถานะด้านข้างใช้ focus จริงจาก goal guidance
- แยกขั้นสร้าง Load Profile ออกจากขั้นเพิ่มบิลอย่างชัดเจน: เครื่องใช้ไฟฟ้า/ไฟล์โหลดอยู่ขั้นที่ 3, บิลอยู่ขั้นที่ 4 พร้อมบอกว่าข้ามและกลับมาเพิ่มภายหลังได้
- เพิ่ม `aria-pressed` ให้ตัวเลือกเป้าหมายและประเภทผู้ใช้ เพื่อให้สถานะเลือกสื่อสารกับ assistive technology
- ตรวจ Acceptance Criteria: CTA หลักยังพาไปสร้างรูปแบบการใช้ไฟ, บิลไม่ถูกเสนอเป็นจุดเริ่มต้นหลัก, 4 เป้าหมายอธิบายผลคำแนะนำต่างกัน และลำดับบนหน้าตรงกับ progress tracker
- การทดสอบ: `npm run lint`, `npm run typecheck`, targeted E2E ยืนยัน Load Profile อยู่ก่อนบิล และ `npm run build` ผ่าน (51 routes)

## Product refinement Phase 5 — Results and reports redesign

- สถานะ: เสร็จแล้ว
- หน้า Normal / TOU แยก card เลือกข้อมูลต้นทางออกจากผลลัพธ์ เพื่อลด card ซ้อน card และให้ decision summary เป็นชั้นหลักของหน้า
- ย้ายตารางเปรียบเทียบขนาดใหญ่และกราฟไว้ใน disclosure “ดูตารางและกราฟเปรียบเทียบ” ผู้ใช้ทั่วไปจึงเห็นคำตอบกับคำแนะนำก่อน ส่วนผู้ตรวจสอบยังเปิดรายละเอียดได้ครบ
- หน้ารายงานจัด analysis report เป็น responsive grid, ใช้สีเส้นขอบสื่อสถานะข้อมูลปัจจุบัน/ล้าสมัย และทำรายงานบิลล่าสุดให้เด่นขึ้น
- แปลข้อความเทคนิคที่ยังเป็นอังกฤษใน TOU, Solar และรายงาน เช่นหัวตาราง หน่วยเงิน ความมั่นใจ ความเสี่ยง และสมมติฐาน ให้เป็นภาษาไทยสม่ำเสมอ
- คงตัวเลข การคำนวณ trace สมมติฐาน export และข้อมูลต้นทางเดิมทั้งหมด เปลี่ยนเฉพาะ presentation และ copy
- ตรวจ Acceptance Criteria: คำตอบอยู่ก่อนรายละเอียด, ตารางและกราฟยังเข้าถึงได้, รายงานล่าสุด/ล้าสมัยมองแยกได้ และ flow บันทึก TOU + Solar ไปหน้ารายงานยังทำงาน
- การทดสอบ: `npm run lint`, `npm run typecheck`, targeted E2E บิล + Load Profile → TOU → Solar → รายงาน และ `npm run build` ผ่าน (51 routes)

## Product refinement Phase 6 — Form and data-entry refinement

- สถานะ: เสร็จแล้ว
- รวมปุ่มนำเข้า ส่งออก สแกน สำรองข้อมูล และเริ่มใหม่ของหน้าบิลไว้ใน disclosure เดียว เพื่อลดปุ่มรองที่แย่งความสนใจจากการกรอกข้อมูล
- เพิ่ม accessible label ให้ input/select รายบิลทุกช่อง, รองรับ decimal input บนอุปกรณ์มือถือ และใช้ `aria-invalid` พร้อมพื้นหลังเตือนกับแถวที่ validation ไม่ผ่าน
- save status ของหน้าบิลและหน้าเครื่องใช้ไฟฟ้าใช้ `aria-live` เพื่อแจ้งสถานะบันทึกโดยไม่ต้องย้าย focus
- ลบปุ่มตัวอย่างที่ทำงานซ้ำในหน้าเครื่องใช้ไฟฟ้า เหลือ “ใช้ชุดนี้เป็นจุดเริ่มต้น” และ “ล้างและเลือกชุดใหม่” ที่ความหมายต่างกันชัดเจน
- ปรับแถบ action ของ Load Profile ให้ปุ่มบันทึกอย่างเดียวเป็น secondary และ “บันทึกแล้วกรอกบิล” เป็น primary ตาม workflow ที่กำหนด
- ปรับ card ของ form/result และ sticky action bar ให้ใช้ visual system เดียวกัน พร้อมเพิ่ม label และ input mode ให้ shared fields
- ตรวจ Acceptance Criteria: ปุ่มหลักหนึ่งรายการต่อบริบท, เครื่องมือขั้นสูงยังเข้าถึงได้, validation สื่อสารทั้งภาพและ accessibility, schema/ข้อมูลที่บันทึกไม่เปลี่ยน
- การทดสอบ: `npm run lint`, `npm run typecheck` และ targeted E2E ครอบคลุม empty-state/entry ของบิลและเครื่องใช้ไฟฟ้าผ่าน 2 tests

## Product refinement Phase 7 — Motion, accessibility and performance

- สถานะ: เสร็จแล้ว
- เพิ่ม skip link “ข้ามไปเนื้อหาหลัก” เป็น focus แรกของหน้า และเพิ่ม target ที่รับ keyboard focus ได้ใน AppShell
- แท็บ Solar เปลี่ยนเป็น navigation landmark พร้อม `aria-label` และ `aria-current="page"` เพื่อบอกสถานะหน้าปัจจุบัน
- เพิ่ม page-enter transition ระยะสั้นและ skeleton ของกราฟ โดย media query `prefers-reduced-motion` เดิมจะลด animation/transition เหลือทันที
- แยก Recharts ของ Solar เป็น lazy-loaded client chunk พร้อม loading skeleton ทำให้ route ที่ไม่ต้องแสดงกราฟไม่แบก chart bundle ตั้งแต่แรก
- ผล build: `/analysis/solar` First Load JS ลดประมาณ 327 → 214 kB, `/analysis/solar/results` ลด 502 → 389 kB และ Solar finance/sizing/sensitivity ลดเหลือประมาณ 106 kB
- ตรวจ Acceptance Criteria: keyboard เห็น skip link, choice state ใช้ ARIA, mobile 390px ไม่มี horizontal overflow, Solar tab มี current state เดียว และ reduced-motion ยังคงครอบคลุม motion ใหม่
- การทดสอบ: `npm run lint`, `npm run typecheck`, `npm run build` (51 routes) และ targeted mobile/keyboard E2E ผ่าน

## Product refinement Phase 8 — Full regression and release readiness

- สถานะ: ผ่านการตรวจทั้งหมดและพร้อม release
- ตรวจครบทุก Phase ว่าเปลี่ยนเฉพาะ orchestration, copy, UI, accessibility และ code splitting; ไม่เปลี่ยนสูตรคำนวณ tariff/scenario/Solar หรือ localStorage schema
- แก้ regression ที่พบระหว่าง full E2E: เคส export เดิมคลิกปุ่มที่ย้ายเข้า disclosure โดยไม่เปิดเมนูก่อน ปรับ test ให้จำลองขั้นตอนผู้ใช้จริง แล้วรันทั้งชุดซ้ำจนผ่าน
- ตรวจ Acceptance Criteria: 4 เป้าหมายให้คำแนะนำต่างกัน, Load Profile มาก่อนบิล, decision-first results, navigation ระบบเดียว, experimental modules ไม่ปรากฏเป็นฟังก์ชันพร้อมใช้, export/import/report และ mobile keyboard flow ทำงานครบ
- การทดสอบรอบ release: `npm run format`, `git diff --check`, `npm run lint`, `npm run typecheck`, `npm test` ผ่าน 243 tests, `npm run test:e2e` ผ่าน 20 tests และ `npm run build` ผ่าน 51 routes
- Release procedure: commit และ push เฉพาะไฟล์ในขอบเขตนี้ไป `origin/staging` แล้ว deploy production หลังทุก gate ผ่าน

## Maintenance — Scenario bill breakdown number formatting

- สถานะ: เสร็จแล้ว
- ปรับตารางรายละเอียดค่าไฟของทางเลือกที่เหมาะ: ปริมาณแสดงสูงสุด 2 ตำแหน่งทศนิยม, อัตราแสดงสูงสุด 4 ตำแหน่ง, จำนวนเงินและ VAT/รวมสุทธิคง 2 ตำแหน่งพร้อมตัวคั่นหลักพัน
- จัดคอลัมน์ตัวเลขชิดขวาและใช้ tabular numerals เพื่อให้จุดทศนิยมอ่านเทียบกันได้ง่าย
- การเปลี่ยนแปลงเกิดเฉพาะ presentation: engine ยังคงเก็บค่าความละเอียดเดิมและไม่มีการเปลี่ยนสูตรคำนวณ
- การทดสอบ: `npm run lint`, `npm run typecheck` และ targeted E2E Flow C ผ่าน

## Product refinement — Answer-first scenario result

- สถานะ: เสร็จแล้ว
- ยกระดับกล่องคำตอบ Normal / TOU และ Solar ให้เป็น Answer Hero ที่แยกจากการ์ดข้อมูลทั่วไปอย่างชัดเจน ด้วยแถบระบุ “คำตอบหลักของคุณ”, หัวข้อขนาดใหญ่, ตัวเลขยืนยันที่เน้นค่าหลัก และแถบขั้นตอนถัดไปสีหลัก
- แก้คำตอบหน้า Normal / TOU ให้หัวข้อ เหตุผล ตัวเลขประหยัด และขั้นตอนถัดไปอ้างอิง `bestScenario` เดียวกัน จึงไม่แสดงตัวเลขหรือคำแนะนำคนละทางเลือกในกล่องเดียวกัน
- แปลคำอธิบายคำแนะนำและข้อจำกัดจาก calculation engine เป็นภาษาไทยสำหรับการแสดงผล โดยคงชนิดคำแนะนำ supporting metrics สูตร และค่าคำนวณเดิม
- เพิ่ม region label และ test id ให้คำตอบหลัก เพื่อให้ผู้ใช้เทคโนโลยีช่วยเหลือและ E2E ระบุส่วนคำตอบได้โดยตรง
- ตรวจ Acceptance Criteria: คำตอบมีลำดับชั้นเด่นกว่าการ์ดทั่วไป, เหตุผลตรงกับทางเลือกที่เลือก, ไม่มีข้อความ `THB/month` หรือข้อจำกัดภาษาอังกฤษใน Answer Hero และข้อมูลเดิมไม่ถูกเปลี่ยน
- การทดสอบ: `npm run lint`, `npm run typecheck` และ targeted E2E Flow C ผ่าน

## Product refinement — Explicit Solar start flow

- สถานะ: เสร็จแล้ว
- เปลี่ยนหน้าแรกของ Solar จาก “ภาพรวม” เป็น “1. ข้อมูลประเมิน” และแสดงเฉพาะขั้นตรวจข้อมูลกับสมมติฐานก่อนเริ่มคำนวณ
- ยกเลิกการยิง Solar API อัตโนมัติเมื่อเปิดหน้า แม้ระบบจะพบ Load Profile ที่บันทึกไว้ ผู้ใช้ต้องตรวจแหล่งข้อมูล ปริมาณไฟ ขนาดระบบ และเงินลงทุนตั้งต้น แล้วกด “เริ่มประเมิน Solar” เอง
- แยกค่าตั้งต้นออกจากผลลัพธ์ด้วยข้อความชัดเจนว่าเป็นสมมติฐาน ไม่ใช่คำแนะนำหรือผลการประเมิน และไม่สร้าง KPI จากค่าตัวอย่างเมื่อยังไม่มี Load Profile
- ซ่อนแท็บผลการประเมิน ขนาดระบบ การเงิน และความไวของผลลัพธ์ระหว่างขั้นเตรียมข้อมูล รวมทั้งเอาสรุปผลอัตโนมัติออกจากหน้าสมมติฐาน
- หน้า `/analysis/solar/results` ต้องได้รับการยืนยันจากฟอร์มสมมติฐานก่อน หากเปิดตรงจะกลับไปเริ่มที่หน้าข้อมูลประเมิน
- ตรวจ Acceptance Criteria: เข้า Solar แล้วไม่เห็นผลลัพธ์ทันที, ผู้ไม่มีข้อมูลไม่เห็น KPI หรือปุ่มเริ่มคำนวณ, ผู้มี Load Profile ต้องกดเริ่มเอง และ Flow บันทึกผล Solar เป็นรายงานยังทำงาน
- การทดสอบ: `npm run lint`, `npm run typecheck`, targeted E2E กรณีไม่มีข้อมูล + Flow C และ production build ผ่าน

## Visual refinement — Solar footage homepage hero

- สถานะ: เสร็จแล้ว
- ใช้ `public/solarcell.mp4` เป็นวิดีโอพื้นหลังของ Hero หน้าแรกแบบเต็มพื้นที่ โดยไม่คัดลอกไฟล์ซ้ำ
- เพิ่ม gradient overlay แยกตามด้านของเนื้อหาเพื่อให้เห็นฟุตเทจแต่หัวเรื่อง CTA และการ์ดตัวอย่างยังอ่านชัดตลอดคลิป
- วิดีโอเล่นอัตโนมัติแบบปิดเสียง วนซ้ำ และใช้ `playsInline` สำหรับมือถือ พร้อมโหลดเพียง metadata ก่อน
- เพิ่มปุ่มหยุด/เล่นพร้อม accessible label และสถานะ `aria-pressed` เพื่อให้ผู้ใช้ควบคุมการเคลื่อนไหวได้
- เมื่อระบบตั้งค่า `prefers-reduced-motion` วิดีโอจะหยุดที่ poster จากฟุตเทจจริงและยังแสดงปุ่ม Play ให้ผู้ใช้เลือกเล่นเอง
- ตรวจ Acceptance Criteria: ใช้ไฟล์ `solarcell.mp4` จริง, เนื้อหาทั้ง Hero ยังเข้าถึงได้, มีตัวควบคุมการเล่น และ reduced-motion fallback ทำงาน
- การทดสอบ: `npm run lint`, `npm run typecheck`, targeted E2E สำหรับแหล่งวิดีโอและปุ่มควบคุม และ production build ผ่าน

### Reduced-motion playback correction

- แก้กรณีเบราว์เซอร์หรือระบบปฏิบัติการเปิด Reduce Motion แล้ว Hero กลายเป็นพื้นหลังสีเข้มจนดูเหมือนวิดีโอไม่โหลด
- เพิ่ม poster frame จากฟุตเทจจริงที่เวลา 0.5 วินาที ทำให้ผู้ใช้เห็นภาพ Solar ทันทีระหว่างโหลดและเมื่อหยุดวิดีโอ
- โหมดปกติจะเริ่มเล่นหลัง component พร้อม ส่วน Reduce Motion จะแสดง poster แบบหยุดนิ่งพร้อมปุ่ม Play โดยไม่ซ่อนวิดีโอหรือปุ่มควบคุม

## Review hardening — Solar navigation, tariff copy and complete workflow

- สถานะ: แก้โค้ดและตรวจ regression ตามข้อสังเกตใน `thai_energy_planner_web_review.md` แล้ว
- ตรวจพบว่า Solar ใช้ `AppShell` และเมนูหลักชุดเดียวกับหน้าอื่นอยู่แล้ว; แถบที่ดูคล้าย navigation อีกยุคเป็นลิงก์ย่อยของ Solar จึงจัดให้อยู่ใน contextual card พร้อมหัวข้อและ accessible label “ขั้นตอนการประเมิน Solar” และใช้ `aria-current="step"` เพื่อแยกความหมายจากเมนูหลัก
- แก้สรุปอัตราค่าไฟบ้านจากการแสดงเพียง tier แรก `3.2484 บาท/หน่วย` เป็นช่วงอัตราฐานแบบขั้นบันได `3.2484–4.4217 บาท/หน่วย` พร้อมบอกว่าคิดแยกตามช่วงหน่วย ก่อน Ft และ VAT; อัตราที่มีค่าเดียวจะแสดงแบบค่าเดียวตามเดิม
- ขยาย E2E workflow ให้ยืนยันการคง Load Profile หลัง refresh, เดินจากบิล + เครื่องใช้ไฟฟ้า → TOU → Solar → รายงาน และดาวน์โหลด JSON จริงก่อนตรวจ stale-result guard
- แก้ race condition ที่พบจาก full E2E: ปุ่มบันทึก Load Profile จะเขียน appliance draft ลงอุปกรณ์ทันที ไม่ต้องรอ debounce 500 ms ของ auto-save จึง refresh หรือไปหน้าถัดไปทันทีโดยรายการไม่หาย
- เพิ่ม regression ว่า Solar มีเมนูหลักเพียง navigation เดียว, step navigation มี landmark แยกชัด และหน้า Solar ที่ viewport 390 px ไม่มี horizontal overflow
- ตรวจ Acceptance Criteria: ไม่มี navigation เก่าซ้ำ, ผู้ใช้ไม่ตีความอัตราขั้นแรกเป็นอัตราคงที่, ข้อมูลยังอยู่หลัง refresh, เส้นทางวิเคราะห์และส่งออกรายงานทำงานครบ และ mobile ไม่ล้นแนวนอน
- การทดสอบ: `npm run lint`, `npm run typecheck`, `git diff --check`, unit/integration 243 tests, full E2E 22 tests และ production build 51 routes ผ่านทั้งหมด; full E2E เป็นตัวตรวจพบและยืนยันการแก้ immediate-refresh race condition
