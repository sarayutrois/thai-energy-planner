# Thai Energy Planner

เว็บแอปภาษาไทยสำหรับวิเคราะห์การใช้ไฟฟ้า เปรียบเทียบมิเตอร์ปกติ/TOU และเตรียมต่อยอดไปสู่ Solar, Battery, EV, Finance, Report และ Admin ในเฟสถัดไป

## สถานะปัจจุบัน

Phase 1 Foundation ถูกวางเป็น monorepo แล้ว โดยแยก UI ออกจาก calculation/tariff/report engine ตั้งแต่ต้น เพื่อไม่ให้สูตรค่าไฟไปปนอยู่ใน React component

Phase 2 Tariff Engine เพิ่ม calculation engine สำหรับมิเตอร์ปกติและ TOU แบบ configuration-driven พร้อม calculation breakdown, tariff snapshot, synthetic draft seed data และหน้าตรวจสอบอัตราค่าไฟที่ `/analysis/tariff`

Phase 3 Load Data เพิ่ม validation/preview สำหรับบิลย้อนหลัง, CSV/XLSX load profile import, appliance load builder และ dashboard เบื้องต้นที่ใช้ TOU logic จาก Tariff Engine

## โครงสร้าง

```text
apps/web                       Next.js App Router UI
packages/shared-types          Zod schema และ type กลาง
packages/tariff-engine         Tariff metadata/version selection foundation
packages/calculation-engine    Pure calculation helpers foundation
packages/report-engine         Report manifest foundation
prisma/schema.prisma           PostgreSQL data model เริ่มต้น
data/tariffs                   Tariff seed template แบบ draft
data/demo-load-profiles        CSV load profile ตัวอย่าง
```

## Project Status

The project is currently completing **Phase 8 (Final QA & Deployment Prep)**.

- **Phase 1:** Core Data Models & Load Profiles (Completed)
- **Phase 2:** Financial Engine & Tariff Builder (Completed)
- **Phase 3:** Current Bill Analysis (Completed)
- **Phase 4:** Scenario Comparison (Completed)
- **Phase 5:** Solar PV Integration (Completed)
- **Phase 6:** BESS & EV Integration (Completed)
- **Phase 7:** Reporting & Admin Control (Completed)
- **Phase 8:** Final QA & Deployment Prep (Completed)

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Architecture](docs/architecture.md)
- [Calculation Engine](docs/calculation-engine.md)
- [Tariff Management](docs/tariff-management.md)
- [Testing Strategy](docs/testing.md)
- [Deployment Guide](docs/deployment.md)
- [Production Checklist](docs/production-checklist.md)

## Deployment Smoke Routes

After deploying (e.g., to Vercel), check the following routes to ensure the app is running correctly:

- `/` - Landing page (should load without DB)
- `/analysis/solar` - Main screening page (should load without DB, uses local state)
- `/api/solar/analyze` - Engine API (can be tested via UI)
- `/admin` - Requires `ADMIN_ACCESS_TOKEN` and `DATABASE_URL` to be properly set in the environment.

## เริ่มใช้งานในเครื่อง

1. ติดตั้ง dependencies

```bash
npm install
```

2. เตรียม environment

```bash
cp .env.example .env
```

3. เปิด PostgreSQL ด้วย Docker

```bash
docker compose up -d
```

4. สร้าง Prisma client และ migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. เปิดเว็บ

```bash
npm run dev
```

เว็บจะอยู่ที่ `http://localhost:3000`

หน้าตรวจสอบอัตราค่าไฟอยู่ที่ `http://localhost:3000/analysis/tariff`

หน้า Load Data เริ่มที่ `http://localhost:3000/analysis/load-data`

## คำสั่งตรวจสอบ

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## นโยบายข้อมูลอัตราค่าไฟ

Phase 1 และ Phase 2 ยังไม่ใส่ตัวเลขอัตราค่าไฟจริง เพราะต้องตรวจสอบจากแหล่งทางการก่อน ข้อมูล tariff seed สำหรับ demo อยู่ในสถานะ `draft` และมีช่องสำหรับ `sourceUrl`, `verifiedAt`, `verifiedBy`, `effectiveFrom`, `effectiveTo` และ `notes`

ไฟล์ `data/tariffs/demo-phase2-draft.json` มีตัวเลข synthetic สำหรับทดสอบ engine เท่านั้น ไม่ใช่อัตราทางการของ PEA หรือ MEA

หน้าเว็บต้องแสดงวันที่ตรวจสอบและแหล่งข้อมูลทุกครั้งเมื่อมีการใช้อัตราค่าไฟในการคำนวณ ห้ามใช้คำว่า “ข้อมูลล่าสุด” โดยไม่มีวันที่ตรวจสอบ

## Phase ถัดไป

1. Phase 2: Tariff Engine - tariff versioning, Normal/TOU, Ft, holidays, breakdown และ unit tests
2. Phase 3: Load Data - manual bills, appliance builder, CSV/XLSX import และ validation
3. Phase 4: Scenario Engine - normal, TOU, load shifting และ recommendation rules
4. Phase 5: Solar และ Finance
5. Phase 6: EV และ Battery
6. Phase 7: Report และ Admin
7. Phase 8: QA และ Deployment
