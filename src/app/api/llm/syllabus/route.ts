import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { syllabusText } = await req.json();
  //   if (
  //     !syllabusText ||
  //     typeof syllabusText !== "string" ||
  //     syllabusText.length < 20
  //   ) {
  //     return NextResponse.json("Invalid Syllabus");
  //   }

  const prompt = `
You extract assignment schedules from a college syllabus.

Return ONLY valid JSON (no backticks, no commentary) with this shape:
{
  "recurring": [
    {
      "title": "Weekly Quiz",
      "start_week": 2,
      "end_week": 10,
      "day_of_week": "FRI",
      "due_time_local": "23:59",
      "exceptions": ["Week 7"],
      "notes": ""
    }
  ],
  "one_off": [
    { "title": "Midterm", "date_local": "2025-10-31", "due_time_local": "10:00" }
  ],
  "course_info": {
    "course_code": "CODE",
    "term_start": "TERM_START",
    "term_end": "TERM_END",
    "timezone": "TZ"
  }
}

Rules:
- Capture repeating patterns (e.g., "every Friday 11:59pm weeks 2–10") in "recurring".
- Put exact dates (midterm/final/project) in "one_off".
- Use 24h local time HH:MM; if no time is given, default to "23:59".
- Use "Week N" in exceptions if a week is skipped.
- No prose—JSON only.

Syllabus:
"""
${syllabusText}
"""

  `.trim();

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  if (!response.text) {
    return NextResponse.json(
      { error: "Empty model response" },
      { status: 502 }
    );
  }
  return NextResponse.json(response.text);
}
