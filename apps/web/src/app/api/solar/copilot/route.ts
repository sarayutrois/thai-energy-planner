import { NextRequest, NextResponse } from "next/server";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { genAI } from "@/lib/ai/gemini-client";
import { guardApiRequest } from "@/lib/api-security";

export async function POST(req: NextRequest) {
  const blocked = guardApiRequest(req, {
    bucket: "gemini-solar-copilot",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  try {
    if (!genAI) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { prompt, currentSettings } = body;

    // Input validation
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    // Limit prompt length to prevent abuse
    const sanitizedPrompt = prompt.trim().slice(0, 500);

    const systemInstruction = `คุณเป็น AI พลังงานผู้เชี่ยวชาญชื่อ "Energy Copilot" ช่วยแปลความต้องการของลูกค้าให้กลายเป็นค่า Setting ของระบบ
ปัจจุบันการตั้งค่าระบบคือ: ${JSON.stringify(currentSettings)}

กฎการปรับค่า:
- ถ้าลูกค้าบอกงบมา ให้พยายามหา systemSizeKwp ที่สอดคล้องกับงบ (ประมาณ 40,000 บาท ต่อ 1 kWp) หรือถ้าลูกค้ามีงบเยอะมาก ก็อาจจัด systemSizeKwp แบบเหมาะสมที่ 5-10 kWp และกำหนด capexThb ตามงบที่บอก
- ถ้าลูกค้าพูดถึงการชาร์จรถ EV หรือไปทำงานกลางวัน ให้ตั้ง profile เป็น "evening_home"
- ถ้าเป็นร้านค้าหรืออยู่บ้านกลางวันเยอะ ให้ตั้ง profile เป็น "daytime_home" หรือ "daytime_shop"
- ส่งกลับเฉพาะพารามิเตอร์ที่คุณต้องการจะเปลี่ยนให้ลูกค้า (ไม่ต้องส่งกลับครบทุกตัว)`;

    const generationConfig = {
      responseMimeType: "application/json" as const,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          thoughtProcess: {
            type: SchemaType.STRING,
            description:
              "ภาษาไทย: อธิบายสั้นๆ เป็นกันเอง ว่าทำไมถึงปรับค่าเหล่านั้นให้ผู้ใช้ เพื่อให้ตรงกับเป้าหมาย",
          },
          suggestedParameters: {
            type: SchemaType.OBJECT,
            description:
              "พารามิเตอร์ที่ควรปรับเปลี่ยนเพื่อให้สอดคล้องกับความต้องการของผู้ใช้",
            properties: {
              systemSizeKwp: {
                type: SchemaType.NUMBER,
                description:
                  "ขนาดแผงโซลาร์ (kWp) - ปกติบ้านทั่วไป 3-5 kWp, ถ้ามีงบเยอะหรือร้านค้าอาจจะ 5-10 kWp",
              },
              capexThb: {
                type: SchemaType.NUMBER,
                description:
                  "งบประมาณหรือต้นทุน (บาท) - หากระบุงบ ให้ยึดตามที่ระบุ, โดยปกติ 1 kWp = ประมาณ 40,000 บาท",
              },
              profile: {
                type: SchemaType.STRING,
                description:
                  "พฤติกรรมการใช้ไฟ: 'evening_home' (เน้นใช้ไฟกลางคืน/ชาร์จ EV), 'daytime_home' (ใช้ไฟกลางวันพอสมควร), 'daytime_shop' (ร้านค้าใช้ไฟกลางวันเยอะมาก)",
              },
            },
          },
        },
        required: ["thoughtProcess", "suggestedParameters"],
      } as ResponseSchema,
    };

    // Tier 1: Gemini 2.5 Flash
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction,
        generationConfig,
      });
      const result = await model.generateContent(sanitizedPrompt);
      const text = result.response.text();

      try {
        return NextResponse.json(JSON.parse(text));
      } catch {
        console.error(
          "[Copilot] Tier 1 returned invalid JSON:",
          text.slice(0, 200),
        );
        // Fall through to Tier 2
      }
    } catch (err) {
      console.warn("[Copilot] Gemini 2.5 Flash failed, trying Tier 2:", err);
    }

    // Tier 2: Gemini 2.0 Flash-Lite
    try {
      const liteModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        systemInstruction,
        generationConfig,
      });
      const liteResult = await liteModel.generateContent(sanitizedPrompt);
      const liteText = liteResult.response.text();

      try {
        return NextResponse.json(JSON.parse(liteText));
      } catch {
        console.error(
          "[Copilot] Tier 2 returned invalid JSON:",
          liteText.slice(0, 200),
        );
        // Fall through to Tier 3
      }
    } catch (err) {
      console.warn(
        "[Copilot] Flash-Lite also failed, falling back to rule-based:",
        err,
      );
    }

    // Tier 3: Rule-based fallback
    return NextResponse.json({
      thoughtProcess:
        "ขออภัยครับ ระบบ AI ไม่สามารถประมวลผลได้ในขณะนี้ ลองปรับค่าด้วยตัวเองก่อนนะครับ หรือรอสักครู่แล้วพิมพ์ใหม่",
      suggestedParameters: {},
    });
  } catch (error: unknown) {
    console.error("Copilot API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate copilot response" },
      { status: 500 },
    );
  }
}
