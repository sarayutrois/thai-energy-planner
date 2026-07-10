"use client";

import { useMemo, useState } from "react";
import { simulateApplianceLoadProfile } from "@thai-energy-planner/calculation-engine";
import type { ApplianceInput } from "@thai-energy-planner/shared-types";
import { Button } from "@/components/ui/button";
import { saveLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

export function ApplianceLoadBuilder({
  initialAppliances,
  date,
}: {
  initialAppliances: ApplianceInput[];
  date: string;
}) {
  const [appliances, setAppliances] = useState(initialAppliances);
  const [intervalMinutes, setIntervalMinutes] = useState<15 | 30 | 60>(15);
  const [saved, setSaved] = useState(false);
  const simulation = useMemo(
    () => simulateApplianceLoadProfile({ appliances, date, intervalMinutes }),
    [appliances, date, intervalMinutes],
  );

  function update(index: number, patch: Partial<ApplianceInput>) {
    setAppliances((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
    setSaved(false);
  }

  function updateTime(
    index: number,
    key: "startTime" | "endTime",
    value: string,
  ) {
    setAppliances((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, schedule: { ...item.schedule, [key]: value } }
          : item,
      ),
    );
    setSaved(false);
  }

  function addAppliance() {
    setAppliances((current) => [
      ...current,
      {
        name: "Custom appliance",
        category: "custom",
        power: 0.1,
        powerUnit: "kW",
        quantity: 1,
        dutyCycle: 1,
        schedule: {
          startTime: "18:00",
          endTime: "22:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          workingDayOnly: false,
          holidayOnly: false,
          seasonalMonths: [],
        },
      },
    ]);
    setSaved(false);
  }

  function saveForSolar() {
    saveLocalLoadProfileSnapshot({
      sourceName: "Appliance load profile",
      sourceKind: "appliance",
      totalKwh: simulation.kwhPerDay,
      peakKw: simulation.peakKw,
      detectedIntervalMinutes: intervalMinutes,
      rows: simulation.intervals,
    });
    setSaved(true);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-4">
        <label className="text-sm font-medium">
          Interval{" "}
          <select
            className="ml-2 h-10 rounded-md border border-input bg-background px-3"
            value={intervalMinutes}
            onChange={(event) =>
              setIntervalMinutes(Number(event.target.value) as 15 | 30 | 60)
            }
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
          </select>
        </label>
        <Button variant="outline" onClick={addAppliance}>
          Add appliance
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="kWh/day" value={simulation.kwhPerDay} />
        <Metric
          label="Monthly estimate"
          value={simulation.estimatedKwhPerMonth}
        />
        <Metric label="Peak kW" value={simulation.peakKw} />
        <Metric
          label="Top appliance"
          value={simulation.topAppliance?.name ?? "-"}
        />
      </div>
      {appliances.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="grid gap-3 rounded-md border border-border bg-card p-4 md:grid-cols-7"
        >
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => update(index, { name })}
          />
          <NumberField
            label="kW"
            value={item.powerUnit === "W" ? item.power / 1000 : item.power}
            min={0.001}
            step={0.001}
            onChange={(power) => update(index, { power, powerUnit: "kW" })}
          />
          <NumberField
            label="Quantity"
            value={item.quantity}
            min={1}
            step={1}
            onChange={(quantity) =>
              update(index, { quantity: Math.max(1, Math.round(quantity)) })
            }
          />
          <NumberField
            label="Duty"
            value={item.dutyCycle}
            min={0}
            max={1}
            step={0.05}
            onChange={(dutyCycle) =>
              update(index, { dutyCycle: Math.min(1, Math.max(0, dutyCycle)) })
            }
          />
          <TimeField
            label="Start"
            value={item.schedule.startTime}
            onChange={(value) => updateTime(index, "startTime", value)}
          />
          <TimeField
            label="End"
            value={item.schedule.endTime}
            onChange={(value) => updateTime(index, "endTime", value)}
          />
          <Button
            className="self-end"
            variant="outline"
            onClick={() => {
              setAppliances((current) =>
                current.filter((_, itemIndex) => itemIndex !== index),
              );
              setSaved(false);
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-success bg-success/10 p-4 text-sm">
        <Button disabled={appliances.length === 0} onClick={saveForSolar}>
          Save for Solar Analysis
        </Button>
        <a
          className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 font-medium hover:bg-muted"
          href="/analysis/solar?source=appliance"
        >
          Open Solar Analysis
        </a>
        <span className="text-muted-foreground">
          {saved
            ? "Saved modeled Canonical Load Profile."
            : "Changes are calculated locally before saving."}
        </span>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
function Metric({ label, value }: { label: string; value: number | string }) {
  const formatted =
    typeof value === "number"
      ? new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
          value,
        )
      : value;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{formatted}</p>
    </div>
  );
}
