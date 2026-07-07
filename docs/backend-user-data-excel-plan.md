# Backend User Data to Excel Plan

วันที่เริ่มงาน: 2026-07-07

## เป้าหมาย

เก็บและดึงข้อมูลที่ user กรอก/อัปโหลด/คำนวณใน Thai Energy Planner จาก Supabase ผ่าน Prisma แล้ว export เป็น Excel สำหรับงานหลังบ้าน เช่น วิเคราะห์ลูกค้า, ตรวจคุณภาพข้อมูล, ทำรายงาน, backup และส่งต่อทีมธุรกิจ

## ข้อมูลที่ระบบเก็บได้แล้ว

| กลุ่มข้อมูล         | Prisma model                                                                                 | ใช้ทำอะไรใน Excel                                                          | สถานะ                                                   |
| ------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| รอบการวิเคราะห์     | `AnalysisRun`                                                                                | summary ของแต่ละ run, engine version, input snapshot, assumptions          | มีแล้ว                                                  |
| รายงานที่ user save | `GeneratedReport`                                                                            | รายการ report, module, metadata, source bill, result rows                  | มีแล้ว                                                  |
| ข้อมูลบิล           | `ElectricityBill`                                                                            | ประวัติค่าไฟรายเดือนต่อ meter                                              | มี schema แล้ว แต่ frontend บาง flow ยังเก็บ local ก่อน |
| Load profile        | `LoadProfile`, `LoadInterval`, `ImportJob`                                                   | ไฟล์โหลด, interval, quality, import metadata                               | มี schema แล้ว                                          |
| Scenario            | `Scenario`, `ScenarioResult`, `ScenarioInputSnapshot`, `ScenarioComparison`, `LoadShiftRule` | ผล TOU/load shift, saving, payback, trace                                  | มี schema แล้ว                                          |
| Solar               | `SolarScenario`, `SolarProfile`, `SolarGenerationProfile`                                    | ผล solar sizing/finance/generation                                         | มี schema แล้ว                                          |
| Recommendation      | `Recommendation`                                                                             | คำแนะนำที่ engine สร้าง                                                    | มี schema แล้ว                                          |
| User input snapshot | `UserSubmission`                                                                             | snapshot ดิบจาก user เช่น report/input/config ที่ frontend ส่งเข้าหลังบ้าน | เพิ่มในรอบนี้                                           |
| Audit               | `AuditLog`                                                                                   | ใครทำอะไร เมื่อไร ใช้สำหรับ compliance                                     | มีแล้ว                                                  |

## ข้อมูลที่ยังควรเพิ่มการบันทึก

| User input              | ตอนนี้เสี่ยงอยู่ที่               | สิ่งที่ควรทำ                                                                                           |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| บิลที่กรอกในหน้า Bills  | localStorage/report snapshot      | เพิ่ม endpoint เก็บ bill workspace หรือ persist เป็น `ElectricityBill` เมื่อ user กด save/continue     |
| CSV/XLSX preview rows   | browser/localStorage หลัง preview | เพิ่ม endpoint persist `LoadProfile` + `LoadInterval` หรือเก็บไฟล์ต้นทางใน storage แล้วผูก `ImportJob` |
| Scenario form settings  | query string/report draft         | บันทึกเป็น `ScenarioInputSnapshot` ทุกครั้งที่กด run/save                                              |
| Solar/Battery/EV config | report metadata บางส่วน           | บันทึก input snapshot ให้ครบก่อนสร้าง result/report                                                    |
| user/session identity   | ยังไม่มี auth ownership จริง      | เพิ่ม `userId`, `sessionId`, หรือ anonymous visitor id สำหรับหลังบ้านแยก owner                         |

## Excel workbook ที่ควร export

สคริปต์ export หลังบ้านควรสร้าง workbook หลายชีต:

| Sheet              | เนื้อหา                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `Summary`          | จำนวน reports/runs, ช่วงวันที่, module breakdown                                           |
| `AnalysisRuns`     | run id, user/site/meter/load profile, engine version, created at, input/assumption summary |
| `GeneratedReports` | report id, module, title, file name, generated at, source path                             |
| `ReportMetrics`    | แตก `metadata.metrics` เป็น row ต่อ metric                                                 |
| `ReportResultRows` | แตก `metadata.resultRows` เป็น table สำหรับ Excel pivot                                    |
| `Recommendations`  | คำแนะนำจาก report metadata และ/หรือ model `Recommendation`                                 |
| `ElectricityBills` | bill month, kWh, cost, meter                                                               |
| `LoadProfiles`     | profile name, source, interval, quality, interval count                                    |
| `Scenarios`        | scenario kind/name/result summary                                                          |
| `UserSubmissions`  | raw user input snapshots สำหรับ backend review และ data recovery                           |
| `AuditLogs`        | action, entity, timestamp                                                                  |

## ลำดับ implementation

1. เพิ่มสคริปต์ `scripts/export-user-data-to-excel.ts`
   - ดึงข้อมูลจาก Prisma
   - สร้างไฟล์ `.xlsx` ใน `exports/`
   - รองรับ `--from`, `--to`, `--out`

2. เพิ่ม npm script
   - `npm run export:user-data`

3. เพิ่ม API เก็บ input ทีละ flow
   - เริ่มจาก report/local bill snapshot เพราะมี data shape พร้อมที่สุด
   - ต่อด้วย load profile persist

4. เพิ่มหน้า admin ภายหลัง
   - `/admin/exports`
   - ปุ่ม download Excel
   - จำกัดสิทธิ์ด้วย admin token/session

## ข้อควรระวัง

- Excel หลังบ้านไม่ควร export sensitive data โดยไม่ mask
- ถ้ามี auth จริง ต้อง filter ตาม role/organization
- ควรมี audit log ทุกครั้งที่ export
- ควรตั้ง retention policy สำหรับข้อมูล user และไฟล์ export
