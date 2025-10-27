const DOW: Record<string, number> = {
  MON: 1,
  TUES: 2,
  WED: 3,
  THURS: 4,
  FRI: 5,
  SAT: 6,
  SUN: 0,
};

/**
 *
 * @param dateStr Date String
 * @param timeStr Time String
 * @returns Date and Time string converted to Date object
 */
function parseLocalDateTime(dateStr: string, timeStr = "23:59") {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/**
 *
 * @param d Original Date
 * @param days Days to add
 * @returns New Date
 */
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function dateCalculator(
  termStart: string,
  week: number,
  day: keyof typeof DOW
) {
  const start = new Date(termStart);
  const startDOW = start.getDay();
  const targetDOW = DOW[day];

  // Calculates day offset
  const toTarget = (targetDOW - startDOW + 7) % 7;

  // Calculates week offset
  const daysFromStart = (week - 1) * 7 + toTarget;

  return addDays(start, daysFromStart);
}
