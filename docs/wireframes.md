# Wireframes และ Layout Structure

## มาตรฐานหน้าแบบฟอร์ม

```text
Breadcrumb / checklist
H1 + คำอธิบายสั้น
ข้อมูล context / readiness
Form sections (จำเป็น → แนะนำ → ขั้นสูง)
Validation summary / help
Action bar: ย้อนกลับ | primary next action
```

ใช้กับ: เริ่มวิเคราะห์, ข้อมูลอาคาร/ประเภทผู้ใช้, บิล, สร้างรูปแบบการใช้ไฟ และ import

## มาตรฐานหน้าผลลัพธ์

```text
H1 + data confidence
คำแนะนำหลัก
Key metrics
กราฟหลัก + คำอธิบาย
สมมติฐานและข้อจำกัด
ขั้นตอนถัดไป / สร้างรายงาน
```

ใช้กับ: ค่าไฟและ TOU, Solar, เปรียบเทียบแผน, สรุปคำแนะนำ และรายงาน

## หน้าและลำดับข้อมูล

| หน้า               | ลำดับ wireframe                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| หน้าแรก            | value proposition → สิ่งที่ต้องเตรียม → เริ่มวิเคราะห์ → product preview ที่ระบุว่าเป็นตัวอย่าง |
| เริ่มวิเคราะห์     | goal → ประเภทอาคาร → ข้อมูลที่มี → next journeys                                                |
| ข้อมูลอาคาร        | page header → ประเภทผู้ใช้ที่เลือก → ข้อมูลจำเป็น → next action                                 |
| บิล                | page header → context → entries → inline validation → summary/next action                       |
| สร้าง Load Profile | page header → appliance form → preview → confidence → next action                               |
| Import             | page header → file selection → mapping/validation → preview → save/next action                  |
| Dashboard          | page header → readiness → quick summary → data quality → recommended next action                |
| TOU                | page header → active profile → assumptions → recommendation/metrics → details → report          |
| Solar              | page header → controls → recommendation/metrics → charts → assumptions/risks → report           |
| เปรียบเทียบแผน     | page header → active inputs → option comparison → rationale → next action                       |
| สรุปคำแนะนำ        | page header → prioritized recommendations → confidence/limitations → links to source analyses   |
| รายงาน             | page header → saved reports → report readiness → export options                                 |

## Responsive rules

- Page container: `max-w-7xl` with 16px mobile and 24px desktop padding
- Header actions wrap below the title on small viewports
- Checklist scrolls horizontally rather than forcing narrow cards or page overflow
- Multi-column cards collapse to one column; charts retain descriptive text and do not depend on hover
- Controls/tabs wrap and remain keyboard-focusable
