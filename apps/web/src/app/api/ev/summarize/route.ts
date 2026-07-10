import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini-client";
import { guardApiRequest } from "@/lib/api-security";

function generateRuleBasedSummary(data: {
  selectedStrategy: string;
  bestStrategy: string;
  addedKwh: number;
  monthlyIncreaseThb: number;
}): string {
  const { selectedStrategy, bestStrategy, addedKwh, monthlyIncreaseThb } = data;

  if (selectedStrategy === bestStrategy) {
    return `กลยุทธ์การชาร์จแบบ ${selectedStrategy} เป็นทางเลือกที่คุ้มค่าที่สุด โดยมีการชาร์จไฟเพิ่ม ${addedKwh} kWh/เดือน ทำให้ค่าไฟเพิ่มขึ้นประมาณ ${monthlyIncreaseThb} บาท/เดือน`;
  } else {
    return `คุณเลือกการชาร์จแบบ ${selectedStrategy} ซึ่งจะทำให้ค่าไฟเพิ่มขึ้น ${monthlyIncreaseThb} บาท/เดือน อย่างไรก็ตามระบบประเมินว่ากลยุทธ์แบบ ${bestStrategy} จะช่วยประหยัดค่าไฟได้ดีที่สุดสำหรับพฤติกรรมนี้`;
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardApiRequest(req, {
    bucket: "gemini-ev-summary",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  try {
    const body = await req.json();

    // Input validation
    const { selectedStrategy, bestStrategy, addedKwh, monthlyIncreaseThb } =
      body;
    if (
      !selectedStrategy ||
      !bestStrategy ||
      addedKwh === undefined ||
      monthlyIncreaseThb === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: selectedStrategy, bestStrategy, addedKwh, monthlyIncreaseThb",
        },
        { status: 400 },
      );
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านรถยนต์ไฟฟ้า (EV) และระบบจัดการพลังงาน
ช่วยเขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ 2-4 ประโยค เป็นภาษาไทยแบบมืออาชีพ สรุปพฤติกรรมการชาร์จรถ EV จากข้อมูลต่อไปนี้:

- กลยุทธ์ที่ลูกค้าเลือก (Selected Strategy): ${selectedStrategy}
- กลยุทธ์ที่ AI แนะนำว่าคุ้มสุด (Best Strategy): ${bestStrategy}
- พลังงานที่ใช้ชาร์จ (Added EV Energy): ${addedKwh} kWh/เดือน
- ค่าไฟที่เพิ่มขึ้น (Monthly Bill Increase): ${monthlyIncreaseThb} บาท/เดือน

อย่าใช้ markdown ไม่ต้องมีหัวข้อ ขอแค่เนื้อความ 1 ย่อหน้าสั้นๆ หากลูกค้าไม่ได้เลือก Best Strategy ให้แนะนำเบาๆ ว่าเปลี่ยนไปใช้ Best Strategy จะคุ้มค่ากว่า`;

    const summary = await callGeminiWithFallback(prompt, () =>
      generateRuleBasedSummary(body),
    );
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    console.error("Error generating EV summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
