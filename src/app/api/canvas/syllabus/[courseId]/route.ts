import { NextResponse } from "next/server";
import { canvasFetch } from "@/lib/canvas";
import * as cheerio from "cheerio";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const course = await canvasFetch<any>(
    `/api/v1/courses/${courseId}?include[]=syllabus_body`
  );

  let html = course?.syllabus_body || "";

  // If no syllabus, use front page
  if (!html) {
    try {
      const page = await canvasFetch<any>(
        `/api/v1/courses/${courseId}/front_page`
      );
      html = page?.body || "";
    } catch (_) {}
  }

  if (!html) return NextResponse.json({ text: "" });

  console.log(html);
  const $ = cheerio.load(html);
  const text = $.text().replace(/\s+\n/g, "\n").trim();

  try {
    // Build absolute URL using request origin
    const url = new URL("/api/llm/syllabus", request.url);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syllabusText: text }),
    });

    if (!resp.ok) {
      throw new Error(`Failed to get syllabus summary: ${resp.status}`);
    }

    const syllabus_summary = await resp.json();
    return NextResponse.json({ syllabus_summary });
  } catch (error) {
    console.error("Error processing syllabus:", error);
    return NextResponse.json(
      { error: "Failed to process syllabus" },
      { status: 500 }
    );
  }
}
