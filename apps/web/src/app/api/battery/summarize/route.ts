import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini-client";

function generateRuleBasedSummary(data: { capexThb: number; annualSavingsThb: number; paybackYears: number | null; isViable: boolean }): string {
  const { capexThb, annualSavingsThb, paybackYears, isViable } = data;

  if (isViable) {
    return `การลงทุนติดตั้งแบตเตอรี่ในงบประมาณ ${capexThb.toLocaleString()} บาท มีความคุ้มค่า สามารถประหยัดค่าไฟได้ประมาณ ${annualSavingsThb.toLocaleString()} บาทต่อปี และมีระยะเวลาคืนทุน ${paybackYears} ปี ถือเป็นทางเลือกที่ดีสำหรับการประหยัดพลังงาน`;
  } else {
    return `การลงทุนติดตั้งแบตเตอรี่ในงบประมาณ ${capexThb.toLocaleString()} บาท อาจจะยังไม่คุ้มค่าทางการเงินในปัจจุบัน เนื่องจากประหยัดค่าไฟได้เพียง ${annualSavingsThb.toLocaleString()} บาทต่อปี แนะนำให้พิจารณาในแง่ของระบบสำรองไฟ หรือรอให้ต้นทุนแบตเตอรี่ถูกลงกว่านี้`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Input validation
    const { capexThb, annualSavingsThb, paybackYears, isViable } = body;
    if (capexThb === undefined || annualSavingsThb === undefined || isViable === undefined) {
      return NextResponse.json({ error: "Missing required fields: capexThb, annualSavingsThb, isViable" }, { status: 400 });
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านระบบกักเก็บพลังงาน (Battery Storage)
ช่วยเขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ 2-4 ประโยค เป็นภาษาไทยแบบมืออาชีพ เพื่อสรุปความคุ้มค่าของการลงทุนแบตเตอรี่ อิงจากข้อมูลต่อไปนี้:

- เงินลงทุน (CAPEX): ${capexThb} บาท
- ประหยัดค่าไฟได้ (Annual Savings): ${annualSavingsThb} บาท/ปี
- ระยะเวลาคืนทุน (Payback Period): ${paybackYears} ปี
- คุ้มค่าหรือไม่ (Is Viable): ${isViable ? "คุ้มค่า" : "ยังไม่คุ้มค่า"}

อย่าใช้ markdown ไม่ต้องมีหัวข้อ ขอแค่เนื้อความ 1 ย่อหน้าสั้นๆ แนะนำด้วยว่าถ้าไม่คุ้มควรใช้แบตเตอรี่เพื่อเป็นระบบสำรองไฟ (Backup)`;

    const summary = await callGeminiWithFallback(prompt, () => generateRuleBasedSummary(body));
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    console.error("Error generating battery summary:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to generate summary", details: msg }, { status: 500 });
  }
}
