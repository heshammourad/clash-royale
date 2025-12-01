const CLASH_API_URL = "https://proxy.royaleapi.dev/v1";

export async function fetchCardImages(): Promise<Record<string, string>> {
  const token = process.env.CLASH_ROYALE_API_TOKEN;
  
  if (!token) {
    console.warn("CLASH_ROYALE_API_TOKEN is missing in .env.local");
    return {};
  }

  try {
    const res = await fetch(`${CLASH_API_URL}/cards`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Cache for 24 hours
      next: { revalidate: 86400 }, 
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch cards: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const imageMap: Record<string, string> = {};
    
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((card: any) => {
        // 1. Standard Image
        if (card.name && card.iconUrls?.medium) {
          imageMap[card.name] = card.iconUrls.medium;
        }

        // 2. Evolution Image (if available)
        // We map this to "CardName (Evo)" to match the logic we will add in the Grid
        if (card.name && card.iconUrls?.evolutionMedium) {
          imageMap[`${card.name} (Evo)`] = card.iconUrls.evolutionMedium;
        }
      });
    }

    return imageMap;
  } catch (error) {
    console.error("Error fetching card images:", error);
    return {};
  }
}