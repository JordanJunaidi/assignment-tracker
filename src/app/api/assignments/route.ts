import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// POST body validation
const createAssignmentSchema = z.object({
  title: z.string().min(1, "title is required"),
  dueAt: z.iso.datetime(),
  allDay: z.boolean().optional().default(true),
});

export async function GET() {
    try {
        const items = await prisma.assignment.findMany({
            orderBy: { createdAt: "desc" },
        })
    }
}