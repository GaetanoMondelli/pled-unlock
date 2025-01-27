import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helper that determines if a given text is a question. Respond with 'true' or 'false' only."
        },
        {
          role: "user",
          content: `Is this text a question? Text: "${text}"`
        }
      ],
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.toLowerCase();
    return res.status(200).json({ isQuestion: result === 'true' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to check question' });
  }
} 