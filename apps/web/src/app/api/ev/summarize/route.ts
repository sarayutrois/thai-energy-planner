import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function generateRuleBasedSummary(data: { selectedStrategy: string, bestStrategy: string, addedKwh: number, monthlyIncreaseThb: number }): string {
  const { selectedStrategy, bestStrategy, addedKwh, monthlyIncreaseThb } = data;
  
  if (selectedStrategy === bestStrategy) {
    return `กลยุทธ์การชาร์จแบบ ${selectedStrategy} เป็นทางเลือกที่คุ้มค่าที่สุด โดยมีการชาร์จไฟเพิ่ม ${addedKwh} kWh/เดือน ทำให้ค่าไฟเพิ่มขึ้นประมาณ ${monthlyIncreaseThb} บาท/เดือน`;
  } else {
    return `คุณเลือกการชาร์จแบบ ${selectedStrategy} ซึ่งจะทำให้ค่าไฟเพิ่มขึ้น ${monthlyIncreaseThb} บาท/เดือน อย่างไรก็ตามระบบประเมินว่ากลยุทธ์แบบ ${bestStrategy} จะช่วยประหยัดค่าไฟได้ดีที่สุดสำหรับพฤติกรรมนี้`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Fallback 3: Rule-based
    if (!genAI) {
      return NextResponse.json({ summary: generateRuleBasedSummary(body) });
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านรถยนต์ไฟฟ้า (EV) และระบบจัดการพลังงาน
ช่วยเขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ 2-4 ประโยค เป็นภาษาไทยแบบมืออาชีพ สรุปพฤติกรรมการชาร์จรถ EV จากข้อมูลต่อไปนี้:

- กลยุทธ์ที่ลูกค้าเลือก (Selected Strategy): ${body.selectedStrategy}
- กลยุทธ์ที่ AI แนะนำว่าคุ้มสุด (Best Strategy): ${body.bestStrategy}
- พลังงานที่ใช้ชาร์จ (Added EV Energy): ${body.addedKwh} kWh/เดือน
- ค่าไฟที่เพิ่มขึ้น (Monthly Bill Increase): ${body.monthlyIncreaseThb} บาท/เดือน

อย่าใช้ markdown ไม่ต้องมีหัวข้อ ขอแค่เนื้อความ 1 ย่อหน้าสั้นๆ หากลูกค้าไม่ได้เลือก Best Strategy ให้แนะนำเบาๆ ว่าเปลี่ยนไปใช้ Best Strategy จะคุ้มค่ากว่า`;

    try {
      // Fallback 1: Gemini 2.5 Flash
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return NextResponse.json({ summary: text.trim() });
      
    } catch (apiError: unknown) {
      console.error("Gemini 2.5 Flash failed for EV, attempting Fallback 2 (Flash-Lite)", apiError);
      
      try {
        // Fallback 2: Gemini 1.5 Flash-8b
        const liteModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
        const liteResult = await liteModel.generateContent(prompt);
        const liteText = liteResult.response.text();
        return NextResponse.json({ summary: liteText.trim() });
      } catch (liteError) {
        console.error("Gemini Flash-Lite also failed for EV, using Fallback 3 (Rule-based)", liteError);
        return NextResponse.json({ summary: generateRuleBasedSummary(body) });
      }
    }
  } catch (error: unknown) {
    console.error("Error generating EV summary:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to generate summary", details: msg }, { status: 500 });
  }
}
