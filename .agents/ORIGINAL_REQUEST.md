# Original User Request

## Initial Request — 2026-07-07T20:06:05Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

อัปเกรด Calculation Engine ในโปรเจกต์ Thai Energy Planner เพื่อรองรับการคำนวณแบบ Yearly Load Profile (12 เดือนแยกอิสระ) และปรับปรุงระบบหน้าเว็บให้จัดการข้อมูลบิลที่ไม่ครบ 12 เดือนโดยการเติมค่าเฉลี่ยอัตโนมัติ

Working directory: `c:\Users\Sarayut Mounguming\OneDrive\เอกสาร\proj test`
Integrity mode: development

## Requirements

### R1. อัปเกรด Calculation Engine ให้รองรับ 12 เดือน
ปรับปรุง `SolarAnalysisInput` ให้รับ `monthlyScaleFactors` แบบ Array (12 ค่า) และปรับปรุงฟังก์ชันคำนวณบิล/โซลาร์ (เช่น `calculateBillAfterSolar`) ให้คำนวณแยกอิสระทั้ง 12 เดือนแล้วนำผลลัพธ์มารวมกันเป็นรายปี

### R2. อัปเกรดลอจิกฝั่ง Frontend / API
ปรับปรุงโค้ดในส่วน API หรือ Frontend (เช่น `apps/web/src/lib/calculation-api.ts`) ให้รับค่าบิลรายเดือนจากผู้ใช้ ถ้าผู้ใช้กรอกมาไม่ครบ 12 เดือน ให้ระบบคำนวณค่าเฉลี่ยจากเดือนที่มีอยู่ แล้วเติมข้อมูลเดือนที่ขาดให้ครบ 12 เดือนอัตโนมัติก่อนส่งเข้า Engine

## Acceptance Criteria

### การตรวจสอบความถูกต้อง (Verification)
- [ ] หากส่ง `monthlyScaleFactors` ที่มีค่าต่างกันในแต่ละเดือนเข้า Engine ระบบจะต้องนำไปคำนวณค่าไฟและผลผลิตโซลาร์แยกตามสัดส่วนของเดือนนั้นๆ ได้อย่างถูกต้อง (ไม่มีการคูณ 12 แบบดื้อๆ อีกต่อไป)
- [ ] เมื่อผู้ใช้กรอกบิลผ่านหน้าเว็บแค่ 3 เดือน ระบบ API ต้องสามารถแปลงเป็น 12 เดือน (โดยใช้ค่าเฉลี่ยเติมให้เต็ม) แล้วรันผลลัพธ์สุดท้ายออกมาได้โดยไม่พัง
- [ ] โปรเจกต์ต้องสามารถรัน `npm run build` หรือ `npm run dev` ได้ผ่านโดยไม่มี Type Errors
