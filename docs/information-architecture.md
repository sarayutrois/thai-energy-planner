# Information Architecture

## Navigation structure

| กลุ่ม         | เมนู                  | Route ที่ใช้จริง                         |
| ------------- | --------------------- | ---------------------------------------- |
| ภาพรวม        | เริ่มวิเคราะห์        | `/analysis/new`                          |
| ข้อมูลของฉัน  | บิลและรูปแบบการใช้ไฟ  | `/analysis/load-data`                    |
| การวิเคราะห์  | ค่าไฟและ TOU, Solar   | `/analysis/scenarios`, `/analysis/solar` |
| ผลลัพธ์       | คำแนะนำและรายงาน      | `/analysis/reports`                      |
| ข้อมูลอ้างอิง | อัตราค่าไฟและสมมติฐาน | `/analysis/tariff`                       |

เส้นทางหลักของเจ้าของบ้านอยู่ไม่เกินสองระดับจาก navigation: เข้า “ข้อมูลของฉัน” แล้วเลือกบิล/สร้างรูปแบบ/นำเข้า; หรือเริ่มจาก “เริ่มวิเคราะห์” เพื่อให้ระบบแนะนำ route

## Route map

| ก่อน/URL ที่คงอยู่                          | ชื่อที่ผู้ใช้เห็นใหม่      | ความรับผิดชอบ                             |
| ------------------------------------------- | -------------------------- | ----------------------------------------- |
| `/analysis/new`                             | เริ่มวิเคราะห์             | เลือกเป้าหมาย ประเภทผู้ใช้ และแหล่งข้อมูล |
| `/analysis/load-data`                       | บิลและรูปแบบการใช้ไฟ       | ศูนย์รวม source data, ไม่คำนวณผล          |
| `/analysis/load-data/bills`                 | บิลค่าไฟ                   | Source of truth สำหรับบิล                 |
| `/analysis/load-data/appliances`, `/import` | สร้าง/นำเข้ารูปแบบการใช้ไฟ | Source of truth สำหรับ Load Profile       |
| `/analysis/load-data/dashboard`             | ตรวจสอบความพร้อมของข้อมูล  | สรุปคุณภาพข้อมูลและ next action           |
| `/analysis/scenarios`                       | ค่าไฟและ TOU               | คำนวณ comparison จาก active profile       |
| `/analysis/solar`                           | Solar                      | วิเคราะห์ Solar จาก input ที่พร้อม        |
| `/analysis/reports`                         | คำแนะนำและรายงาน           | รวมรายงานที่สร้างจากผลวิเคราะห์           |

ไม่มีการเปลี่ยน URL ของ route ที่เปิดใช้อยู่ จึงไม่ต้องมี redirect ใหม่และ deep link เดิมไม่กลายเป็น 404. ชื่อ `tariff-demo` ไม่ถูกใช้ใน navigation; route ภายในนั้นคงไว้เพื่อ compatibility จนกว่าจะมี migration ที่ยืนยันได้

## Legacy และโมดูลที่ยังไม่เปิดใช้

- `/analysis/scenarios/new`, `/analysis/scenarios/compare` และ `/analysis/scenarios/results` redirect ไป `/analysis/scenarios` เพื่อไม่ให้ deep link เปิด UI คนละระบบ
- `/estimate` redirect ไป `/analysis/new` เพื่อเริ่มจากเป้าหมายและข้อมูลที่ผู้ใช้มี
- Battery, EV และ ecosystem ยังไม่พร้อมใช้งาน จึงไม่แสดงใน navigation หลัก แม้ route เดิมยังตอบหน้าสถานะเพื่อรองรับ deep link อย่างปลอดภัย

## Page responsibility matrix

| หน้า           | ทำ                                | ไม่ทำ                                 |
| -------------- | --------------------------------- | ------------------------------------- |
| Dashboard      | แสดง status, quality, next action | ไม่ให้กรอกข้อมูลทุกประเภทซ้ำ          |
| บิล            | รับและ validate ข้อมูลจากบิล      | ไม่สร้าง Load Profile แทนผู้ใช้       |
| รูปแบบการใช้ไฟ | สร้าง/import และตรวจ profile      | ไม่แทนที่บิล                          |
| Scenario/Solar | ใช้ active source data เพื่อคำนวณ | ไม่เก็บ source data ชุดใหม่แบบซ้ำซ้อน |
| Reports        | แสดงผลที่บันทึกและ readiness      | ไม่คำนวณ tariff/solar ซ้ำ             |

## Data source of truth matrix

| ข้อมูล               | Source of truth                                                | ผู้อ่านหลัก                          |
| -------------------- | -------------------------------------------------------------- | ------------------------------------ |
| ประเภทผู้ใช้         | query context เริ่มต้นและ bill workspace ที่บันทึก             | form และคำแนะนำ                      |
| เป้าหมาย             | `thai-energy-planner.analysis-goal.v1`                         | start wizard และ future routing copy |
| บิล                  | `thai-energy-planner.bill-workspace.v1` + bill report snapshot | dashboard, report readiness          |
| Active Load Profile  | helpers ใน `local-load-profile.ts`                             | Scenario, Solar, dashboard           |
| ผลวิเคราะห์ที่บันทึก | `thai-energy-planner.analysis-reports.v1`                      | reports และ progress                 |
| อัตราค่าไฟ           | tariff engine / tariff snapshot                                | Scenario และ Solar                   |

## Redirect plan

- ไม่เปลี่ยน path ใน Phase นี้: alias/redirect ไม่จำเป็นและลดความเสี่ยงข้อมูลใน browser context
- หากเปลี่ยนชื่อ route ในอนาคต ให้ใช้ Next redirect จาก URL เก่า และคง query string `audience`, `source` ไว้
- ห้าม redirect `/analysis/tariff-demo` ไปยังหน้าที่ให้ผลต่างกันจนกว่าจะมี migration/owner ยืนยัน
