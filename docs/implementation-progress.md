# ความคืบหน้าการปรับปรุง Thai Energy Planner

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

ดำเนินการครบ Phase 0–5 ตามลำดับ โดยไม่แก้ calculation engine, tariff engine หรือ Local Storage schema และไม่มีการ commit/deploy

## การตรวจ flow หลังจบ Phase

- ทดลองผ่าน Browser MCP: เริ่มวิเคราะห์ → ข้อมูลตัวอย่าง → dashboard → ผล Solar → รายงาน
- ปัญหาที่พบ: dashboard ไม่แสดงบิลโหมด `sample` แม้ปุ่ม “ดูตัวอย่างผลลัพธ์” สร้างข้อมูลนั้นสำเร็จ
- การแก้: dashboard อ่าน workspace โหมด sample ได้เฉพาะเพื่อแสดง flow พร้อม badge และข้อความ “ข้อมูลตัวอย่าง”; checklist และ report readiness ยังคงไม่นับเป็นข้อมูลจริง
- การทดสอบ: `npm run typecheck` ผ่าน และตรวจ DOM บน browser ว่าแสดงยอดเฉลี่ย 6 เดือนพร้อมสถานะข้อมูลตัวอย่าง
