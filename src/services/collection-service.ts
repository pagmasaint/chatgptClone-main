export interface CollectionItem {
  id: string;
  name: string;
  // Add other fields returned by your backend if necessary
}

export async function fetchCollectionsFromApi(): Promise<CollectionItem[]> {
  try {
    // First try the real backend endpoint
    const res = await fetch('/api/collections');
    if (!res.ok) {
      throw new Error(`Failed to fetch collections: ${res.status}`);
    }

    // Try to parse JSON. Some dev backends or proxies may return HTML for unknown routes
    // (e.g. index.html). Attempt res.json() and fall back silently to demo file if parsing fails.
    try {
      const data = await res.json();
      return data as CollectionItem[];
    } catch (parseErr) {
      // If parsing fails (often because the server returned HTML like index.html),
      // silently fall back to the demo file so dev console doesn't show a noisy error.
      console.info('Collections endpoint returned non-JSON response; falling back to demo file.');
      try {
        const demoRes = await fetch('/demo-collections.json');
        if (!demoRes.ok) throw new Error(`Failed to load demo collections: ${demoRes.status}`);
        const demoData = await demoRes.json();
        return demoData as CollectionItem[];
      } catch (demoErr) {
        // If demo fallback also fails, rethrow original parse error so outer catch handles it
        console.error('Failed to load demo collections in parseErr handler:', demoErr);
        throw parseErr;
      }
    }
  } catch (err) {
    // If fetching/parsing failed, return empty array (no collections).
    // Keep log level low because absence of backend is normal in dev.
    console.info('Collections endpoint unavailable or returned non-JSON; treating as no collections.');
    return [];
  }
}
