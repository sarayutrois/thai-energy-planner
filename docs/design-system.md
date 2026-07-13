# Design System — Modern Thai Energy Planning Platform

## Tokens

Semantic tokens อยู่ใน `globals.css` และถูก expose ใน Tailwind:

- surfaces: `background`, `surface`, `surface-elevated`, `card`, `border`
- text/actions: `foreground`, `muted-foreground`, `primary`, `information`, `success`, `warning`, `destructive`
- charts: `chart-primary`, `chart-secondary`, `chart-grid`, `on-peak`, `off-peak`, `solar`, `grid`, `battery`, `ev`

Light และ dark theme ใช้ชื่อ token เดิม จึงไม่ต้องกำหนด hex ซ้ำใน component ใหม่ Dark theme ใช้ navy-charcoal ที่อ่านง่าย แทนพื้นหลังดำสนิท

## Typography และ spacing

- Font: Prompt เป็น font หลักเพื่อรองรับภาษาไทย; Inter เป็น fallback สำหรับ Latin/numerals
- H1 30/36 mobile, 36/40 desktop; H2 20/28; H3 16/24; body 16/28; label/caption 12–14
- ใช้ spacing scale 4px: page 16/24px, section 32–40px, card 20px, control gap 8–12px

## Shared components

| กลุ่ม    | Component                                                            |
| -------- | -------------------------------------------------------------------- |
| Layout   | `PageHeader`, `SectionHeader`, `ActionBar`, `EmptyState`             |
| Controls | `Button`, `Input`, Badge และ native select ที่ใช้ token input/border |
| Feedback | `Alert`, `DataConfidence`, `LoadingState`, `Skeleton`                |
| Data     | `Card`, `MetricCard`                                                 |

ทุก control หลักมี focus ring, disabled style และ semantic foreground/background. Motion ใช้ transition สั้นของ button/card เท่านั้น และ global reduced-motion mode ปิด motion ที่ไม่จำเป็น

## Guidelines

- Primary action มีหนึ่ง action ต่อ content area; secondary action ใช้ outline/ghost
- Recommendation ใช้ `Alert`/`DataConfidence` ก่อนกราฟหรือรายละเอียดเชิงเทคนิค
- Card ใช้แบ่งข้อมูลที่มีความหมาย ไม่ซ้อน card หลายชั้นโดยไม่มีเหตุผล
- สถานะ success/warning/danger ต้องมีข้อความและ icon/label ไม่อาศัยสีอย่างเดียว
- กราฟใหม่ต้องใช้ chart tokens, title, unit, legend และข้อความบอกสิ่งที่ควรสังเกต
