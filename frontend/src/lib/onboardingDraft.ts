// In-memory handoff between the onboarding wizard and the analyzing page.
// The picked File can't be serialized to sessionStorage, so we keep the whole
// draft in module memory. A hard refresh on /analyzing loses it and restarts
// onboarding — acceptable for this MVP.
import type { CityPreference, EmploymentType, Profile } from "@/types";

export interface OnboardingDraft {
  profile: Profile;
  file: File;
  /** Where to return on analysis failure (e.g. "/onboarding" or "/profile"). */
  origin?: string;
}

let current: OnboardingDraft | null = null;

export function setOnboardingDraft(draft: OnboardingDraft): void {
  current = draft;
}

export function getOnboardingDraft(): OnboardingDraft | null {
  return current;
}

export function clearOnboardingDraft(): void {
  current = null;
}

// Serializable snapshot of the wizard's inputs, mirrored to sessionStorage so the
// user's work survives a *full* page reload — notably a forced re-login that bounces
// them out mid-wizard (the access token expired and the silent refresh failed). The
// picked File is the one thing that can't be persisted (File isn't serializable), so
// it's left out and the user re-attaches it on return. sessionStorage (not local)
// keeps it per-tab and short-lived, and survives navigating away to /login and back.
const FORM_KEY = "rr.onboardingForm";

export interface OnboardingForm {
  /** The wizard step the user was on (1-based), so we can land them back near it. */
  step: number;
  fullName: string;
  roles: string[];
  remote: boolean;
  employmentTypes: EmploymentType[];
  cities: CityPreference[];
}

export function saveOnboardingForm(form: OnboardingForm): void {
  if (typeof window !== "undefined") sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
}

export function loadOnboardingForm(): OnboardingForm | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(FORM_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as OnboardingForm;
  } catch {
    return null;
  }
}

/** Drop the saved inputs — on successful onboarding, or on an explicit sign-out. */
export function clearOnboardingForm(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(FORM_KEY);
}

// --- Durable draft handoff -------------------------------------------------
// The in-memory `current` above is the fast path, but it only survives a *soft*
// client navigation. On the static-export site the /onboarding → /analyzing hop
// can turn into a full document load (seen in some browsers), which drops module
// memory and strands /analyzing with no draft — so it bounces the user straight
// back off the page. To survive that, we also persist the draft durably: the
// serializable parts in sessionStorage, and the picked File in IndexedDB — the one
// web store that holds a File/Blob natively (no base64 bloat, no ~5 MB cap).
// /analyzing recovers from here whenever module memory is empty.
const DRAFT_META_KEY = "rr.onboardingDraftMeta";
const IDB_NAME = "rabbitrole";
const IDB_STORE = "draft";
const IDB_FILE_KEY = "onboardingFile";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRun<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest | null): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const req = op(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve((req?.result as T) ?? (undefined as T));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Persist the draft so /analyzing can recover it after a full reload. Best-effort. */
export async function persistDraft(draft: OnboardingDraft): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      DRAFT_META_KEY,
      JSON.stringify({ profile: draft.profile, origin: draft.origin }),
    );
    await idbRun("readwrite", (store) => store.put(draft.file, IDB_FILE_KEY));
  } catch {
    // Durable persistence is best-effort; the in-memory draft still covers a soft nav.
  }
}

/** Recover a persisted draft (metadata + File), or null if none/incomplete. */
export async function loadPersistedDraft(): Promise<OnboardingDraft | null> {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRAFT_META_KEY);
  if (raw === null) return null;
  try {
    const file = await idbRun<File | undefined>("readonly", (store) => store.get(IDB_FILE_KEY));
    if (!file) return null;
    const { profile, origin } = JSON.parse(raw) as Pick<OnboardingDraft, "profile" | "origin">;
    return { profile, file, origin };
  } catch {
    return null;
  }
}

/** Drop the durable draft — on successful onboarding, or an explicit sign-out. */
export async function clearPersistedDraft(): Promise<void> {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_META_KEY);
  try {
    await idbRun("readwrite", (store) => store.delete(IDB_FILE_KEY));
  } catch {
    // ignore — a stale file is overwritten by the next draft anyway
  }
}

// One-shot flag so /analyzing can hand an error back to the page it returns to.
const ANALYZE_ERROR_KEY = "rr.analyzeError";

/** Record that analysis failed (read once by the page we fall back to). */
export function flagAnalyzeError(message: string): void {
  if (typeof window !== "undefined") sessionStorage.setItem(ANALYZE_ERROR_KEY, message);
}

/** Read + clear the analyze-error message, so it shows exactly once. */
export function takeAnalyzeError(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(ANALYZE_ERROR_KEY);
  if (message !== null) sessionStorage.removeItem(ANALYZE_ERROR_KEY);
  return message;
}
