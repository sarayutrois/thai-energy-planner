"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Sparkles, Loader2, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SolarDemoSettings } from "@/lib/solar-demo";

export function GoalDrivenCopilot({ currentSettings }: { currentSettings: SolarDemoSettings }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{ thoughtProcess: string; suggestedParameters?: Partial<SolarDemoSettings> } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/solar/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentSettings }),
      });

      if (!res.ok) throw new Error("API failed");
      
      const data = await res.json();
      setResponse(data);

      if (data.suggestedParameters) {
        // Update URL query string with new parameters
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(data.suggestedParameters)) {
          if (value !== undefined && value !== null) {
            params.set(key, String(value));
          }
        }
        router.push(`?${params.toString()}`);
      }
      
    } catch (err) {
      console.error(err);
      setResponse({ thoughtProcess: "ขออภัยครับ ระบบ AI เกิดข้อผิดพลาดชั่วคราว ลองใหม่อีกครั้งนะครับ" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2 text-indigo-900">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold">Goal-Driven Energy Copilot</h3>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Beta</span>
        </div>
        
        <p className="mb-4 text-sm text-indigo-800">
          ขี้เกียจกรอกฟอร์ม? พิมพ์บอก AI ได้เลย เช่น <i>"มีงบ 2 แสนบาท ทำงานกลางวัน กลับมาใช้ไฟกลางคืน"</i>
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="เป้าหมายของคุณคืออะไร?"
            className="border-indigo-200 bg-white shadow-sm placeholder:text-indigo-300 focus-visible:ring-indigo-500"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !prompt.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {response && (
          <div className="mt-4 rounded-lg bg-white/60 p-4 border border-indigo-100 shadow-sm flex gap-3 animate-in fade-in zoom-in duration-300">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">AI ตอบกลับ:</p>
              <p className="mt-1 text-sm text-indigo-800/90 leading-relaxed">{response.thoughtProcess}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
