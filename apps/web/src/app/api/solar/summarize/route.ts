import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function generateRuleBasedSummary(data: { systemSizeKwp: number, npvThb: number, simplePaybackYears: number | null, netAnnualBenefit: number }): string {
  const { systemSizeKwp, npvThb, simplePaybackYears, netAnnualBenefit } = data;
  const isProfitable = npvThb > 0;
  
  if (isProfitable) {
    return `จากการจำลองการติดตั้งระบบโซลาร์เซลล์ขนาด ${systemSizeKwp} kWp พบว่าโครงการนี้มีความคุ้มค่าสูง โดยสามารถประหยัดค่าไฟได้ประมาณ ${netAnnualBenefit.toLocaleString()} บาทต่อปี มีระยะเวลาคืนทุน ${simplePaybackYears} ปี และสร้างมูลค่าปัจจุบันสุทธิ (NPV) ที่ ${npvThb.toLocaleString()} บาท ซึ่งถือเป็นการลงทุนที่น่าสนใจ`;
  } else {
    return `จากการจำลองการติดตั้งระบบโซลาร์เซลล์ขนาด ${systemSizeKwp} kWp พบว่าโครงการนี้อาจยังไม่คุ้มค่าการลงทุนในปัจจุบัน โดยมีระยะเวลาคืนทุน ${simplePaybackYears ? `${simplePaybackYears} ปี` : "เกินอายุโครงการ"} และมูลค่าปัจจุบันสุทธิ (NPV) ติดลบที่ ${npvThb.toLocaleString()} บาท ควรพิจารณาลดขนาดระบบหรือหาแหล่งเงินทุนที่ต้นทุนต่ำลง`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Fallback 3: Rule-based (No API Key)
    if (!genAI) {
      return NextResponse.json({ summary: generateRuleBasedSummary(body) });
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์การเงินและพลังงานโซลาร์เซลล์
ช่วยเขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ 2-4 ประโยค เป็นภาษาไทยแบบมืออาชีพ สละสลวย เพื่อบอกว่าการลงทุนนี้คุ้มค่าหรือไม่ โดยอิงจากข้อมูลต่อไปนี้:

- ขนาดระบบ (System Size): ${body.systemSizeKwp} kWp
- ประหยัดค่าไฟได้ (Net Annual Benefit): ${body.netAnnualBenefit} บาท/ปี
- ระยะเวลาคืนทุน (Payback Period): ${body.simplePaybackYears} ปี
- มูลค่าปัจจุบันสุทธิ (NPV): ${body.npvThb} บาท
- อัตราผลตอบแทนภายใน (IRR): ${body.irrPercent}%

อย่าใช้ markdown ไม่ต้องมีหัวข้อ ขอแค่เนื้อความ 1 ย่อหน้าสั้นๆ`;

    try {
      // Fallback 1: Try Gemini 2.5 Flash
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return NextResponse.json({ summary: text.trim() });
      
    } catch (apiError: unknown) {
      console.error("Gemini 2.5 Flash failed, attempting Fallback 2 (Flash-Lite)", apiError);
      
      try {
        // Fallback 2: Try Gemini 1.5 Flash-8b (Flash Lite)
        const liteModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
        const liteResult = await liteModel.generateContent(prompt);
        const liteText = liteResult.response.text();
        return NextResponse.json({ summary: liteText.trim() });
      } catch (liteError) {
        console.error("Gemini Flash-Lite also failed, using Fallback 3 (Rule-based)", liteError);
        
        // Fallback 3: Rule-based
        return NextResponse.json({ summary: generateRuleBasedSummary(body) });
      }
    }
  } catch (error: unknown) {
    console.error("Error generating summary:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to generate summary", details: msg }, { status: 500 });
  }
}
