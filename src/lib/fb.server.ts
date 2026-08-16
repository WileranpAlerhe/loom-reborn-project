/* Facebook Conversions API helpers (server-only) */

export interface FbSettings {
  ga4_id: string | null;
  pixel_id: string | null;
  access_token: string | null;
  test_event_code: string | null;
  admin_password_hash: string | null;
  webhook_token: string | null;
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Normalização Meta: trim, lowercase, colapso de espaços. */
function normText(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  return v || undefined;
}

async function hashNorm(value?: string | null): Promise<string | undefined> {
  const v = normText(value);
  if (!v) return undefined;
  return sha256(v);
}

/** Telefone: somente dígitos, com DDI do Brasil quando ausente. */
export function normPhone(value?: string | null): string | undefined {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length < 10) return undefined;
  return d.length <= 11 ? "55" + d : d;
}

/** Constrói _fbc no formato oficial quando só existe fbclid. */
export function buildFbc(fbclid?: string | null, ts?: number): string | undefined {
  const id = (fbclid ?? "").trim();
  if (!id) return undefined;
  return `fb.1.${ts ?? Date.now()}.${id}`;
}

export async function getAdmin() {
  const { getDb } = await import("@/lib/db.server");
  return getDb();
}

export async function getSettings(): Promise<FbSettings | null> {
  const admin = await getAdmin();
  const { data } = await admin.from("fb_settings").select("*").eq("id", 1).maybeSingle();
  return (data as FbSettings | null) ?? null;
}

export interface LeadRow {
  external_ref: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  amount_cents?: number | null;
  fbp?: string | null;
  fbc?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  event_source_url?: string | null;
}

function splitName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { fn: parts[0], ln: parts.length > 1 ? parts[parts.length - 1] : undefined };
}

function onlyDigits(v?: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

const GRAPH_VERSION = "v23.0";

/** Sends an event to the Meta Conversions API. Returns the API response (or an error object). */
export async function sendCapiEvent(opts: {
  eventName: "InitiateCheckout" | "Purchase";
  eventId: string;
  lead: LeadRow;
  valueCents: number;
  eventTime?: number;
}): Promise<{ ok: boolean; eventsReceived?: number; fbtraceId?: string; error?: string }> {
  const s = await getSettings();
  if (!s?.pixel_id || !s?.access_token) return { ok: false, error: "pixel_nao_configurado" };

  const { lead } = opts;
  const { fn, ln } = splitName(lead.name);
  const phone = normPhone(lead.phone);

  // Somente dados reais; nada fictício. CPF nunca é enviado à Meta.
  const user_data: Record<string, unknown> = {};
  const setHashed = async (key: string, value?: string | null) => {
    const h = await hashNorm(value);
    if (h) user_data[key] = [h];
  };
  await setHashed("em", lead.email);
  await setHashed("ph", phone);
  await setHashed("fn", fn);
  await setHashed("ln", ln);
  await setHashed("external_id", lead.external_ref);
  if (lead.fbp) user_data["fbp"] = lead.fbp;
  if (lead.fbc) user_data["fbc"] = lead.fbc;
  if (lead.client_ip) user_data["client_ip_address"] = lead.client_ip;
  if (lead.user_agent) user_data["client_user_agent"] = lead.user_agent;
  void onlyDigits;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: opts.eventName,
        event_time: opts.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        action_source: "website",
        event_source_url: lead.event_source_url ?? undefined,
        user_data,
        custom_data: {
          currency: "BRL",
          value: Number((opts.valueCents / 100).toFixed(2)),
          content_type: "product",
        },
      },
    ],
  };
  // test_event_code só fora de produção
  if (s.test_event_code && process.env["NODE_ENV"] !== "production") {
    payload["test_event_code"] = s.test_event_code;
  }

  try {
    const r = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(s.pixel_id)}/events?access_token=${encodeURIComponent(s.access_token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = (await r.json().catch(() => ({}))) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message?: string };
    };
    // Log seguro: sem token, sem PII, sem hashes.
    console.log("[capi]", {
      event: opts.eventName,
      event_id: opts.eventId,
      status: r.status,
      events_received: body.events_received ?? 0,
      fbtrace_id: body.fbtrace_id ?? null,
      error: r.ok ? null : (body.error?.message ?? "meta_error"),
    });
    if (!r.ok || !body.events_received) {
      return {
        ok: false,
        error: body.error?.message ?? "meta_error",
        ...(body.fbtrace_id ? { fbtraceId: body.fbtrace_id } : {}),
      };
    }
    return {
      ok: true,
      eventsReceived: body.events_received,
      ...(body.fbtrace_id ? { fbtraceId: body.fbtrace_id } : {}),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function clientIpFrom(request: Request): string | undefined {
  const h = request.headers;
  const xf = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "";
  return xf.split(",")[0]?.trim() || undefined;
}
