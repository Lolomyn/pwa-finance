/**
 * Telegram Bot API relay for a network where api.telegram.org is blocked.
 *
 * Deploy (free, no card):
 *   1. https://dash.cloudflare.com → sign up / log in
 *   2. Workers & Pages → Create → Workers → Create Worker
 *   3. Name: tg-relay → Deploy
 *   4. "Edit code" → replace everything with this file → Deploy
 *   5. Copy the URL shown, e.g. https://tg-relay.<your-subdomain>.workers.dev
 *
 * Then on the server:
 *   TELEGRAM_API_ROOT=https://tg-relay.<your-subdomain>.workers.dev
 *
 * Requests are forwarded 1:1: /bot<TOKEN>/getMe → https://api.telegram.org/bot<TOKEN>/getMe
 * File downloads (/file/bot<TOKEN>/<path>) work the same way.
 */

const UPSTREAM = "https://api.telegram.org";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "") {
      return new Response("telegram relay ok\n", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const target = UPSTREAM + url.pathname + url.search;

    const headers = new Headers();
    const contentType = request.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);

    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    let upstream;
    try {
      upstream = await fetch(target, {
        method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: "manual",
        // Telegram responses must not be cached anywhere between us and the client
        cf: { cacheEverything: false },
      });
    } catch (err) {
      return new Response(`relay error: ${err && err.message ? err.message : err}`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const out = new Headers();
    for (const [k, v] of upstream.headers) {
      if (k.toLowerCase() === "content-encoding" || k.toLowerCase() === "content-length") continue;
      out.set(k, v);
    }
    out.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
