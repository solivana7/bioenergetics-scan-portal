// LeadConnector / GoHighLevel v2 helper for SoliVana bioenergetics flow.
// Pushes contacts + tags + custom fields when scans are paid, reports are generated,
// and infoceutical protocols are ordered.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const HISTORY_MAX_ENTRIES = 24; // 2 years of monthly scans

// Cache of GHL custom field definitions: name → id and id → name.
// GHL's contact search API returns customFields as {id, value} with no key,
// so we need this map to read fields by name and write fields by ID.
type FieldDefs = { byName: Map<string, string>; byId: Map<string, string> } | null;
let fieldDefsCache: FieldDefs = null;
let fieldDefsCachePromise: Promise<FieldDefs> | null = null;

async function loadFieldDefs(): Promise<FieldDefs> {
  if (fieldDefsCache) return fieldDefsCache;
  if (fieldDefsCachePromise) return fieldDefsCachePromise;

  fieldDefsCachePromise = (async () => {
    let creds;
    try {
      creds = getCreds();
    } catch {
      return null;
    }
    try {
      const res = await fetch(
        `${GHL_BASE}/locations/${creds.locationId}/customFields`,
        {
          headers: {
            Authorization: `Bearer ${creds.apiKey}`,
            Version: GHL_VERSION,
            Accept: "application/json",
          },
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { customFields?: Array<{ id: string; name: string }> };
      const byName = new Map<string, string>();
      const byId = new Map<string, string>();
      for (const cf of data.customFields || []) {
        const cleanName = (cf.name || "").trim();
        if (cleanName && cf.id) {
          byName.set(cleanName, cf.id);
          byId.set(cf.id, cleanName);
        }
      }
      fieldDefsCache = { byName, byId };
      return fieldDefsCache;
    } catch (err) {
      console.error("loadFieldDefs threw:", err);
      return null;
    }
  })();

  return fieldDefsCachePromise;
}

function getCreds() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    throw new Error("GHL_API_KEY or GHL_LOCATION_ID not set");
  }
  return { apiKey, locationId };
}

type ContactPayload = {
  email: string;
  name?: string;
  tags?: string[];
  customFields?: Array<{ key: string; field_value: string }>;
};

type GhlContact = {
  id: string;
  customFields?: Array<{ id?: string; key?: string; value?: string }>;
};

async function getCustomFieldValue(contact: GhlContact | null, name: string): Promise<string> {
  if (!contact?.customFields) return "";
  const defs = await loadFieldDefs();
  const targetId = defs?.byName.get(name);
  if (!targetId) return "";
  const f = contact.customFields.find((cf) => cf.id === targetId);
  return (f?.value ?? "").toString();
}

// Look up an existing contact by email. Returns null if not found or on error.
async function getGhlContactByEmail(email: string): Promise<GhlContact | null> {
  let creds;
  try {
    creds = getCreds();
  } catch {
    return null;
  }
  const url = `${GHL_BASE}/contacts/search/duplicate?locationId=${encodeURIComponent(creds.locationId)}&email=${encodeURIComponent(email.toLowerCase().trim())}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        Version: GHL_VERSION,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      // 404 means no contact yet — that's fine, return null
      if (res.status !== 404) {
        const text = await res.text().catch(() => "");
        console.error(`GHL lookup non-404 (${res.status}):`, text.slice(0, 300));
      }
      return null;
    }
    const data = (await res.json()) as { contact?: GhlContact };
    return data.contact ?? null;
  } catch (err) {
    console.error("GHL lookup threw:", err);
    return null;
  }
}

// Build the append-on-history payload for a fresh report. Reads existing
// infoceutical_names/scan_count/first_scan_date, prepends a new dated entry,
// caps history at HISTORY_MAX_ENTRIES, and bumps the count.
//
// Use this only on the report path. Voice-scan-paid and infoceutical-paid use
// upsertGhlContact directly because they don't need history (the custom fields
// they set — delivery_method, etc. — are point-in-time facts about the latest
// purchase).
export async function pushReportHistoryToGhl(args: {
  email: string;
  name?: string;
  scanDate: string;
  infoceuticalNames: string[];
}): Promise<void> {
  const { email, name, scanDate, infoceuticalNames } = args;
  if (!email) return;

  const existing = await getGhlContactByEmail(email);

  const oldHistory = await getCustomFieldValue(existing, "infoceutical_history");
  const oldCount = parseInt((await getCustomFieldValue(existing, "scan_count")) || "0", 10) || 0;
  const oldFirstDate = await getCustomFieldValue(existing, "first_scan_date");

  const newEntry = `${scanDate} — ${infoceuticalNames.join(", ")}`;
  const trimmed = oldHistory
    ? [newEntry, ...oldHistory.split("\n")].slice(0, HISTORY_MAX_ENTRIES).join("\n")
    : newEntry;

  const isFirstScan = oldCount === 0;

  await upsertGhlContact({
    email,
    name,
    tags: [
      "report-generated",
      "bioenergetics-scan",
      // First-time-scan tag fires the welcome workflow only once.
      // Returning-scan tag is for any re-engagement workflows you want gated to repeat clients.
      isFirstScan ? "first-time-scan" : "returning-scan",
    ],
    customFields: [
      // Latest protocol — easy to read at a glance
      { key: "infoceutical_names", field_value: infoceuticalNames.join(", ") },
      { key: "last_scan_date", field_value: scanDate },
      // Append-on-history (newest first, max 24 entries)
      { key: "infoceutical_history", field_value: trimmed },
      // Counts + first-ever date (set once, never overwritten)
      { key: "scan_count", field_value: String(oldCount + 1) },
      { key: "first_scan_date", field_value: oldFirstDate || scanDate },
    ],
  });
}

// Add tags to an existing GHL contact additively (does NOT replace existing tags).
// Uses the dedicated /contacts/{id}/tags endpoint instead of upsert (upsert
// replaces the whole tags array, which wipes out prior workflow tags).
//
// Also accepts optional customFields which are merged via upsert (custom fields
// on upsert are merged by ID, so this is safe).
export async function addContactTags(
  email: string,
  tags: string[],
  customFields?: Array<{ key: string; field_value: string }>
): Promise<boolean> {
  if (!email) return false;
  let creds;
  try {
    creds = getCreds();
  } catch {
    return false;
  }

  // 1. Look up the contact id by email
  const contact = await getGhlContactByEmail(email);
  if (!contact?.id) {
    // Contact doesn't exist — fall through to upsert (which creates it)
    const id = await upsertGhlContact({ email, tags, customFields });
    return id !== null;
  }

  // 2. Add tags via dedicated additive endpoint
  if (tags.length > 0) {
    try {
      const res = await fetch(`${GHL_BASE}/contacts/${contact.id}/tags`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          Version: GHL_VERSION,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error(`GHL add tags failed (${res.status}):`, t.slice(0, 300));
        return false;
      }
    } catch (err) {
      console.error("GHL add tags threw:", err);
      return false;
    }
  }

  // 3. If custom fields supplied, merge them via upsert (which is safe for fields)
  if (customFields && customFields.length > 0) {
    const id = await upsertGhlContact({ email, customFields });
    if (!id) return false;
  }

  return true;
}

/** @deprecated Use addContactTags. Kept for backwards compatibility. */
export async function applyGhlTags(email: string, tags: string[]): Promise<boolean> {
  return addContactTags(email, tags);
}

// PATCH a GHL contact's basic profile fields. Used by the admin "Edit Client" tab.
//
// Uses POST /contacts/upsert (not PUT /contacts/{id}) so customFields and tags
// are NOT touched. PUT /contacts/{id} was observed to wipe customFields in
// some cases — losing notes/protocol when a user saved the profile tab.
export async function updateGhlContactProfile(
  email: string,
  patch: { firstName?: string; lastName?: string; phone?: string; newEmail?: string }
): Promise<boolean> {
  let creds;
  try {
    creds = getCreds();
  } catch {
    return false;
  }
  try {
    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        locationId: creds.locationId,
        email: (patch.newEmail ? patch.newEmail : email).toLowerCase().trim(),
        ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
        ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        // tags / customFields intentionally omitted — upsert preserves them
        // when not present in the payload.
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`GHL profile upsert failed (${res.status}):`, t.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("updateGhlContactProfile threw:", err);
    return false;
  }
}

// PATCH a single GHL custom field by display name. Used by the admin Notes tab
// and by the protocol-correction button on the Scan History tab.
//
// IMPORTANT: GHL's `customFields[].key` on /contacts/upsert is the field's
// internal API slug (e.g. `contact.notes`), NOT the display name. Passing the
// display name silently no-ops. So we look up the field id via the same
// loadFieldDefs cache reads use, and write with `{ id, field_value }`.
export async function updateGhlCustomField(
  email: string,
  fieldName: string,
  value: string
): Promise<boolean> {
  if (!email) return false;
  const defs = await loadFieldDefs();
  const fieldId = defs?.byName.get(fieldName);
  if (!fieldId) {
    console.error(`updateGhlCustomField: field "${fieldName}" not found in GHL custom fields`);
    return false;
  }
  let creds;
  try {
    creds = getCreds();
  } catch {
    return false;
  }
  const contact = await getGhlContactByEmail(email);
  if (!contact?.id) {
    console.error(`updateGhlCustomField: contact for "${email}" not found`);
    return false;
  }
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contact.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        customFields: [{ id: fieldId, field_value: value }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`GHL custom field update failed (${res.status}):`, t.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("updateGhlCustomField threw:", err);
    return false;
  }
}

// List ALL contacts with one of the given tags. Pulls from GHL with custom field
// expansion so the admin dashboard can render an at-a-glance table.
export type ContactSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  tags: string[];
  scanCount: string;
  lastScanDate: string;
  firstScanDate: string;
  infoceuticalNames: string;
  deliveryMethod: string;
  readyDate: string;
  pickupDate: string;
  pickupVerified: string;
  hasInfoceuticalPaid: boolean;
  hasReadyTag: boolean;
  hasPickedUpTag: boolean;
};

export async function listContactsByTags(tags: string[]): Promise<ContactSummary[]> {
  let creds;
  try {
    creds = getCreds();
  } catch {
    return [];
  }

  // GHL v2 contact search endpoint — pageLimit max 100; paginate via `page` (1-based offset)
  const all: Array<GhlContact & { firstName?: string; lastName?: string; tags?: string[]; phone?: string; email?: string }> = [];
  for (let page = 1; page <= 20; page++) { // hard cap at 2000 contacts
    const body: Record<string, unknown> = {
      locationId: creds.locationId,
      pageLimit: 100,
      page,
      filters: tags.length > 0 ? [{ field: "tags", operator: "contains", value: tags }] : [],
    };

    let res: Response;
    try {
      res = await fetch(`${GHL_BASE}/contacts/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          Version: GHL_VERSION,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("listContactsByTags fetch threw:", err);
      break;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`GHL contacts/search failed (${res.status}):`, text.slice(0, 500));
      break;
    }
    const data = (await res.json()) as { contacts?: typeof all; total?: number };
    const batch = data.contacts || [];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }

  await loadFieldDefs();

  return Promise.all(
    all.map(async (c) => {
      const t = c.tags || [];
      const [
        scanCount,
        lastScanDate,
        firstScanDate,
        infoceuticalNames,
        deliveryMethod,
        readyDate,
        pickupDate,
        pickupVerified,
      ] = await Promise.all([
        getCustomFieldValue(c, "scan_count"),
        getCustomFieldValue(c, "last_scan_date"),
        getCustomFieldValue(c, "first_scan_date"),
        getCustomFieldValue(c, "infoceutical_names"),
        getCustomFieldValue(c, "delivery_method"),
        getCustomFieldValue(c, "infoceutical_ready_date"),
        getCustomFieldValue(c, "infoceutical_pickup_date"),
        getCustomFieldValue(c, "infoceutical_pickup_verified"),
      ]);
      return {
        id: c.id,
        email: c.email || "",
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        phone: c.phone || "",
        tags: t,
        scanCount,
        lastScanDate,
        firstScanDate,
        infoceuticalNames,
        deliveryMethod,
        readyDate,
        pickupDate,
        pickupVerified,
        hasInfoceuticalPaid: t.includes("infoceutical-paid"),
        hasReadyTag: t.includes("infoceutical-ready-pickup"),
        hasPickedUpTag: t.includes("infoceutical-picked-up"),
      };
    })
  );
}

// Read the pickup state for a contact (infoceutical names, dates, current tags).
// Used by the /admin/pickup page so Natasha can verify the client is taking the
// correct bottles and audit later if there's a dispute.
export type PickupState = {
  found: boolean;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  infoceuticalNames: string;
  lastScanDate: string;
  paymentDate: string;
  readyDate: string;
  pickupDate: string;
  pickupVerified: string;
  notes: string;
  tags: string[];
  hasReadyTag: boolean;
  hasPickedUpTag: boolean;
};

export async function getPickupState(email: string): Promise<PickupState> {
  const empty: PickupState = {
    found: false,
    email,
    phone: "",
    firstName: "",
    lastName: "",
    infoceuticalNames: "",
    lastScanDate: "",
    paymentDate: "",
    readyDate: "",
    pickupDate: "",
    pickupVerified: "",
    notes: "",
    tags: [],
    hasReadyTag: false,
    hasPickedUpTag: false,
  };

  let creds;
  try {
    creds = getCreds();
  } catch {
    return empty;
  }

  const url = `${GHL_BASE}/contacts/search/duplicate?locationId=${encodeURIComponent(creds.locationId)}&email=${encodeURIComponent(email.toLowerCase().trim())}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        Version: GHL_VERSION,
        Accept: "application/json",
      },
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      contact?: GhlContact & {
        firstName?: string;
        lastName?: string;
        phone?: string;
        tags?: string[];
      };
    };
    const c = data.contact;
    if (!c) return empty;
    const tags = c.tags || [];
    const [
      infoceuticalNames,
      lastScanDate,
      paymentDate,
      readyDate,
      pickupDate,
      pickupVerified,
      notes,
    ] = await Promise.all([
      getCustomFieldValue(c, "infoceutical_names"),
      getCustomFieldValue(c, "last_scan_date"),
      getCustomFieldValue(c, "infoceutical_payment_date"),
      getCustomFieldValue(c, "infoceutical_ready_date"),
      getCustomFieldValue(c, "infoceutical_pickup_date"),
      getCustomFieldValue(c, "infoceutical_pickup_verified"),
      getCustomFieldValue(c, "notes"),
    ]);
    return {
      found: true,
      email,
      phone: c.phone || "",
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      infoceuticalNames,
      lastScanDate,
      paymentDate,
      readyDate,
      pickupDate,
      pickupVerified,
      notes,
      tags,
      hasReadyTag: tags.includes("infoceutical-ready-pickup"),
      hasPickedUpTag: tags.includes("infoceutical-picked-up"),
    };
  } catch (err) {
    console.error("getPickupState threw:", err);
    return empty;
  }
}

// Upsert (create-or-update by email) a contact, applying tags + custom fields.
// Custom fields use the human-readable key — GHL accepts either id or key in the upsert API.
// Returns the contact id on success or null on failure (errors are logged but never thrown
// since this is a side-effect on the payment/report path — we don't want to break the user
// flow if GHL is briefly unavailable).
export async function upsertGhlContact(payload: ContactPayload): Promise<string | null> {
  if (!payload.email) {
    console.warn("upsertGhlContact: missing email, skipping");
    return null;
  }
  let creds;
  try {
    creds = getCreds();
  } catch (err) {
    console.error("GHL credentials missing — skipping upsert:", err);
    return null;
  }

  const [firstName = "", ...rest] = (payload.name || "").trim().split(/\s+/);
  const lastName = rest.join(" ");

  const body = {
    locationId: creds.locationId,
    email: payload.email.toLowerCase().trim(),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    tags: payload.tags && payload.tags.length > 0 ? payload.tags : undefined,
    customFields: payload.customFields && payload.customFields.length > 0 ? payload.customFields : undefined,
  };

  try {
    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`GHL upsert failed (${res.status}):`, text.slice(0, 500));
      return null;
    }
    const data = (await res.json()) as { contact?: { id?: string } };
    return data.contact?.id ?? null;
  } catch (err) {
    console.error("GHL upsert threw:", err);
    return null;
  }
}
