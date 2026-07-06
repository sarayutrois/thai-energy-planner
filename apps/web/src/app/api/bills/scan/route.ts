import { NextRequest, NextResponse } from "next/server";
import { genAI, isGeminiConfigured } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured() || !genAI) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or image (PNG/JPG/WebP)." },
        { status: 400 }
      );
    }

    // Limit file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    const prompt = `You are an expert at reading Thai electricity bills (PEA and MEA).
Extract the following information from the image and return it as JSON:
- month: The billing month in YYYY-MM format. Find the billing period or invoice date. Convert Thai year to Gregorian (e.g. 2567 -> 2024, 2568 -> 2025). Month should be padded to 2 digits (e.g. "2024-05").
- energyKwh: The total electricity usage in units (kWh). Return a number.
- totalCostThb: The total amount to pay in THB (including VAT). Return a number.
- authority: The electricity authority, either "PEA" (Provincial Electricity Authority) or "MEA" (Metropolitan Electricity Authority).

Ensure the output is ONLY a valid JSON object with these 4 keys. No markdown blocks, no extra text.`;

    // Tier 1: Gemini 2.5 Flash
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const text = result.response.text();
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (tier1Error) {
      console.warn("[BillScan] Gemini 2.5 Flash failed, trying Tier 2:", tier1Error);
    }

    // Tier 2: Gemini 2.0 Flash-Lite
    try {
      const liteModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      const liteResult = await liteModel.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const liteText = liteResult.response.text();
      const liteData = JSON.parse(liteText);
      return NextResponse.json(liteData);
    } catch (tier2Error) {
      console.error("[BillScan] Both AI tiers failed:", tier2Error);
    }

    // No rule-based fallback possible for OCR – return clear error
    return NextResponse.json(
      { error: "ระบบ AI ไม่สามารถอ่านบิลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือกรอกข้อมูลด้วยตนเอง" },
      { status: 503 }
    );
  } catch (error: unknown) {
    console.error("Error scanning bill:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to scan bill", details: msg },
      { status: 500 }
    );
  }
}
