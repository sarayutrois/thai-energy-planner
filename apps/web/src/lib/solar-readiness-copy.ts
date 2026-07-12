export const solarReadinessCopy = {
  reportTitle: "รายงานสรุปการประเมินการติดตั้งโซลาร์เซลล์เบื้องต้น",
  globalDisclaimer:
    "ผลการประเมินนี้เป็นการประมาณการเบื้องต้นจากข้อมูลที่คุณระบุและค่าเฉลี่ยทางสถิติเท่านั้น ไม่ใช่ใบเสนอราคาทางการ และไม่อาจใช้รับประกันผลประหยัดพลังงานหรือค่าใช้จ่ายจริงได้ โปรดปรึกษาวิศวกรหรือผู้เชี่ยวชาญเพื่อประเมินหน้างานจริง",
  yieldHint:
    "คำนวณจากค่าเฉลี่ยความเข้มแสงอาทิตย์รายปีในพื้นที่ โดยยังไม่รวมปัจจัยสภาพอากาศรายวัน ทิศทางหลังคาที่คลาดเคลื่อน หรือเงาบังหน้างานจริง",
  estimatedSavingsHint:
    "ตัวเลขประหยัดประเมินจากอัตราค่าไฟฟ้าฐานปัจจุบัน (ดูสมมติฐานการคำนวณ) โดยยังไม่รวมการเปลี่ยนแปลงของค่า Ft หรือการเปลี่ยนพฤติกรรมการใช้ไฟในอนาคต",
  pdfCta: "ดาวน์โหลดรายงานสรุปการประมาณการ (PDF)",
  hiddenCostLimitation:
    "ไม่รวมค่าดำเนินการขออนุญาตภาครัฐ การปรับปรุงโครงสร้างหลังคา ค่าล้างแผงรายปี และค่าใช้จ่ายแอบแฝงอื่น ๆ ที่อาจเกิดขึ้นจริง",
  nextStep:
    "ติดต่อผู้รับเหมาหรือวิศวกรเพื่อสำรวจสถานที่ ตรวจสภาพหลังคา เงาบัง และประเมินราคาจริงก่อนตัดสินใจลงทุน",
  tariffReference:
    "ใช้อัตราค่าไฟฟ้าจาก tariff snapshot ของ Tariff Engine พร้อม metadata ของ tariff, Ft และ VAT สำหรับการประเมินเบื้องต้น ก่อนใช้งานจริงควรตรวจรอบประกาศล่าสุดจาก MEA/PEA/ERC",
  yieldReference:
    "ใช้ค่าผลิตไฟรายเดือนเพื่อการประเมินเบื้องต้น ควรยืนยันด้วยข้อมูลแสงอาทิตย์และการสำรวจหน้างานก่อนตัดสินใจลงทุนจริง",
  exportReference:
    "ใช้อัตรารับซื้อไฟที่ผู้ใช้ระบุในแบบจำลอง หากต้องใช้ production ต้องตรวจประกาศ ERC ล่าสุดและ eligibility ของโครงการก่อน"
} as const;

export function formatApproximateMoneyRange(value: number) {
  const absolute = Math.abs(value);
  const step = absolute >= 100000 ? 5000 : absolute >= 10000 ? 1000 : 100;
  const low = roundToStep(value * 0.9, step);
  const high = roundToStep(value * 1.1, step);
  return `${formatMoney(Math.min(low, high))} - ${formatMoney(Math.max(low, high))} บาท`;
}

export function formatApproximateMoney(value: number) {
  const absolute = Math.abs(value);
  const step = absolute >= 100000 ? 5000 : absolute >= 10000 ? 1000 : 100;
  return `~${formatMoney(roundToStep(value, step))} บาท`;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}
