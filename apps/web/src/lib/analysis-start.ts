export type AnalysisAudience = "home" | "shop" | "business";
export type AnalysisSource = "bills" | "interval" | "appliances";

export type AnalysisStartSearchParams = Record<
  string,
  string | string[] | undefined
>;

const audienceCopy: Record<
  AnalysisAudience,
  {
    label: string;
    description: string;
    focus: string;
  }
> = {
  home: {
    label: "บ้านพักอาศัย",
    description: "เน้นดูค่าไฟรายเดือน พฤติกรรมใช้ไฟช่วงเย็น และโอกาสใช้ Solar",
    focus:
      "เริ่มจากบิล 6-12 เดือน แล้วค่อยดูว่า TOU หรือ Solar เหมาะกับบ้านนี้ไหม",
  },
  shop: {
    label: "ร้านค้า",
    description:
      "เน้นโหลดกลางวัน แอร์ ตู้แช่ และโอกาสใช้ Solar ระหว่างเปิดร้าน",
    focus: "ถ้ามีบิลกับเวลาเปิดร้าน จะช่วยประเมิน Solar และ TOU ได้ตรงขึ้น",
  },
  business: {
    label: "ธุรกิจขนาดเล็ก",
    description:
      "เน้นโหลดต่อเนื่อง ค่าไฟประจำเดือน และการเปรียบเทียบหลาย scenario",
    focus:
      "ถ้ามี load profile รายชั่วโมงหรือราย 15 นาที ผล TOU และ peak จะน่าเชื่อถือขึ้น",
  },
};

const sourceCopy: Record<
  AnalysisSource,
  {
    label: string;
    nextAction: string;
  }
> = {
  bills: {
    label: "บิลค่าไฟ",
    nextAction: "กรอกหรือทวนข้อมูลบิลย้อนหลัง แล้วดูค่าไฟเฉลี่ยต่อเดือน",
  },
  interval: {
    label: "ไฟล์โหลด CSV/XLSX",
    nextAction:
      "เลือกไฟล์ข้อมูล ตรวจการจับคู่คอลัมน์ แล้วดูตัวอย่างข้อมูลก่อนวิเคราะห์",
  },
  appliances: {
    label: "รายการเครื่องใช้ไฟฟ้า",
    nextAction:
      "ปรับรายการเครื่องใช้ไฟฟ้าและช่วงเวลาใช้งาน เพื่อสร้างโหลดตัวอย่าง",
  },
};

const sourceFocus: Record<Exclude<AnalysisSource, "bills">, string> = {
  interval:
    "นำเข้าไฟล์และตรวจช่วงเวลา หน่วย และคอลัมน์ให้ถูกต้องก่อน จากนั้นค่อยเพิ่มบิลเพื่อปรับค่าใช้จ่ายให้ใกล้เคียงจริง",
  appliances:
    "เพิ่มเครื่องใช้ไฟฟ้าและช่วงเวลาใช้งานให้ครบ จากนั้นใช้บิลช่วยปรับพลังงานรายเดือนให้ใกล้เคียงจริง",
};

export function normalizeAnalysisAudience(
  value: string | string[] | undefined,
): AnalysisAudience {
  const raw = getSingleParam(value);
  return raw === "shop" || raw === "business" ? raw : "home";
}

export function normalizeAnalysisSource(
  value: string | string[] | undefined,
  fallback: AnalysisSource,
): AnalysisSource {
  const raw = getSingleParam(value);
  if (raw === "interval" || raw === "appliances" || raw === "bills") return raw;
  return fallback;
}

export function getAnalysisStartContext(
  params: AnalysisStartSearchParams,
  fallbackSource: AnalysisSource,
) {
  const audience = normalizeAnalysisAudience(params.audience);
  const source = normalizeAnalysisSource(params.source, fallbackSource);

  return {
    audience,
    source,
    audienceLabel: audienceCopy[audience].label,
    audienceDescription: audienceCopy[audience].description,
    sourceLabel: sourceCopy[source].label,
    focus:
      source === "bills" ? audienceCopy[audience].focus : sourceFocus[source],
    nextAction: sourceCopy[source].nextAction,
  };
}

export function buildAnalysisStartHref(
  path: string,
  audience: AnalysisAudience,
  source: AnalysisSource,
) {
  const params = new URLSearchParams({ audience, source });
  return `${path}?${params.toString()}`;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
