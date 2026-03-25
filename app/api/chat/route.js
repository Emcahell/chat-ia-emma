import { NextResponse } from "next/server";
import { venezuelaContext } from "../../../content/context-venezuela.js";
import { rules } from "../../../content/rules.js";

export const runtime = "edge";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    console.log("Received messages:", messages.length);

    const cleanMessages = messages
      .filter(msg => msg.role && msg.content) 
      .map(msg => ({
        role: msg.role,
        content: msg.content.trim(),
      }));

    console.log("Clean messages:", cleanMessages.length);
    console.log("API Key exists:", !!process.env.GROQ_API_KEY);

    console.log("Making request to Groq...");
    console.log("Request body:", JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: `${venezuelaContext}\n${rules}` },
      ...cleanMessages, ],
      temperature: 1,
      max_completion_tokens: 8192,
      top_p: 1,
      reasoning_effort: "medium",
      stream: true,
      stop: null,
    }, null, 2));
    
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

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de Groq:", errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || "Error externo" }), { status: response.status });
    }

    console.log("Starting streaming...");

    if (!response.body) {
      console.error("No response body from Groq");
      return new Response(JSON.stringify({ error: "No se recibió respuesta de streaming" }), { status: 500 });
    }

    // Handle streaming response
    console.log("Response body exists, creating stream...");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log("Groq stream finished");
                controller.close();
                return;
              }
              
              const chunk = decoder.decode(value, { stream: true });
              console.log("Raw chunk from Groq:", chunk);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  console.log("Received chunk:", data);
                  if (data === '[DONE]') {
                    console.log("Stream finished");
                    controller.close();
                    return;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) {
                      console.log("Content to send:", content);
                      controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                    }
                  } catch (e) {
                    console.error("JSON parse error:", e);
                    // Skip invalid JSON
                  }
                }
              }
            }
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Se escoñetó algo en el servidor" },
      { status: 500 },
    );
  }
}
