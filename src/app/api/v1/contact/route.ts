import { NextRequest } from "next/server";
import { success, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = contactSchema.parse(await request.json());
    // In production: send via Resend, log to DB, etc.
    console.log("Contact form submission:", body);
    return success({ message: "Message received. We'll respond within 24 hours." });
  } catch (err) {
    return errorResponse(err);
  }
}