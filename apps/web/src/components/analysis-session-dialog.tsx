"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  analysisResumeSessionStorageKey,
  announceAnalysisStorageChanged,
  clearPersistedAnalysisData,
  hasPersistedAnalysisData,
  readAnalysisResumeChoice,
} from "@/lib/analysis-storage";

function resetCurrentAnalysis() {
  clearPersistedAnalysisData(window.localStorage);
  window.sessionStorage.setItem(analysisResumeSessionStorageKey, "new");
  announceAnalysisStorageChanged();
  window.location.assign("/analysis/new?fresh=1");
}

export function AnalysisSessionDialog() {
  const [showResumeChoice, setShowResumeChoice] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (readAnalysisResumeChoice(window.sessionStorage) !== null) return;
    if (hasPersistedAnalysisData(window.localStorage)) {
      setShowResumeChoice(true);
      return;
    }
    window.sessionStorage.setItem(analysisResumeSessionStorageKey, "new");
  }, []);

  const continueAnalysis = useCallback(() => {
    window.sessionStorage.setItem(analysisResumeSessionStorageKey, "continue");
    setShowResumeChoice(false);
  }, []);

  if (!showResumeChoice && !showConfirmation) return null;

  return (
    <>
      {showResumeChoice ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <section
            aria-describedby="analysis-resume-description"
            aria-labelledby="analysis-resume-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-float md:p-7"
            role="dialog"
          >
            <p className="text-sm font-semibold text-primary">
              พบข้อมูลในอุปกรณ์นี้
            </p>
            <h2
              id="analysis-resume-title"
              className="mt-2 text-2xl font-semibold"
            >
              ต้องการทำต่อจากข้อมูลเดิมหรือเริ่มใหม่?
            </h2>
            <p
              id="analysis-resume-description"
              className="mt-3 text-sm leading-6 text-muted-foreground"
            >
              ระบบพบข้อมูลบิล รูปแบบการใช้ไฟ หรือผลวิเคราะห์ที่เคยบันทึกไว้
              คุณสามารถทำต่อได้
              หรือเริ่มการวิเคราะห์ใหม่โดยไม่กระทบธีมและการเข้าสู่ระบบ
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button autoFocus size="lg" onClick={continueAnalysis}>
                ทำต่อจากข้อมูลเดิม
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setShowResumeChoice(false);
                  setShowConfirmation(true);
                }}
              >
                เริ่มการวิเคราะห์ใหม่
              </Button>
            </div>
          </section>
        </div>
      ) : null}
      <ConfirmationDialog
        open={showConfirmation}
        title="ยืนยันเริ่มการวิเคราะห์ใหม่"
        description="ข้อมูลเป้าหมาย บิล เครื่องใช้ไฟฟ้า Load Profile และรายงานวิเคราะห์ในอุปกรณ์นี้จะถูกลบ แต่ธีม การตั้งค่า UI และสถานะเข้าสู่ระบบจะยังอยู่"
        confirmLabel="ลบข้อมูลและเริ่มใหม่"
        onCancel={() => {
          setShowConfirmation(false);
          setShowResumeChoice(true);
        }}
        onConfirm={resetCurrentAnalysis}
      />
    </>
  );
}

export function StartNewAnalysisButton() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  return (
    <>
      <Button
        aria-label="เริ่มการวิเคราะห์ใหม่"
        className="gap-2"
        size="sm"
        variant="ghost"
        onClick={() => setShowConfirmation(true)}
      >
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        <span className="hidden xl:inline">เริ่มการวิเคราะห์ใหม่</span>
      </Button>
      <ConfirmationDialog
        open={showConfirmation}
        title="ยืนยันเริ่มการวิเคราะห์ใหม่"
        description="ข้อมูลเป้าหมาย บิล เครื่องใช้ไฟฟ้า Load Profile และรายงานวิเคราะห์ในอุปกรณ์นี้จะถูกลบ แต่ธีม การตั้งค่า UI และสถานะเข้าสู่ระบบจะยังอยู่"
        confirmLabel="ลบข้อมูลและเริ่มใหม่"
        onCancel={() => setShowConfirmation(false)}
        onConfirm={resetCurrentAnalysis}
      />
    </>
  );
}
