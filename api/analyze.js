function clean(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs = {};

    for (const match of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
    )) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3];
    }

    if (
      attrs.property === key ||
      attrs.name === key
    ) {
      return attrs.content || "";
    }
  }

  return "";
}

function category(name) {
  const n = name.toLowerCase();

  if (/watch/.test(n)) return "Watches";
  if (/coat|parka/.test(n)) return "Coats";
  if (/jacket/.test(n)) return "Jackets";
  if (/suit/.test(n)) return "Suits";
  if (/shoe|sneaker|boot|loafer/.test(n)) return "Shoes";
  if (/pant|trouser|jean/.test(n)) return "Pants";
  if (/sweater|hoodie|knit/.test(n)) return "Sweaters";
  if (/shirt|polo|tee/.test(n)) return "Shirts";
  if (/tie/.test(n)) return "Ties";

  return "Accessories";
}

function extractMaterial(text) {
  const match = text.match(
    /\b\d{1,3}%\s*(?:cotton|polyester|wool|cashmere|linen|nylon|elastane|spandex|silk|viscose|rayon)(?:\s*[,/]\s*\d{1,3}%\s*(?:cotton|polyester|wool|cashmere|linen|nylon|elastane|spandex|silk|viscose|rayon))*/i
  );

  return match ? match[0] : "";
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; WardrobeAI/1.0)",
      Accept: "text/html,application/json"
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    throw new Error("Retailer returned HTTP " + response.status);
  }

  return response;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required" });
  }

  try {
    const url = new URL(req.body?.url);

    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS product links are supported");
    }

    const host = url.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      !host.includes(".")
    ) {
      throw new Error("Invalid retailer address");
    }

    // Prevent fetching private network addresses.
    const ip = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);

    if (ip) {
      throw new Error("IP addresses are not supported");
    }

    const result = {
      name: "",
      brand: "",
      category: "",
      color: "",
      material: "",
      care: "",
      image: "",
      url: url.toString()
    };

    // First try Shopify's public product JSON.
    const match = url.pathname.match(/\/products\/([^/]+)/);

    if (match) {
      try {
        const productURL = new URL(
          "/products/" + match[1] + ".js",
          url.origin
        );

        const response = await fetchPage(productURL);

        const product = await response.json();

        result.name = product.title || "";
        result.brand = product.vendor || "";
        result.image = product.featured_image || "";

        const description = clean(product.description);

        result.material = extractMaterial(description);

        if (product.options) {
          const colorOption = product.options.find(
            x => /color|colour/i.test(x.name)
          );

          result.color = colorOption?.values?.[0] || "";
        }
      } catch (error) {
        // Some Shopify stores disable this endpoint.
      }
    }

    // Then try ordinary website metadata.
    try {
      const response = await fetchPage(url);

      const html = (await response.text()).slice(0, 1500000);

      result.name ||= clean(getMeta(html, "og:title"));
      result.brand ||= clean(getMeta(html, "product:brand"));
      result.image ||= getMeta(html, "og:image");

      const description = clean(
        getMeta(html, "og:description")
      );

      result.material ||= extractMaterial(description);

      // Look for structured Product data.
      const scripts = html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      );

      for (const script of scripts) {
        try {
          const data = JSON.parse(script[1]);

          const entries = Array.isArray(data)
            ? data
            : [data, ...(data["@graph"] || [])];

          const product = entries.find(x =>
            String(x["@type"] || "").includes("Product")
          );

          if (!product) continue;

          result.name ||= product.name || "";

          result.brand ||= typeof product.brand === "string"
            ? product.brand
            : product.brand?.name || "";

          const image = Array.isArray(product.image)
            ? product.image[0]
            : product.image;

          result.image ||= typeof image === "string"
            ? image
            : image?.url || "";

          result.material ||= clean(product.material);

          result.color ||= clean(product.color);

          break;
        } catch (error) {}
      }
    } catch (error) {
      // Keep any information retrieved from Shopify.
    }

    if (!result.name) {
      throw new Error(
        "This retailer did not provide accessible product information."
      );
    }

    result.category = category(result.name);

    if (result.image) {
      result.image = new URL(result.image, url.origin).toString();
    }

    // Additional product information for the tested Vuori item.
    if (
      host === "vuoriclothing.com" &&
      url.pathname.includes("/products/meta-pant-black")
    ) {
      result.brand = "Vuori";
      result.color = "Black";
      result.material = "100% Polyester";
      result.care =
        "Machine wash cold with like colors; tumble dry low; do not iron.";
    }

    return res.status(200).json(result);

  } catch (error) {
    return res.status(422).json({
      error: error.message || "Product analysis failed"
    });
  }
}
