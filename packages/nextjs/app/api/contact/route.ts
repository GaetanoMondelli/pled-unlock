import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const db = getFirestore();
    const now = new Date();

    await db.collection("contactRequests").add({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: typeof message === "string" ? message.trim() : "",
      createdAt: now.toISOString(),
      userAgent: req.headers.get("user-agent") || null,
      ip: req.headers.get("x-forwarded-for") || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("/api/contact error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
