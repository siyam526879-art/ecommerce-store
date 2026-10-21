import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ features: [] });
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "EcommerceStore/1.0 address-search",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Photon upstream status:", response.status);

      return NextResponse.json(
        { error: "Address search provider is temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      features: Array.isArray(data.features) ? data.features : [],
    });
  } catch (error) {
    console.error("Address search proxy failed:", error);

    return NextResponse.json(
      { error: "Unable to contact the address search provider." },
      { status: 502 }
    );
  }
}
