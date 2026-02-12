import { NextResponse } from "next/server";
import { venezuelaContext } from "../../../content/context-venezuela.js";
import { rules } from "../../../content/rules.js";

export const runtime = "edge";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const cleanMessages = messages
      .filter(msg => msg.role && msg.content) 
      .map(msg => ({
        role: msg.role,
        content: msg.content.trim(),
      }));

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "system", content: `${venezuelaContext}\n${rules}` },
          ...cleanMessages, ],
          temperature: 1,
          max_tokens: 1024,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Groq:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "Error externo" }), { status: response.status });
    }

    return new Response(JSON.stringify(data.choices[0].message), { status: 200 });

    return NextResponse.json(data.choices[0].message);
  } catch (error) {
    return NextResponse.json(
      { error: "Se escoñetó algo en el servidor" },
      { status: 500 },
    );
  }
}
