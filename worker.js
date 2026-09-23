// ============================================================
//  Cloudflare Worker — NeonPy Proxy
//  URL: https://emoji.telegramlogin.workers.dev
// ============================================================

// ⬇⬇⬇ EDIT HERE ⬇⬇⬇
const BACKEND_URL = "http://olivia.hidencloud.com:24592";
// ⬆⬆⬆ EDIT HERE ⬆⬆⬆


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // ───── API → backend forward ─────
    if (url.pathname.startsWith("/api/")) {
      const target = BACKEND_URL.replace(/\/$/, "") + url.pathname + url.search;

      const modifiedRequest = new Request(target, {
        method: request.method,
        headers: {
          "Content-Type": request.headers.get("Content-Type") || "application/json",
          "Accept": "application/json",
        },
        body: (request.method === "POST" || request.method === "PUT" || request.method === "DELETE")
          ? await request.text()
          : undefined,
        redirect: "follow",
      });

      try {
        const response = await fetch(modifiedRequest);
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Access-Control-Allow-Origin", "*");
        newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        newHeaders.set("Access-Control-Allow-Headers", "*");
        newHeaders.delete("Content-Security-Policy");
        newHeaders.delete("X-Frame-Options");

        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: "Backend unreachable",
            detail: err.message,
            backend: BACKEND_URL,
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // ───── Static assets ─────
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("NeonPy Worker running.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};
