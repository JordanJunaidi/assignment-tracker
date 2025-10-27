import { DateTime } from "luxon";
import z from "zod";

const RecurringSchema = z.object({
  title: z.string(),
  start_week: z.number().int().min(1),
  end_week: z.number().int().max(10),
  day_of_week: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
  due_time_local: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  exceptions: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
});

const OneOffSchema = z.object({
  title: z.string(),
  date_local: z.string().regex(/^\d{4}-\d{2}-\d{2}/), // YYYY-MM-DD
  due_time_local: z.string().regex(/^\d{2}:\d{2}/), // HH:MM
  notes: z.string().optional().default(""),
});

const CourseInfoSchema = z.object({
  course_code: z.string(),
  term_start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  term_end: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
});

const ModelOutputSchema = z.object({
  recurring: z.array(RecurringSchema),
  one_off: z.array(OneOffSchema),
  course_info: CourseInfoSchema,
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;

type Row = {
  Course: string;
  Title: string;
  Type: "Recurring" | "One-Off";
  Week: string;
  DateLocal: string;
  DueTimeLocal: string;
  DayOfWeek: string;
  Notes: string;
};

const DOW_INDEX: Record<
  ModelOutput["recurring"][number]["day_of_week"],
  number
> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

/**
 *
 * @param termStart Start date of term
 * @param weekNum Week number
 * @returns Starting date of week (example: date of week 7 monday)
 */
function weekBase(termStart: DateTime, weekNum: number): DateTime {
  return termStart.plus({ days: (weekNum - 1) * 7 });
}

/**
 * Used to find date of a weekday of a certain week. For example, you can use this to get the exact date of Wednesday of week 7
 *
 * @param base Base week (ex: monday of week 7)
 * @param targetWeekday Weekday you want the date of (ex: wed)
 * @returns Date of the weekday
 */
function dateForWeekday(base: DateTime, targetWeekday: number): DateTime {
  const delta = targetWeekday - base.weekday + 7 - 7;
  return base.plus({ days: delta });
}

function parseExceptionWeeks(exceptions: string[]): Set<number> {
  const s = new Set<number>();
  for (const ex of exceptions) {
    const m = /Week\s+(\d+)/i.exec(ex);
    if (m) s.add(Number(m[1]));
  }

  return s;
}

function csvEscape(v: string): string {
  return /[",\n"]/.test(v) ? `${v.replace(/"/g, '""')}` : v;
}

/**
 *
 * @param rows Array of rows (assignments)
 * @returns Rows as CSV strings
 */
function rowsToCSV(rows: Row[]): string {
  const header = [
    "Course",
    "Title",
    "Type",
    "Week",
    "DateLocal",
    "DueTimeLocal",
    "DayOfWeek",
    "Notes",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    const row = [
      r.Course,
      r.Title,
      r.Type,
      r.Week,
      r.DateLocal,
      r.DueTimeLocal,
      r.DayOfWeek,
      r.Notes,
    ]
      .map(csvEscape)
      .join(",");
    lines.push(row);
  }

  return lines.join("\n");
}

export function buildRowsFromModel(
  modelTextOrObj: unknown,
  defaultTZ = "America/Los_Angeles"
) {
  const data =
    typeof modelTextOrObj === "string"
      ? JSON.parse(modelTextOrObj)
      : modelTextOrObj;

  const parsed = ModelOutputSchema.parse(data);
  const { course_info, recurring, one_off } = parsed;

  const tz = (course_info as any).timezone ?? defaultTZ;
  const termStart = DateTime.fromISO(course_info.term_start, { zone: tz });
  const termEnd = DateTime.fromISO(course_info.term_end, { zone: tz });

  const rows: Row[] = [];

  // Add the one off assignments to the rows
  for (const item of one_off) {
    rows.push({
      Course: course_info.course_code,
      Title: item.title,
      Type: "One-Off",
      Week: "",
      DateLocal: item.date_local,
      DueTimeLocal: item.due_time_local,
      DayOfWeek: "",
      Notes: item.notes ?? "",
    });
  }

  // Add the recurring assignments
  for (const r of recurring) {
    const skipWeeks = parseExceptionWeeks(r.exceptions ?? []);

    for (let w = r.start_week; w <= r.end_week; w++) {
      if (skipWeeks.has(w)) continue;

      const base = weekBase(termStart, w);
      const date = dateForWeekday(base, DOW_INDEX[r.day_of_week]);
      if (date < termStart || date > termEnd) continue;

      rows.push({
        Course: course_info.course_code,
        Title: r.title,
        Type: "Recurring",
        Week: String(w),
        DateLocal: date.toFormat("yyyy-LL-dd"),
        DueTimeLocal: r.due_time_local,
        DayOfWeek: r.day_of_week,
        Notes: r.notes ?? "",
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.DateLocal.localeCompare(b.DateLocal) ||
      a.DueTimeLocal.localeCompare(b.DueTimeLocal)
  );

  return { rows, courseInfo: course_info };
}

export function buildSpreadsheetCSV(
  modelTextOrObj: unknown,
  defaultTZ?: string
) {
  const { rows, courseInfo } = buildRowsFromModel(modelTextOrObj, defaultTZ);
  const csv = rowsToCSV(rows);
  return { csv, rows, courseInfo };
}
