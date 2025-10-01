import { NextResponse } from "next/server";
import { canvasFetch } from "@/lib/canvas";

/**
 *
 * @returns The user's courses
 */
export async function GET() {
  const courses = await canvasFetch<any[]>(
    "/api/v1/courses?enrollment_state=active"
  );

  const slim = courses.map((c) => ({
    id: c.id,
    name: c.name,
    course_code: c.course_code,
    term: c.term?.name ?? null,
  }));

  return NextResponse.json(slim);
}
