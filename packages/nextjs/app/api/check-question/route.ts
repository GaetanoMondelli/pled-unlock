import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helper that determines if a given text is a question. Respond with 'true' or 'false' only.",
        },
        {
          role: "user",
          content: `Is this text a question? Text: "${text}"`,
        },
      ],
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.toLowerCase();
    return NextResponse.json({ isQuestion: result === "true" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to check question" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Simple health check to verify the API and OpenAI connection
    await openai.models.list();
    return NextResponse.json({
      status: "ok",
      message: "Question checking service is running",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Service is running but OpenAI connection failed",
      },
      {
        status: 500,
      },
    );
  }
}
