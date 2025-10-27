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
    ];
  }
}
