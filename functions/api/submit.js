function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestGet({ env }) {
  return json({ ok: Boolean(env.GOOGLE_APPS_SCRIPT_URL) });
}

export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_APPS_SCRIPT_URL) return json({ ok: false, error: "not_configured" }, 503);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 5000) return json({ ok: false, error: "too_large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  let payload;
  if (body.tipo === "visita" && body.consentimento === true) {
    const referrer = request.headers.get("referer");
    let origem = "";
    try { if (referrer) origem = new URL(referrer).hostname.slice(0, 120); } catch {}
    payload = {
      tipo: "visita",
      consentimento: true,
      cidade: request.cf?.city || "",
      regiao: request.cf?.region || "",
      pais: request.cf?.country || "",
      origem: String(body.origem || origem).slice(0, 120),
      pagina: String(body.pagina || "/").slice(0, 120)
    };
  } else if (body.tipo === "sugestao") {
    if (String(body.site || "").trim()) return json({ ok: true });
    payload = { tipo: "sugestao", mensagem: String(body.mensagem || "").slice(0, 3000), site: "" };
  } else {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  try {
    const upstream = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    if (!upstream.ok) return json({ ok: false, error: "upstream_error" }, 502);
    const result = await upstream.json();
    return json({ ok: result.ok === true }, result.ok === true ? 200 : 502);
  } catch {
    return json({ ok: false, error: "upstream_error" }, 502);
  }
}
