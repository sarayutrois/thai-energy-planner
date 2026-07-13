const bangkokFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type BangkokDateTimeParts = {
  date: string;
  time: string;
  dayOfWeek: number;
  minuteOfDay: number;
};

export function getBangkokParts(timestamp: string): BangkokDateTimeParts {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  const parts = Object.fromEntries(
    bangkokFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const weekday = parts.weekday;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);

  if (
    !parts.year ||
    !parts.month ||
    !parts.day ||
    !weekday ||
    weekdayMap[weekday] === undefined
  ) {
    throw new Error(`Unable to parse timestamp in Asia/Bangkok: ${timestamp}`);
  }

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second ?? "00"}`,
    dayOfWeek: weekdayMap[weekday],
    minuteOfDay: hour * 60 + minute,
  };
}

export function getDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return getBangkokParts(value).date;
}

export function parseTimeToMinuteOfDay(time: string): number {
  const match = /^([01]\d|2[0-4]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time value: ${time}`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour === 24 && minute !== 0) {
    throw new Error(`Invalid 24-hour time value: ${time}`);
  }

  return hour * 60 + minute;
}

export function isDateInRange(
  targetDate: string,
  effectiveFrom: string,
  effectiveTo: string | null,
): boolean {
  const target = getDateKey(targetDate);
  const start = getDateKey(effectiveFrom);
  const end = effectiveTo ? getDateKey(effectiveTo) : null;

  return target >= start && (end === null || target <= end);
}

export function isMinuteInRange(
  minuteOfDay: number,
  startTime: string,
  endTime: string,
): boolean {
  const start = parseTimeToMinuteOfDay(startTime);
  const end = parseTimeToMinuteOfDay(endTime);

  if (start === end) {
    return true;
  }

  if (start < end) {
    return minuteOfDay >= start && minuteOfDay < end;
  }

  return minuteOfDay >= start || minuteOfDay < end;
}
