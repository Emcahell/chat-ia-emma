"use client";
import { useState, useEffect, useRef } from "react";

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
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // Max height of 120px
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };

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
      textareaRef.current.style.height = 'auto';
    }

    // sliding window
    const messagesForApi = messages.slice(-API_WINDOW_SIZE);

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [...messagesForApi, userMsg] }),
    });

    const data = await res.json();

    // Update messages with AI response
    setMessages((prev) => {
      const newMessages = [...prev, data];
      return newMessages.slice(-MAX_MESSAGES);
    });

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-2 md:p-4 font-sans">
      <header className="py-4">
        <h1 className="text-md md:text-xl font-bold text-blue-400">
          Chat Emma <span className="text-gray-400">|</span>{" "}
          <span className="text-sm md:text-xl">
            Tu pana de Inteligencia Artificial 🇻🇪
          </span>
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto my-4 space-y-4">
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
                className={`max-w-xs px-4 py-2 rounded-lg ${msg.role === "user" ? "bg-blue-500/50 text-white" : "bg-gray-900 text-white"}`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-xs px-4 py-2 rounded-lg text-white">
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 border-blue-400 resize-none overflow-hidden min-h-10 max-h-30"
          placeholder="Escribe tu mensaje..."
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-6 py-4 bg-blue-500/50 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:opacity-50">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z" />
            <path d="M6.5 12h14.5" />
          </svg>
        </button>
      </div>
      <div className="text-[10px] text-gray-500 text-center mt-2">
        La información proporcionada por la IA puede cometer errores. Verifica siempre los datos importantes | Información actualizada hasta 2023
      </div>
    </div>
  );
}
