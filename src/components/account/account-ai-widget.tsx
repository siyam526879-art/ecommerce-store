"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, MessageCircle, Send, X, ShoppingBag } from "lucide-react";

const transport = new DefaultChatTransport({ api: "/api/chat" });
const TAKA = "\u09F3";

type AssistantProduct = {
  name: string;
  price: number;
  comparePrice?: number | null;
  category?: string | null;
  inStock?: boolean | null;
  stock?: number | null;
  description?: string;
  url: string;
  image?: string | null;
};

export default function AccountAIWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const listRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, status, open]);

  useEffect(() => {
    if (sessionEnded || messages.length === 0) return;

    const timeoutMs = 5 * 60 * 1000;
    const remaining = timeoutMs - (Date.now() - lastActivity);

    if (remaining <= 0) {
      setSessionEnded(true);
      return;
    }

    const timer = window.setTimeout(() => setSessionEnded(true), remaining);
    return () => window.clearTimeout(timer);
  }, [sessionEnded, messages.length, lastActivity]);

  if (pathname !== "/account") return null;

  function submitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();

    if (!text || busy || sessionEnded) return;

    setLastActivity(Date.now());
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="relative mt-6 ml-auto flex flex-col items-end">
      {open && (
        <section
          className="absolute bottom-[62px] right-0 z-50 flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          aria-label="Trillion Mart AI Assistant"
        >
          <header className="flex items-center gap-3 bg-[#f85606] px-4 py-3 text-white">
            <div className="rounded-full bg-white/20 p-2">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Trillion Mart Assistant</p>
              <p className="text-xs text-white/90">Shopping help, powered by AI</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
            {messages.length === 0 && (
              <div className="rounded-xl border bg-white p-3 text-sm leading-relaxed text-gray-700">
                Hello! Welcome to Trillion Mart. Ask about products, prices, stock,
                gift ideas, or what to buy for a special occasion.
              </div>
            )}

            {messages.map((message) => {
              const parts = (message.parts ?? []) as any[];

              const text = parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("");

              const productTools = parts.filter(
                (part) =>
                  part.type === "tool-searchProducts" &&
                  part.state === "output-available"
              );

              const isUser = message.role === "user";

              if (!text && productTools.length === 0) return null;

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[96%] min-w-0 space-y-2">
                    {text && (
                      <div
                        className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isUser
                            ? "rounded-br-sm bg-[#f85606] text-white"
                            : "rounded-bl-sm border border-gray-200 bg-white text-gray-800"
                        }`}
                      >
                        {text}
                      </div>
                    )}

                    {productTools.map((toolPart, index) => {
                      const output = toolPart.output;
                      const products: AssistantProduct[] = Array.isArray(output?.products)
                        ? output.products
                        : [];

                      if (products.length === 0) return null;

                      return (
                        <div key={toolPart.toolCallId ?? index} className="space-y-2">
                          {products.map((product) => (
                            <article
                              key={product.url}
                              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                            >
                              <div className="flex gap-3 p-3">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                  {product.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      <ShoppingBag className="h-7 w-7 text-gray-400" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  {product.category && (
                                    <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                                      {product.category}
                                    </p>
                                  )}

                                  <p className="break-words text-sm font-semibold text-gray-900">
                                    {product.name}
                                  </p>

                                  <p className="mt-1 text-sm font-bold text-[#f85606]">
                                    {TAKA} {Number(product.price).toLocaleString("en-BD")}
                                  </p>

                                  {product.inStock === false && (
                                    <p className="mt-1 text-xs font-semibold text-red-600">
                                      Out of stock
                                    </p>
                                  )}

                                  {product.inStock === true && (
                                    <p className="mt-1 text-xs text-green-700">
                                      In stock
                                    </p>
                                  )}
                                </div>
                              </div>

                              <Link
                                href={product.url}
                                className="block border-t border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs font-bold text-[#f85606] hover:bg-orange-50"
                              >
                                View product →
                              </Link>
                            </article>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="w-fit animate-pulse rounded-xl border bg-white px-3 py-2 text-xs text-gray-500">
                Assistant is typing...
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
                Could not connect to the assistant. Please try again.
              </p>
            )}
          </div>

          {sessionEnded ? (
            <div className="border-t bg-white p-4 text-center">
              <p className="mb-2 text-sm font-semibold text-gray-800">
                This chat session has ended due to inactivity.
              </p>
              <p className="mb-3 text-xs text-gray-500">
                Start a new session to begin a fresh conversation.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setInput("");
                  setSessionEnded(false);
                  setLastActivity(Date.now());
                }}
                className="rounded-full bg-[#f85606] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df4c04]"
              >
                Start New Session
              </button>
            </div>
          ) : (
            <form onSubmit={submitMessage} className="flex items-center gap-2 border-t bg-white p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a product or gift..."
                aria-label="Message to AI Assistant"
                className="min-w-0 flex-1 rounded-full border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#f85606]"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f85606] text-white hover:bg-[#df4c04] disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f85606] text-white shadow-lg transition hover:scale-105 hover:bg-[#df4c04]"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {!open && (
        <span className="mt-1 text-xs font-medium text-gray-600">
          Ask AI Assistant
        </span>
      )}
    </div>
  );
}
