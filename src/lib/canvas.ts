export async function canvasFetch<T>(path: string, init: RequestInit = {}) {
  const base = process.env.CANVAS_BASE_URL;
  const token = process.env.CANVAS_TOKEN;
  if (!base || !token)
    throw new Error("Missing Canvas Base URL or Canvas Acces Token");

  // Fetch function
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Canvas ${res.status} ${res.statusText}: ${text.slice(0, 200)}`
    );
  }

  return res.json() as Promise<T>;
}
