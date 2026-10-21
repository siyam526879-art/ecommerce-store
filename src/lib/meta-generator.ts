const SITE = "Trilon Mart";
const MAX_TITLE = 60;
const MAX_DESC = 155;

export interface GeneratedMeta {
  metaTitle: string;
  metaDescription: string;
}

export function generateMeta(
  productName: string,
  categoryName: string,
  shortDescription?: string | null
): GeneratedMeta {
  const name = (productName || "Product").trim();
  const cat = (categoryName || "").trim();

  let metaTitle = cat ? name + " - " + cat + " | " + SITE : name + " | " + SITE;
  if (metaTitle.length > MAX_TITLE) {
    metaTitle = metaTitle.slice(0, MAX_TITLE - 3).trim() + "...";
  }

  let metaDescription: string;
  if (shortDescription && shortDescription.trim().length > 20) {
    metaDescription = shortDescription.trim();
  } else {
    metaDescription =
      "Buy " + name + " online at best price in Bangladesh. " +
      "Cash on Delivery available. Fast shipping across the country. " +
      "Order now from " + SITE + ".";
  }
  if (metaDescription.length > MAX_DESC) {
    metaDescription = metaDescription.slice(0, MAX_DESC - 3).trim() + "...";
  }

  return { metaTitle, metaDescription };
}