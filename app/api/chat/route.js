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
          model: "openai/gpt-oss-120b",
          messages: [{ role: "system", content: `${venezuelaContext}\n${rules}` },
          ...cleanMessages, ],
          temperature: 1,
          max_completion_tokens: 8192,
          top_p: 1,
          reasoning_effort: "medium",
          stream: true,
          stop: null,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de Groq:", errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || "Error externo" }), { status: response.status });
    }

    if (!response.body) {
      console.error("No response body from Groq");
      return new Response(JSON.stringify({ error: "No se recibió respuesta de streaming" }), { status: 500 });
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            writer.close();
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Split by newlines but handle incomplete JSON
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep last last incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                writer.close();
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  await writer.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        console.error("Streaming error:", error);
        writer.abort(error);
      } finally {
        reader.releaseLock();
      }
    })();
    
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Se escoñetó algo en el servidor" },
      { status: 500 },
    );
  }
}
