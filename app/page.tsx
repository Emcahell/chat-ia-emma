"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const STORAGE_KEY = "chat-emma-messages";
const MAX_MESSAGES = 30;
const API_WINDOW_SIZE = 7;

export default function ChatVenezuela() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && mounted) {
        const parsedMessages = JSON.parse(stored);
        setTimeout(() => {
          if (mounted) {
            setMessages(parsedMessages.slice(-MAX_MESSAGES));
          }
        }, 0);
      }
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Error saving messages to localStorage:", error);
      }
    }
  }, [messages]);

  // Auto scroll to bottom when messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // Max height of 120px
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input.trim() };

    // Update messages with localStorage persistence
    setMessages((prev) => {
      const newMessages = [...prev, userMsg];
      // Keep only last MAX_MESSAGES
      return newMessages.slice(-MAX_MESSAGES);
    });

    setInput("");
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Create updated copy for API (includes the new message)
    const updatedMessages = [...messages, userMsg];

    // Filter messages for API (only valid ones)
    const filteredMessages = updatedMessages
      .filter((msg) => msg.role && msg.content && msg.content.trim())
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }));

    // sliding window with filtered messages
    const messagesForApi = filteredMessages.slice(-API_WINDOW_SIZE);

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: messagesForApi }),
    });

    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      console.error("Error en la respuesta:", await res.text());
      setLoading(false);
      return;
    }

    // Handle streaming response
    if (res.body) {
      console.log("Starting to read stream...");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: "assistant", content: "" };
      
      // Add empty assistant message first
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        return newMessages.slice(-MAX_MESSAGES);
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream reading completed");
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          console.log("Received chunk:", chunk);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              console.log("Processing data:", data);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.content || '';
                if (content) {
                  assistantMessage.content += content;
                  console.log("Updated content:", assistantMessage.content);
                  
                  // Update the last message (assistant message)
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMessage };
                    return updated;
                  });
                }
              } catch (e) {
                console.error("JSON parse error:", e);
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        console.error("Error en streaming:", error);
      } finally {
        reader.releaseLock();
      }
    } else {
      console.log("No response body received");
      const data = await res.json();
      console.error("Respuesta inválida de la API:", data);
    }

    setLoading(false);
  };

  return (
    <div className="relative flex flex-col max-w-2xl mx-auto mt-16 mb-24 p-2 md:p-4 font-sans">
      <header className="fixed top-0 left-0 right-0 py-4 bg-background">
        <h1 className="text-md md:text-xl px-2 font-bold text-blue-400">
          Chat Emma <span className="text-gray-400">|</span>{" "}
          <span className="text-sm md:text-xl">
            Tu pana de Inteligencia Artificial 🇻🇪
          </span>
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">¡Épale! Aún no hay mensajes</p>
              <p className="text-sm">
                Escribe algo para empezar el chat, mi pana.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${msg.role === "user" ? "bg-blue-500 dark:bg-blue-500/50 text-white" : "bg-gray-900 text-white"}`}>
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    components={{
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      p: ({ children }) => <p className="mb-1">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      code: ({ children }) => <code className="bg-gray-800 px-1 rounded text-sm">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-600 pl-2 italic">{children}</blockquote>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-xs px-4 py-2 rounded-lg text-gray-600 dark:text-white animate-pulse">
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <article className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background p-2">
        <div className="flex gap-2 px-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            className="flex-1 px-4 py-2 text-white border rounded-lg focus:outline-none border-none bg-gray-900 resize-none overflow-hidden min-h-10 max-h-30"
            placeholder="Escribe tu mensaje..."
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:opacity-50">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z" />
              <path d="M6.5 12h14.5" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-gray-500 text-center mt-2">
          Pendiente mano, la información proporcionada por la IA puede ser erronea. Verifica siempre los datos importantes | Información actualizada hasta 2024
        </div>
      </article>
    </div>
  );
}
