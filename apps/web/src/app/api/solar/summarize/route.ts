import { NextRequest, NextResponse } from "next/server";
import { callGeminiWithFallback } from "@/lib/ai/gemini-client";
import { guardApiRequest } from "@/lib/api-security";

function generateRuleBasedSummary(data: {
  systemSizeKwp: number;
  npvThb: number;
  simplePaybackYears: number | null;
  netAnnualBenefit: number;
}): string {
  const { systemSizeKwp, npvThb, simplePaybackYears, netAnnualBenefit } = data;
  const isProfitable = npvThb > 0;

  if (isProfitable) {
    return `จากการจำลองการติดตั้งระบบโซลาร์เซลล์ขนาด ${systemSizeKwp} kWp พบว่าโครงการนี้มีความคุ้มค่าสูง โดยสามารถประหยัดค่าไฟได้ประมาณ ${netAnnualBenefit.toLocaleString()} บาทต่อปี มีระยะเวลาคืนทุน ${simplePaybackYears} ปี และสร้างมูลค่าปัจจุบันสุทธิ (NPV) ที่ ${npvThb.toLocaleString()} บาท ซึ่งถือเป็นการลงทุนที่น่าสนใจ`;
  } else {
    return `จากการจำลองการติดตั้งระบบโซลาร์เซลล์ขนาด ${systemSizeKwp} kWp พบว่าโครงการนี้อาจยังไม่คุ้มค่าการลงทุนในปัจจุบัน โดยมีระยะเวลาคืนทุน ${simplePaybackYears ? `${simplePaybackYears} ปี` : "เกินอายุโครงการ"} และมูลค่าปัจจุบันสุทธิ (NPV) ติดลบที่ ${npvThb.toLocaleString()} บาท ควรพิจารณาลดขนาดระบบหรือหาแหล่งเงินทุนที่ต้นทุนต่ำลง`;
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardApiRequest(req, {
    bucket: "gemini-solar-summary",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  try {
    const body = await req.json();

    // Input validation
    const {
      systemSizeKwp,
      npvThb,
      simplePaybackYears,
      irrPercent,
      netAnnualBenefit,
    } = body;
    if (
      systemSizeKwp === undefined ||
      npvThb === undefined ||
      netAnnualBenefit === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: systemSizeKwp, npvThb, netAnnualBenefit",
        },
        { status: 400 },
      );
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์การเงินและพลังงานโซลาร์เซลล์
ช่วยเขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ 2-4 ประโยค เป็นภาษาไทยแบบมืออาชีพ สละสลวย เพื่อบอกว่าการลงทุนนี้คุ้มค่าหรือไม่ โดยอิงจากข้อมูลต่อไปนี้:

- ขนาดระบบ (System Size): ${systemSizeKwp} kWp
- ประหยัดค่าไฟได้ (Net Annual Benefit): ${netAnnualBenefit} บาท/ปี
- ระยะเวลาคืนทุน (Payback Period): ${simplePaybackYears} ปี
- มูลค่าปัจจุบันสุทธิ (NPV): ${npvThb} บาท
- อัตราผลตอบแทนภายใน (IRR): ${irrPercent}%

อย่าใช้ markdown ไม่ต้องมีหัวข้อ ขอแค่เนื้อความ 1 ย่อหน้าสั้นๆ`;

    const summary = await callGeminiWithFallback(prompt, () =>
      generateRuleBasedSummary(body),
    );
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
