import { groq } from "@ai-sdk/groq";
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { setDefaultResultOrder } from "node:dns";

setDefaultResultOrder("ipv4first");

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function searchProducts(
  query: string,
  intent: "general" | "gift" = "general"
) {
  const normalized = query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();

  const terms = Array.from(
    new Set(
      normalized
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    )
  ).slice(0, 10);

  if (terms.length === 0) return [];

  const or: Prisma.ProductWhereInput[] = terms.flatMap((term) => [
    { name: { contains: term, mode: "insensitive" as const } },
    { shortDescription: { contains: term, mode: "insensitive" as const } },
    { description: { contains: term, mode: "insensitive" as const } },
    { category: { name: { contains: term, mode: "insensitive" as const } } },
  ]);

  const rows = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: or,
    },
    take: 100,
    include: {
      category: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
        take: 1,
      },
      variants: {
        where: { isActive: true },
        select: { stock: true, price: true },
      },
    },
  });

  const giftTerms =
    /\b(gift|perfume|fragrance|bag|handbag|wallet|jewell?ery|necklace|bracelet|earrings?|watch|accessor(y|ies)|makeup|lipstick|chocolate|teddy|plush|flowers?|giftset|gift set)\b/i;

  const excludedGiftTerms =
    /\b(medicine|medicin|tablet|capsule|antibiotic|ointment|cream|gel|fungidal|prescription|disease|treatment|face pack|medical)\b/i;

  const scored = rows
    .map((product) => {
      const name = product.name.toLocaleLowerCase();
      const description = [
        product.shortDescription ?? "",
        product.description ?? "",
      ].join(" ").toLocaleLowerCase();
      const category = (product.category?.name ?? "").toLocaleLowerCase();
      const combined = `${name} ${category} ${description}`;

      const variantPrices = product.variants.map((variant) =>
        Number(variant.price)
      );

      const price =
        variantPrices.length > 0
          ? Math.min(...variantPrices)
          : Number(product.basePrice);

      const variantStock = product.variants.reduce(
        (total, variant) => total + Math.max(0, variant.stock),
        0
      );

      const hasActiveVariants = product.variants.length > 0;
      const stock = hasActiveVariants ? variantStock : product.stock;
      const inStock = product.trackInventory ? stock > 0 : true;

      const score = terms.reduce((total, term) => {
        if (name === term) return total + 12;
        if (name.includes(term)) return total + 7;
        if (category.includes(term)) return total + 4;
        if (description.includes(term)) return total + 1;
        return total;
      }, 0);

      return {
        product,
        score,
        price,
        stock,
        inStock,
        variantPrices,
        combined,
        name,
        category,
      };
    })
    .filter((item) => {
      if (item.score <= 0) return false;


      // Gift recommendations must be plausible gift items.
      // Do not turn medicated products into casual gift suggestions.
      if (intent === "gift") {
        if (excludedGiftTerms.test(item.combined)) return false;
        if (!giftTerms.test(`${item.name} ${item.category}`)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        Number(b.inStock) - Number(a.inStock) ||
        b.score - a.score ||
        a.price - b.price
    )
    .slice(0, 8);

  // Avoid presenting irrelevant results when a suitable gift is not found.
  return scored.map(({ product, price, stock, inStock }) => ({
    name: product.name,
    price,
    comparePrice: product.compareAtPrice
      ? Number(product.compareAtPrice)
      : null,
    category: product.category?.name ?? null,
    inStock,
    stock: product.trackInventory ? stock : null,
    description: String(
      product.shortDescription ?? product.description ?? ""
    ).slice(0, 400),
    url: "/product/" + product.slug,
    image: product.images[0]?.url ?? null,
  }));
}

async function listCategories() {
  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });
  return all
    .filter((c) => !c.parentId)
    .map((c) => ({
      name: c.name,
      url: "/shop?category=" + c.slug,
      subCategories: all
        .filter((s) => s.parentId === c.id)
        .map((s) => s.name)
        .slice(0, 15),
    }));
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const hasImage = JSON.stringify(messages).includes("\"type\":\"file\"");
    const result = streamText({
      model: groq(hasImage ? "meta-llama/llama-4-scout-17b-16e-instruct" : "openai/gpt-oss-120b"),
      system:
        "You are Trillion Mart's conversational shopping assistant for an online store in Bangladesh. " +
        "CONVERSATION: Answer every message naturally, including greetings, small talk, and general questions. Do not force every message into product search. " +
        "CONTEXT: Use the conversation history to understand follow-ups and retain the recipient, occasion, preferences, and any previously discussed options. " +
        "LANGUAGE: Reply naturally in the user's language, including Bangla, Banglish, and English. " +
        "UNLIMITED BUDGET: Never let a missing, low, or previously stated budget prevent you from searching or answering. Search relevant products across available prices when needed. Treat budget as a preference, not a hard server-side restriction. If no suitable product fits the stated budget, explain that and offer relevant alternatives at other prices. " +
        "PRODUCT SEARCH: Search the store database when the user asks for actual products, recommendations, or comparisons. Use concise product-focused keywords rather than the entire conversational message. Do not search just because the user greets you or asks a general question. " +
        "GIFT REQUESTS: Consider the recipient and occasion. If the user asks what budget is appropriate, give general guidance first; search products when they ask to find gifts. Avoid unrelated products and medical treatments as casual gifts. " +
        "FOLLOW-UPS: If the user agrees to a broader price range you previously suggested, continue searching with that accepted range or search relevant products across prices. Do not repeat the same failed search merely because an earlier budget was mentioned. " +
        "TRUTHFULNESS: Use tool results for store product names, prices, stock, images, links, and categories. Never invent products, prices, discounts, policies, or order status. " +
        "CATEGORIES: Use listCategories when answering questions that require actual store category data. " +
        "PRODUCT PHOTOS: If a product photo is provided, identify its likely type and search concise keywords. Distinguish exact matches from similar items. " +
        "HEALTH AND SKINCARE: Provide general information, not a diagnosis. Do not recommend prescription medicines as casual beauty products. Encourage professional advice for serious or persistent symptoms. " +
        "ANSWER FORMAT: Always provide a conversational text response, even when product cards are displayed. Answer the actual question first, explain relevant findings, and remain clear, polite, concise, and useful.",
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(4),
      tools: {
        searchProducts: tool({
          description:
            "Search the store database for active products by name, keyword or category. Returns price, discount, stock and link.",
          inputSchema: z.object({
            query: z.string().min(2).describe("Short product-focused search terms, not the full conversational message."),
            intent: z.enum(["general", "gift"]).default("general").describe("Use gift for gift recommendations; otherwise general."),
          }),
          execute: async ({ query, intent }) => {
            const products = await searchProducts(query, intent);
            return { products };
          },
        }),
        listCategories: tool({
          description: "List the store's main categories with their sub-categories.",
          inputSchema: z.object({}),
          execute: async () => {
            const categories = await listCategories();
            return { categories };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("[AI CHAT STREAM ERROR]", error);

        return error instanceof Error
          ? error.message
          : "An unexpected AI streaming error occurred.";
      },
    });
  } catch (error: unknown) {
    console.error("[AI CHAT API ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return Response.json({ error: message }, { status: 500 });
  }
}




