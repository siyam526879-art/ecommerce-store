"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, X, Volume2, Bot, AlertCircle, Send, PackageSearch, Truck, RotateCcw, CreditCard, LayoutGrid, ImagePlus } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";

const transport = new DefaultChatTransport({ api: "/api/chat" });
const TAKA = "\u09F3";

const QUICK = [
  { label: "Order Information", text: "How can I check my order status?", icon: PackageSearch },
  { label: "Delivery", text: "How long does delivery take?", icon: Truck },
  { label: "Returns", text: "What is your return policy?", icon: RotateCcw },
  { label: "Payment", text: "Which payment methods do you accept?", icon: CreditCard },
  { label: "Categories", text: "Show me your categories", icon: LayoutGrid },
  { label: "বাংলায় চ্যাট করুন", text: "আমি বাংলায় কথা বলতে চাই", icon: Bot },
];

function resizeToDataUrl(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Could not read the photo"));
    img.src = url;
  });
}

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
      )}
    </p>
  );
}

export default function CustomerCareChat() {
  const [input, setInput] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [top, setTop] = useState(0);
  const [notice, setNotice] = useState(true);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = document.querySelector("header") as HTMLElement | null;
    const measure = () => setTop(header ? header.offsetHeight : 0);
    measure();
    window.addEventListener("resize", measure);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const footer = document.querySelector("footer") as HTMLElement | null;
    const prevDisplay = footer?.style.display ?? "";
    if (footer) footer.style.display = "none";
    return () => {
      window.removeEventListener("resize", measure);
      document.body.style.overflow = prev;
      if (footer) footer.style.display = prevDisplay;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const pick = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose a photo");
    try {
      setPhoto(await resizeToDataUrl(f));
    } catch (e: any) {
      toast.error(e?.message || "Could not read the photo");
    }
  };

  const send = (text: string, withPhoto?: string | null) => {
    const t = text.trim();
    if ((!t && !withPhoto) || isLoading) return;
    if (withPhoto) {
      sendMessage({
        text: t || "Do you have this product, or something similar?",
        files: [{ type: "file", mediaType: "image/jpeg", url: withPhoto }],
      });
    } else {
      sendMessage({ text: t });
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send(input, photo);
    setInput("");
    setPhoto(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col bg-[#f5f5f5] font-sans" style={{ top }}>
      <div className="shrink-0 bg-white shadow-sm">
        <div className="flex items-center border-b p-3">
          <Link href="/help-center" className="rounded-full p-2 hover:bg-gray-100" aria-label="Back">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="rounded-full bg-[#f85606] p-1.5">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Trillion Mart Assistant</span>
          </div>
        </div>
        {notice && (
          <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-[#f85606]">
              <Volume2 className="h-4 w-4" />
              <span>Refund Delay Notice</span>
            </div>
            <button type="button" onClick={() => setNotice(false)} aria-label="Close notice">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !error && (
          <div className="max-w-[90%] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:max-w-[70%]">
            <div className="bg-gradient-to-r from-[#f85606] to-[#ff9000] p-5 text-white">
              <p className="text-2xl font-black italic">Welcome!</p>
              <p className="text-sm opacity-95">Ask a question, or send a photo of a product to find it in our store.</p>
            </div>
            <div className="p-4">
              <p className="mb-1 text-[15px] text-gray-800">Hello Customer! Welcome to Trillion Mart!</p>
              <p className="text-[15px] text-gray-800">
                I am the <strong>Trillion Mart Assistant</strong>, your virtual assistant. How can I help you today?
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const parts = (m.parts ?? []) as any[];
          const text = parts.filter((p) => p.type === "text").map((p) => p.text).join("");
          const files = parts.filter((p) => p.type === "file" && String(p.mediaType).startsWith("image/"));
          const tools = parts.filter((p) => p.type === "tool-searchProducts" && p.state === "output-available");
          const isUser = m.role === "user";
          if (!text && tools.length === 0 && files.length === 0) return null;
          return (
            <div key={m.id} className={"flex " + (isUser ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[85%] rounded-lg border p-4 shadow-sm " +
                  (isUser ? "border-[#f85606] bg-[#f85606] text-white" : "border-gray-200 bg-white text-gray-800")
                }
              >
                {files.map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={f.url} alt="Your photo" className="mb-2 max-h-56 rounded" />
                ))}
                {text && <Rich text={text} />}
                {tools.map((t) => {
                  const seen = new Set<string>();
                  const products = (t.output?.products ?? []).filter((p: any) => {
                    if (seen.has(p.url)) return false;
                    seen.add(p.url);
                    return true;
                  });
                  if (products.length === 0) return null;
                  return (
                    <div key={t.toolCallId} className="mt-3 space-y-2">
                      {products.map((p: any) => (
                        <div key={p.url} className="flex gap-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-white">
                            {p.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-gray-400">No photo</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="line-clamp-2 block font-bold">{p.name}</span>
                            <span className="font-bold text-[#f85606]">
                              {TAKA} {p.price}
                            </span>
                            {p.inStock === false && <span className="ml-2 text-xs font-semibold text-red-600">Stock out</span>}
                            <Link
                              href={p.url}
                              className="mt-1.5 block w-fit rounded bg-[#f85606] px-3 py-1 text-xs font-bold text-white hover:bg-[#d94b05]"
                            >
                              View product
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="my-4 flex justify-center">
            <div className="flex max-w-[90%] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>Could not connect to the assistant. Please try again.</p>
            </div>
          </div>
        )}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="animate-pulse rounded-lg border bg-white p-3 text-sm text-gray-500">Trillion Mart Assistant is typing...</div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-white">
        <div className="flex gap-2 overflow-x-auto px-3 pt-3">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={isLoading}
              onClick={() => send(q.text)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-gray-700 hover:border-[#f85606] hover:text-[#f85606] disabled:opacity-50"
            >
              <q.icon className="h-4 w-4" /> {q.label}
            </button>
          ))}
        </div>

        {photo && (
          <div className="flex items-center gap-3 px-3 pt-3">
            <div className="relative h-16 w-16 overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Selected" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhoto(null)} className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5" aria-label="Remove photo">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Press Send to find this product in our store.</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-2 p-3">
          <label className="cursor-pointer rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-[#f85606]" title="Send a product photo">
            <ImagePlus className="h-6 w-6" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <input
            type="text"
            placeholder="Please type your message here..."
            className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-800 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={
              "flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors " +
              (isLoading ? "cursor-not-allowed bg-gray-400" : "bg-[#f85606] hover:bg-[#e04e05]")
            }
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}