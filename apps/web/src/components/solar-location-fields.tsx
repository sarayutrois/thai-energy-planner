"use client";

import { useState } from "react";

const thaiProvinces = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระบุรี", "สระแก้ว", "สิงห์บุรี", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "สุโขทัย", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี",
];

export function SolarLocationFields({
  province,
  latitude,
  longitude,
}: {
  province: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
}) {
  const [selectedProvince, setSelectedProvince] = useState(province);
  const [lat, setLat] = useState(latitude === undefined ? "" : String(latitude));
  const [lon, setLon] = useState(longitude === undefined ? "" : String(longitude));
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง กรุณาเว้นว่างเพื่อใช้ค่าประมาณ");
      return;
    }
    setLocationStatus("กำลังขอตำแหน่งจากอุปกรณ์...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(5));
        setLon(position.coords.longitude.toFixed(5));
        setLocationStatus("เติมพิกัดจากตำแหน่งปัจจุบันแล้ว");
      },
      () => setLocationStatus("ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง ระบบจะใช้ค่าประมาณจนกว่าจะระบุพิกัด"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <>
      <label className="grid gap-1 text-sm font-medium">
        จังหวัด / พื้นที่
        <select className="h-10 rounded-md border border-input bg-background px-3" name="province" value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)}>
          {!thaiProvinces.includes(selectedProvince) ? <option value={selectedProvince}>{selectedProvince}</option> : null}
          {thaiProvinces.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Latitude <span className="text-xs font-normal text-muted-foreground">(ไม่จำเป็น)</span>
        <input className="h-10 rounded-md border border-input bg-background px-3" name="latitude" type="number" min="-90" max="90" step="0.00001" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="ใช้ตำแหน่งปัจจุบันแทนได้" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Longitude <span className="text-xs font-normal text-muted-foreground">(ไม่จำเป็น)</span>
        <input className="h-10 rounded-md border border-input bg-background px-3" name="longitude" type="number" min="-180" max="180" step="0.00001" value={lon} onChange={(event) => setLon(event.target.value)} placeholder="ใช้ตำแหน่งปัจจุบันแทนได้" />
      </label>
      <div className="flex flex-col justify-end gap-2 text-sm">
        <button className="h-10 rounded-md border border-border bg-background px-3 font-medium hover:bg-muted" type="button" onClick={useCurrentLocation}>ใช้ตำแหน่งปัจจุบัน</button>
        <p className="text-xs leading-5 text-muted-foreground">{locationStatus ?? "ไม่ทราบพิกัดก็เลือกจังหวัดได้ ระบบจะแสดงผลแบบประมาณการ"}</p>
      </div>
    </>
  );
}
