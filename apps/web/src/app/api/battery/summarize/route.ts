import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function generateRuleBasedSummary(data: { capexThb: number, annualSavingsThb: number, paybackYears: number | null, isViable: boolean }): string {
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
    
    // Fallback 3: Rule-based
    if (!genAI) {
      return NextResponse.json({ summary: generateRuleBasedSummary(body) });
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านระบบกักเก็บพลังงาน (Battery Storage)
ช่วยเขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ 2-4 ประโยค เป็นภาษาไทยแบบมืออาชีพ เพื่อสรุปความคุ้มค่าของการลงทุนแบตเตอรี่ อิงจากข้อมูลต่อไปนี้:

- เงินลงทุน (CAPEX): ${body.capexThb} บาท
- ประหยัดค่าไฟได้ (Annual Savings): ${body.annualSavingsThb} บาท/ปี
- ระยะเวลาคืนทุน (Payback Period): ${body.paybackYears} ปี
- คุ้มค่าหรือไม่ (Is Viable): ${body.isViable ? "คุ้มค่า" : "ยังไม่คุ้มค่า"}

อย่าใช้ markdown ไม่ต้องมีหัวข้อ ขอแค่เนื้อความ 1 ย่อหน้าสั้นๆ แนะนำด้วยว่าถ้าไม่คุ้มควรใช้แบตเตอรี่เพื่อเป็นระบบสำรองไฟ (Backup)`;

    try {
      // Fallback 1: Gemini 2.5 Flash
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return NextResponse.json({ summary: text.trim() });
      
    } catch (apiError: unknown) {
      console.error("Gemini 2.5 Flash failed for battery, attempting Fallback 2 (Flash-Lite)", apiError);
      
      try {
        // Fallback 2: Gemini 1.5 Flash-8b
        const liteModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
        const liteResult = await liteModel.generateContent(prompt);
        const liteText = liteResult.response.text();
        return NextResponse.json({ summary: liteText.trim() });
      } catch (liteError) {
        console.error("Gemini Flash-Lite also failed for battery, using Fallback 3 (Rule-based)", liteError);
        return NextResponse.json({ summary: generateRuleBasedSummary(body) });
      }
    }
  } catch (error: unknown) {
    console.error("Error generating battery summary:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to generate summary", details: msg }, { status: 500 });
  }
}
