import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
  try {
    if (!genAI) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { prompt, currentSettings } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            thoughtProcess: {
              type: SchemaType.STRING,
              description: "ภาษาไทย: อธิบายสั้นๆ เป็นกันเอง ว่าทำไมถึงปรับค่าเหล่านั้นให้ผู้ใช้ เพื่อให้ตรงกับเป้าหมาย",
            },
            suggestedParameters: {
              type: SchemaType.OBJECT,
              description: "พารามิเตอร์ที่ควรปรับเปลี่ยนเพื่อให้สอดคล้องกับความต้องการของผู้ใช้",
              properties: {
                systemSizeKwp: { type: SchemaType.NUMBER, description: "ขนาดแผงโซลาร์ (kWp) - ปกติบ้านทั่วไป 3-5 kWp, ถ้ามีงบเยอะหรือร้านค้าอาจจะ 5-10 kWp" },
                capexThb: { type: SchemaType.NUMBER, description: "งบประมาณหรือต้นทุน (บาท) - หากระบุงบ ให้ยึดตามที่ระบุ, โดยปกติ 1 kWp = ประมาณ 40,000 บาท" },
                profile: { 
                  type: SchemaType.STRING, 
                  description: "พฤติกรรมการใช้ไฟ: 'evening_home' (เน้นใช้ไฟกลางคืน/ชาร์จ EV), 'daytime_home' (ใช้ไฟกลางวันพอสมควร), 'daytime_shop' (ร้านค้าใช้ไฟกลางวันเยอะมาก)" 
                },
              },
            },
          },
          required: ["thoughtProcess", "suggestedParameters"],
        },
      },
    });

    const systemInstruction = `
      คุณเป็น AI พลังงานผู้เชี่ยวชาญชื่อ "Energy Copilot" ช่วยแปลความต้องการของลูกค้าให้กลายเป็นค่า Setting ของระบบ 
      ปัจจุบันการตั้งค่าระบบคือ: ${JSON.stringify(currentSettings)}
      
      กฎการปรับค่า:
      - ถ้าลูกค้าบอกงบมา ให้พยายามหา systemSizeKwp ที่สอดคล้องกับงบ (ประมาณ 40,000 บาท ต่อ 1 kWp) หรือถ้าลูกค้ามีงบเยอะมาก ก็อาจจัด systemSizeKwp แบบเหมาะสมที่ 5-10 kWp และกำหนด capexThb ตามงบที่บอก
      - ถ้าลูกค้าพูดถึงการชาร์จรถ EV หรือไปทำงานกลางวัน ให้ตั้ง profile เป็น "evening_home"
      - ถ้าเป็นร้านค้าหรืออยู่บ้านกลางวันเยอะ ให้ตั้ง profile เป็น "daytime_home" หรือ "daytime_shop"
      - ส่งกลับเฉพาะพารามิเตอร์ที่คุณต้องการจะเปลี่ยนให้ลูกค้า (ไม่ต้องส่งกลับครบทุกตัว) 
    `;

    const result = await model.generateContent(systemInstruction + "\n\nความต้องการของลูกค้า: " + prompt);
    const text = result.response.text();
    
    // Parse JSON
    const parsedResponse = JSON.parse(text);

    return NextResponse.json(parsedResponse);
  } catch (error: unknown) {
    console.error("Copilot API Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate copilot response", details: msg },
      { status: 500 }
    );
  }
}
