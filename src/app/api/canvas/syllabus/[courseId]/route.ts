import { NextResponse } from "next/server";
import { canvasFetch } from "@/lib/canvas";
import * as cheerio from "cheerio";

export async function GET(
  _: Request,
  { params }: { params: { courseId: string } }
) {
  const course = await canvasFetch<any>(
    `/api/v1/courses/${params.courseId}?include[]=syllabus_body`
  );
  let html = course?.syllabus_body || "";

  // If no syllabus, use front page
  if (!html) {
    try {
      const page = await canvasFetch<any>(
        `/api/v1/courses/${params.courseId}/front_page`
      );
      html = page?.body || "";
    } catch (_) {}
  }

  if (!html) return NextResponse.json({ text: "" });

  console.log(html);
  const $ = cheerio.load(html);
  const text = $.text().replace(/\s+\n/g, "\n").trim();
  return NextResponse.json({ text });
}
