const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function categoryCode(name: string): string {
  const letters = (name || "GEN").replace(/[^A-Za-z]/g, "").toUpperCase();
  return letters.slice(0, 3).padEnd(3, "X");
}

export async function generateUniqueSku(
  categoryName: string,
  exists: (sku: string) => Promise<boolean>
): Promise<string> {
  const cat = categoryCode(categoryName);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = cat + "-" + randomCode(6);
    const taken = await exists(candidate);
    if (!taken) return candidate;
  }
  return cat + "-" + Date.now().toString(36).toUpperCase().slice(-6);
}