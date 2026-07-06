import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    // "gemini-2.5-flash" is highly reliable for Multimodal OCR
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert at reading Thai electricity bills (PEA and MEA).
Extract the following information from the image and return it as JSON:
- month: The billing month in YYYY-MM format. Find the billing period or invoice date. Convert Thai year to Gregorian (e.g. 2567 -> 2024, 2568 -> 2025). Month should be padded to 2 digits (e.g. "2024-05").
- energyKwh: The total electricity usage in units (kWh). Return a number.
- totalCostThb: The total amount to pay in THB (including VAT). Return a number.
- authority: The electricity authority, either "PEA" (Provincial Electricity Authority) or "MEA" (Metropolitan Electricity Authority).

Ensure the output is ONLY a valid JSON object with these 4 keys. No markdown blocks, no extra text.`;

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
  } catch (error: unknown) {
    console.error("Error scanning bill:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to scan bill", details: msg },
      { status: 500 }
    );
  }
}
