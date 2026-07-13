# UX Audit — Thai Energy Planner

วันที่ตรวจ: 13 กรกฎาคม 2026  
ขอบเขต: `apps/web`, shared calculation packages, state ที่เก็บใน browser และเส้นทางผู้ใช้ตั้งแต่เริ่มวิเคราะห์จนถึงรายงาน

## สถานะปัจจุบัน

แอปเป็น Next.js App Router ที่แยก calculation engine (`packages/calculation-engine`, `packages/tariff-engine`) ออกจาก UI อย่างชัดเจน จึงสามารถปรับประสบการณ์ใช้งานโดยไม่แตะต้องสูตรคำนวณได้ ข้อมูลที่ผู้ใช้กรอกถูกเก็บไว้ใน Local Storage เป็นหลัก: บิล (`thai-energy-planner.bill-workspace.v1`), Load Profile และรายงาน local; มี API/Prisma สำหรับผู้ใช้ที่ยืนยันตัวตนแล้วด้วย

เส้นทางที่ใช้งานได้ในปัจจุบันคือ หน้าแรก → `/analysis/new` → เลือกประเภทผู้ใช้และแหล่งข้อมูล → บิล, สร้างจากเครื่องใช้ไฟฟ้า หรือ import → dashboard → Scenario/TOU หรือ Solar → reports. มี Battery, EV และ ecosystem เป็นโมดูลเสริม

## ปัญหาที่พบ

| ระดับ | ประเด็น | ผลกระทบ |
| --- | --- | --- |
| High | เมนูหลักเป็นรายการแบนและใช้ชื่อเชิงเทคนิค เช่น Solar, Load Profile, Scenario | เจ้าของบ้านไม่เห็นเส้นทางหลักหรือความสัมพันธ์ของข้อมูลกับผลลัพธ์ |
| High | ไม่มี progress/checklist ระดับระบบ | ผู้ใช้ไม่รู้ว่าข้อมูลใดเสร็จแล้ว ขาดอะไร และควรทำอะไรต่อ |
| High | หน้าเริ่มต้นถามประเภทและแหล่งข้อมูล แต่ยังไม่ถามเป้าหมายการตัดสินใจ | ระบบยังไม่สามารถแนะนำ flow ตาม “ลดค่าไฟ/TOU/Solar” ได้จริง |
| Medium | หลายหน้าวาง header, badges และ action ด้วยรูปแบบเฉพาะหน้า | hierarchy และตำแหน่ง primary action ไม่สม่ำเสมอ |
| Medium | คำว่า Load Profile, Scenario, Normal/TOU, Solar ปรากฏเป็นชื่อหลักหลายจุด | ผู้เริ่มต้นต้องตีความศัพท์ก่อนจึงเลือก action ได้ |
| Medium | หน้า Scenario และ Solar มี readiness/empty state อยู่แล้ว แต่แยกอยู่เฉพาะโมดูล | ข้อมูล readiness ไม่ต่อเนื่องตั้งแต่ต้น flow |
| Medium | `tariff-demo` และชื่อ helper/demo ภายในยังมีอยู่ | ไม่ควรนำชื่อ demo ไปใช้ใน navigation ที่ผู้ใช้เห็น |
| Low | `MainNav` เป็น component deprecated ที่คืนค่า `null` แต่ยังถูกเรียกในหลายหน้า | ไม่กระทบการทำงาน แต่เพิ่มความซ้ำซ้อนและทำให้โครง layout อ่านยาก |
| Low | Font หลักใช้ Inter ก่อน Prompt | ภาษาไทยควรเป็นตัวเลือกแรกเพื่อ metric และ body text ที่สม่ำเสมอ |

## จุดที่ต้องรักษาไว้

- สูตร calculation engine, tariff trace และ validation ที่มีอยู่: ห้ามสร้างตัวเลขใหม่ใน UI
- Local Storage keys และรูปแบบข้อมูลเดิม เพื่อให้ข้อมูลผู้ใช้ไม่หายเมื่อเปลี่ยนหน้า
- Existing empty, loading, error และ report readiness state ของ import, Scenario, Solar และ reports
- Dark mode ผ่าน `ThemeProvider`, focus ring ที่มีอยู่ และ responsive breakpoints ของ Tailwind
- Route เดิมทั้งหมด โดยเฉพาะ `/analysis/load-data/*`, `/analysis/scenarios`, `/analysis/solar` และ reports

## ความเสี่ยงและแนวทางลดความเสี่ยง

| ความเสี่ยง | วิธีลดความเสี่ยง |
| --- | --- |
| UI ใหม่อ่าน storage ไม่ตรงกับข้อมูลเดิม | ใช้ helper read functions เดิมและไม่เปลี่ยน storage schema |
| เปลี่ยน nav แล้ว deep link เดิมหาย | คง URL เดิมทั้งหมด; เปลี่ยนเฉพาะ label และจัดกลุ่มลิงก์ |
| การจัด layout กระทบ calculation client component | เพิ่ม shell/presentation component รอบ component เดิมโดยไม่ย้าย logic คำนวณ |
| Dark mode contrast ลดลง | ใช้ semantic tokens ทั้ง light/dark และตรวจ build/typecheck |

## Route และ component ที่เกี่ยวข้อง

- Entry: `/`, `/analysis`, `/analysis/new`; `StartAnalysisWizard`, `AppShell`
- Data: `/analysis/load-data`, `/bills`, `/appliances`, `/import`, `/dashboard`; `GuidedBillWorkspace`, `ApplianceLoadBuilder`, `LoadProfileImporter`, `EnergyOverviewDashboard`
- Analysis: `/analysis/scenarios`, `/analysis/solar`; `CanonicalScenarioPanel`, Solar page parts
- Result/report: `/analysis/reports`; `ReportReadinessPanel`, local report components
- Shared UI: `app-shell.tsx`, `ui/*`, `globals.css`, theme provider

## แผนดำเนินงานตาม Phase

1. UX: เพิ่ม goal-first entry, persistent progress, readiness copy และ next action โดยไม่เปลี่ยน calculation logic
2. IA: จัด navigation เป็นกลุ่มภารกิจ, ตั้งชื่อภาษาไทย, คง URL เดิมเพื่อ compatibility
3. Wireframe/layout: เพิ่ม page shell, heading/action hierarchy และ reusable layouts
4. Design system: เติม semantic tokens, shared states/components, typography/spacing และ dark mode
5. Modern UI: ปรับ homepage/dashboard/result emphasis ให้คำแนะนำมาก่อนกราฟและตรวจ mobile/accessibility

## Assumptions

- “ข้อมูลอาคาร” ยังไม่มี source of truth เฉพาะใน repository จึงใช้ “ประเภทอาคาร/ผู้ใช้” ที่มีอยู่เป็น input ขั้นแรก และไม่สร้างหน้ากรอกข้อมูลที่ไม่มีข้อมูลรองรับ
- Battery และ EV คงเป็นโมดูลเสริม ไม่ปรากฏใน primary home-owner journey แต่เข้าถึงได้จากกลุ่มการวิเคราะห์เพิ่มเติม
