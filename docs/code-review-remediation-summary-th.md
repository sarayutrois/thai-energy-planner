# รายงานสรุป Code Review และการแก้ไข

โปรเจกต์: Thai Energy Planner  
ขอบเขต: Turborepo monorepo, Next.js frontend, Prisma database schema, shared types, calculation engine, tariff engine  
วันที่สรุป: 2026-07-07

## สรุปสำหรับผู้บริหาร

งานรีวิวและแก้ไขแบ่งเป็น 3 ส่วนหลักตาม scope เดิม ได้แก่ฐานข้อมูลและ data model, calculation engines, และ frontend/API ฝั่ง Next.js App Router ตอนนี้ได้แก้ประเด็นสำคัญที่กระทบความถูกต้องของข้อมูล ความน่าเชื่อถือของผลคำนวณ และความปลอดภัยพื้นฐานของ API แล้ว

ภาพรวมหลังแก้ไข:

- Database schema มี relation, index, enum และ metadata สำหรับ trace ผลลัพธ์ชัดขึ้น
- Shared types มี schema/mapping กลาง ช่วยลดความเสี่ยงข้อมูล frontend/backend ไม่ตรงกัน
- Calculation engines ปรับ timestamp, scaling, battery usable window, EV outside charging, export cap และ TOU tariff version ให้คำนวณสมเหตุสมผลขึ้น
- Reports API เพิ่ม validation, same-origin guard และลดข้อมูลที่ expose จาก Prisma
- Load profile importer ย้ายการ parse CSV/XLSX จาก client ไป server API ลดภาระ browser และลด client bundle
- Scenario results page validate query string ก่อนนำไปคำนวณ

## Step 1: Database และ Shared Types

### ปัญหาที่พบ

1. Data model บางส่วนยังไม่มี relation/index ที่ช่วยให้ query และ ownership ชัดเจน
   - ไฟล์: `prisma/schema.prisma`
   - ความเสี่ยง: query โตขึ้นจะช้า, join/lookup ทำได้ไม่มั่นคง, และบาง workflow ไม่สามารถ trace ความสัมพันธ์ของ scenario/result กลับไปยัง entity ต้นทางได้ดี

2. Result model ยังขาด metadata สำหรับแยกชนิดผลลัพธ์และ version ของ engine/schema
   - ไฟล์: `prisma/schema.prisma`
   - ความเสี่ยง: เมื่อ calculation engine เปลี่ยน version จะ audit หรือ replay ผลย้อนหลังยาก

3. Shared types ยังไม่เป็นแหล่งกลางที่เข้มพอสำหรับ enum และ JSON payload สำคัญ
   - ไฟล์: `packages/shared-types/src/index.ts`
   - ความเสี่ยง: frontend/backend อาจตีความค่า enum หรือ shape ของ snapshot ไม่ตรงกัน

### สิ่งที่แก้แล้ว

- เพิ่ม relation, back-reference, unique constraint และ index ใน Prisma schema ตาม workflow หลักของ scenario, solar scenario, generated result และ tariff snapshot
- เพิ่ม field metadata เช่น `resultType`, `schemaVersion`, `engineVersion` เพื่อรองรับ audit/replay
- เพิ่ม schema และ mapper กลางใน shared-types สำหรับ enum/database snapshot/result payload
- เพิ่ม test สำหรับ mapper และ snapshot schema

### ไฟล์หลักที่แก้

- `prisma/schema.prisma`
- `packages/shared-types/src/index.ts`
- `packages/shared-types/src/index.test.ts`

### ผลลัพธ์ที่ได้

ฐานข้อมูลรองรับ production workflow ได้ดีขึ้น โดยเฉพาะการ trace ที่มาของผลลัพธ์, การ query ตามสถานะ/เวลา, และการ validate data contract ระหว่าง package

## Step 2: Core Calculation Engines และ Tariff Engine

### ปัญหาที่พบ

1. Timestamp handling ยังมีความเสี่ยงจาก format/timezone ไม่สม่ำเสมอ
   - ไฟล์: `packages/calculation-engine/src/thai-billing.ts`
   - ไฟล์: `packages/calculation-engine/src/solar-engine.ts`
   - ไฟล์: `packages/calculation-engine/src/battery-ev-engine.ts`
   - ไฟล์: `packages/calculation-engine/src/scenario-engine.ts`
   - ความเสี่ยง: interval classification, TOU period และ monthly aggregation อาจคลาดเคลื่อน

2. Load scaling บางจุดอาจ scale energy แต่ไม่ preserve power profile อย่างถูกต้อง
   - ไฟล์: `packages/calculation-engine/src/solar-engine.ts`
   - ไฟล์: `packages/calculation-engine/src/battery-ev-engine.ts`
   - ไฟล์: `packages/calculation-engine/src/scenario-engine.ts`
   - ความเสี่ยง: peak demand, battery dispatch และ solar self-consumption ประเมินผิด

3. Battery usable capacity และ EV outside charging logic ยังไม่สะท้อน constraint จริงพอ
   - ไฟล์: `packages/calculation-engine/src/battery-ev-engine.ts`
   - ความเสี่ยง: ผลประหยัดสูงเกินจริง หรือไม่แสดงต้นทุน charging นอกช่วงที่ระบบควบคุม

4. Tariff engine เลือก TOU tariff version ไม่ละเอียดพอสำหรับ interval ต่างเวลา
   - ไฟล์: `packages/tariff-engine/src/engine.ts`
   - ความเสี่ยง: ถ้ามี tariff version เปลี่ยนกลางช่วงข้อมูล ผลคำนวณอาจใช้ rate ผิดช่วง

5. Demand charge ใช้ rate ไม่ครบกรณี
   - ไฟล์: `packages/tariff-engine/src/engine.ts`
   - ความเสี่ยง: ค่า demand ต่ำกว่าความเป็นจริงใน scenario ที่ rate สูงกว่าอยู่คนละช่วง

### สิ่งที่แก้แล้ว

- Normalize timestamp ใน engine หลักให้สม่ำเสมอ
- แก้ kWh-to-kW offset ใน `simulateIntervalSavings`
- ปรับ solar export limit/revenue cap และ preserve power ระหว่าง scaling
- ปรับ battery usable window และ EV outside charging fields/cost
- ใช้จำนวนวันจริงของเดือนในการ scale แทนค่าคงที่แบบหยาบ
- ลดการ detect interval ซ้ำใน scenario engine
- ปรับ tariff engine ให้เลือก TOU version ต่อ interval และ demand charge ใช้ highest applicable rate
- เพิ่ม regression tests ครอบคลุมกรณีที่แก้

### ไฟล์หลักที่แก้

- `packages/calculation-engine/src/thai-billing.ts`
- `packages/calculation-engine/src/solar-engine.ts`
- `packages/calculation-engine/src/solar-engine.test.ts`
- `packages/calculation-engine/src/battery-ev-engine.ts`
- `packages/calculation-engine/src/battery-ev-engine.test.ts`
- `packages/calculation-engine/src/scenario-engine.ts`
- `packages/calculation-engine/src/index.test.ts`
- `packages/tariff-engine/src/engine.ts`
- `packages/tariff-engine/src/index.test.ts`

### ผลลัพธ์ที่ได้

ผลคำนวณน่าเชื่อถือขึ้น โดยเฉพาะกรณีที่มี interval data, TOU tariff, solar export, battery dispatch และ EV charging นอกช่วงเป้าหมาย

## Step 3: Frontend, Next.js App Router และ API

### ปัญหาที่พบ

1. Reports API รับ/ส่งข้อมูลกว้างเกินไปและยังไม่มี validation เข้ม
   - ไฟล์: `apps/web/src/app/api/reports/route.ts`
   - ไฟล์: `apps/web/src/app/api/reports/[id]/route.ts`
   - ความเสี่ยง: payload ผิดรูปถูกบันทึกลง database, expose relation มากเกินจำเป็น, และ delete/read endpoint ไม่มี guard พื้นฐาน

2. Client Component import parser CSV/XLSX โดยตรง
   - ไฟล์: `apps/web/src/components/load-profile-importer.tsx`
   - ความเสี่ยง: client bundle ใหญ่ขึ้นและ browser main thread ต้อง parse ไฟล์เอง

3. Scenario results page เชื่อค่า query string ตรงเกินไป
   - ไฟล์: `apps/web/src/app/analysis/scenarios/results/page.tsx`
   - ความเสี่ยง: ค่า input ผิดรูป เช่นเวลา/ตัวเลขเกินขอบเขต ไหลเข้า calculation และ report draft

4. Tailwind class สำหรับ action buttons ซ้ำหลายจุด
   - ไฟล์: `apps/web/src/app/analysis/reports/[id]/report-actions.tsx`
   - ความเสี่ยง: UI state/focus/disabled ไม่สม่ำเสมอ และแก้ design system ยาก

### สิ่งที่แก้แล้ว

- เพิ่ม `zod` schema แบบ strict ให้ reports API
- ตรวจ same-origin request สำหรับ reports GET/POST/DELETE
- เปลี่ยน Prisma query ให้ใช้ `select` ลดข้อมูลที่ expose
- validate report id ก่อน query/delete
- เพิ่ม route ใหม่ `POST /api/load-profiles/preview` สำหรับ parse CSV/XLSX ฝั่ง server
- จำกัด upload preview ที่ 10MB และอนุญาต interval เฉพาะ 15, 30, 60 นาที
- ปรับ `LoadProfileImporter` ให้ส่ง `FormData` ไป API แทน import parser ใน client
- เพิ่ม `zod` validation ให้ query string ของ scenario results
- เปลี่ยน report export buttons ไปใช้ `Button` component กลาง

### ไฟล์หลักที่แก้

- `apps/web/src/app/api/reports/route.ts`
- `apps/web/src/app/api/reports/[id]/route.ts`
- `apps/web/src/app/api/load-profiles/preview/route.ts`
- `apps/web/src/components/load-profile-importer.tsx`
- `apps/web/src/app/analysis/scenarios/results/page.tsx`
- `apps/web/src/app/analysis/reports/[id]/report-actions.tsx`

### ผลลัพธ์ที่ได้

Frontend/API มี boundary ที่ชัดขึ้น ข้อมูลที่รับจาก user ถูก validate ก่อนใช้จริง และงานหนักของการ parse load profile ถูกย้ายออกจาก browser ไปอยู่ฝั่ง server

## การตรวจสอบที่รันแล้ว

คำสั่งที่ผ่าน:

```bash
npx prisma validate --schema prisma/schema.prisma
npm run typecheck --workspace @thai-energy-planner/shared-types
npm test --workspace @thai-energy-planner/shared-types
npm run typecheck --workspace @thai-energy-planner/tariff-engine
npm test --workspace @thai-energy-planner/tariff-engine
npm run typecheck --workspace @thai-energy-planner/calculation-engine
npm test --workspace @thai-energy-planner/calculation-engine
npm run typecheck --workspace @thai-energy-planner/web
npm test --workspace @thai-energy-planner/web
```

ผลล่าสุดของ `web`:

- TypeScript typecheck ผ่าน
- Vitest ผ่าน 1 test file, 6 tests

## ความเสี่ยงที่ยังควรทำต่อ

1. Auth/ownership ของ Reports API
   - ตอนนี้เพิ่ม same-origin guard แล้ว แต่ยังไม่ใช่ user/session ownership จริง
   - ถ้าจะเปิด production ควรผูก report กับ user/site และ validate owner ทุกครั้ง

2. Large load profile workflow
   - ย้าย parser ไป server แล้ว แต่ flow ถัดไปยังมีการเก็บ rows ใน browser/localStorage สำหรับบาง analysis
   - ควรพิจารณา upload/store profile ฝั่ง server และส่ง `loadProfileId` แทนการส่ง rows จำนวนมาก

3. Refactor `GuidedBillWorkspace`
   - ยังเป็น Client Component ขนาดใหญ่ที่รวม state, localStorage, validation และ report UI
   - ควรแยกเป็น hook และ presentational components เพื่อลด complexity และเพิ่ม testability

4. End-to-end tests
   - Unit tests ผ่านแล้ว แต่ควรเพิ่ม Playwright/E2E สำหรับ flow สำคัญ เช่น import load profile, save report, delete report, scenario result จาก saved bills

## ข้อเสนอสำหรับสไลด์พรีเซนต์

ลำดับการเล่าเรื่องที่แนะนำ:

1. เริ่มจากปัญหา: ผลคำนวณพลังงานต้อง trace ได้, tariff ต้องถูกช่วงเวลา, และ input จาก user ต้อง validate
2. อธิบาย 3 ชั้นของการแก้: data model, calculation core, frontend/API boundary
3. ชี้ผลลัพธ์เชิงธุรกิจ: ลดความเสี่ยงผลคำนวณผิด, audit ได้ดีขึ้น, และพร้อมต่อยอด production มากขึ้น
4. ปิดด้วย remaining risks: auth ownership, server-side load profile storage, E2E tests

## สถานะปัจจุบัน

งานรีวิวและแก้ไขตาม Step 1-3 เสร็จแล้ว ผ่าน typecheck/test ที่เกี่ยวข้องแล้ว และยังไม่ได้ commit เพื่อให้เจ้าของโปรเจกต์ตรวจ diff ก่อน
