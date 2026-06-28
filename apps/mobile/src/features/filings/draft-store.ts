import { useCallback, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import type { I765Address, I765FullAnswers } from "@immigration/shared";

/**
 * On-device draft persistence for the full I-765 answer set.
 *
 * The answer set includes identity PII, so it is stored ONLY in the device
 * Keychain via expo-secure-store and never sent to the server (docs/DECISIONS.md
 * D7/D8). SecureStore caps a value at ~2KB, so the JSON is chunked across keys.
 */
const BASE_KEY = "i765_draft_v1";
const META_KEY = `${BASE_KEY}_meta`;
// SecureStore caps a value at ~2KB of UTF-8 BYTES. We `encodeURIComponent` the
// JSON first so every stored character is ASCII (1 byte) — names/countries with
// accents or non-Latin scripts can't blow the per-chunk byte budget.
const CHUNK_SIZE = 1800;
const SAVE_DEBOUNCE_MS = 600;

async function saveSecureJson(value: unknown): Promise<void> {
  const encoded = encodeURIComponent(JSON.stringify(value));
  const chunkCount = Math.max(1, Math.ceil(encoded.length / CHUNK_SIZE));
  // Clear any stale tail chunks from a previously longer draft first.
  const prevMeta = await SecureStore.getItemAsync(META_KEY);
  const prevCount = prevMeta ? Number.parseInt(prevMeta, 10) || 0 : 0;
  for (let i = chunkCount; i < prevCount; i += 1) {
    await SecureStore.deleteItemAsync(`${BASE_KEY}_${i}`);
  }
  for (let i = 0; i < chunkCount; i += 1) {
    await SecureStore.setItemAsync(
      `${BASE_KEY}_${i}`,
      encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    );
  }
  await SecureStore.setItemAsync(META_KEY, String(chunkCount));
}

export async function loadI765Draft(): Promise<I765FullAnswers | null> {
  return loadSecureJson();
}

async function loadSecureJson(): Promise<I765FullAnswers | null> {
  const meta = await SecureStore.getItemAsync(META_KEY);
  if (!meta) return null;
  const chunkCount = Number.parseInt(meta, 10) || 0;
  let encoded = "";
  for (let i = 0; i < chunkCount; i += 1) {
    const chunk = await SecureStore.getItemAsync(`${BASE_KEY}_${i}`);
    if (chunk == null) return null;
    encoded += chunk;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded));
    // Guard against a corrupt or schema-incompatible payload (the key is
    // versioned, so a breaking schema change uses a fresh key rather than this).
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as I765FullAnswers;
  } catch {
    return null;
  }
}

async function clearSecureJson(): Promise<void> {
  const meta = await SecureStore.getItemAsync(META_KEY);
  const chunkCount = meta ? Number.parseInt(meta, 10) || 0 : 0;
  for (let i = 0; i < chunkCount; i += 1) {
    await SecureStore.deleteItemAsync(`${BASE_KEY}_${i}`);
  }
  await SecureStore.deleteItemAsync(META_KEY);
}

export interface I765DraftController {
  answers: I765FullAnswers;
  /** True once the persisted draft has loaded (avoids flashing an empty form). */
  ready: boolean;
  /** Merge top-level fields into the draft. */
  patch: (partial: Partial<I765FullAnswers>) => void;
  /**
   * Merge using the LATEST state. Use this for nested objects/arrays
   * (other names, interpreter, preparer) so back-to-back edits never spread a
   * stale render snapshot and drop a sibling field.
   */
  update: (updater: (prev: I765FullAnswers) => Partial<I765FullAnswers>) => void;
  /** Merge into a nested address sub-object (mailing or physical). */
  patchAddress: (key: "mailingAddress" | "physicalAddress", partial: Partial<I765Address>) => void;
  /** Persist the latest answers immediately (cancels the pending debounce). */
  flush: () => Promise<void>;
  /** Clear the draft from state and the Keychain. */
  reset: () => void;
}

/**
 * Stateful controller for the I-765 draft. Updates are applied to in-memory
 * state immediately (snappy typing) and persisted to the Keychain on a short
 * debounce so we are not writing chunks on every keystroke.
 */
export function useI765Draft(): I765DraftController {
  const [answers, setAnswers] = useState<I765FullAnswers>({});
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<I765FullAnswers>({});

  useEffect(() => {
    let active = true;
    loadSecureJson().then((stored) => {
      if (!active) return;
      if (stored) {
        latest.current = stored;
        setAnswers(stored);
      }
      setReady(true);
    });
    return () => {
      active = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persistSoon = useCallback((next: I765FullAnswers) => {
    latest.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSecureJson(latest.current).catch((error) => {
        // Persisting failed (Keychain locked, disk full). Keep the in-memory
        // draft; the next edit retries. Surface for debugging.
        console.warn("[i765-draft] failed to persist draft", error);
      });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const patch = useCallback(
    (partial: Partial<I765FullAnswers>) => {
      setAnswers((prev) => {
        const next = { ...prev, ...partial };
        persistSoon(next);
        return next;
      });
    },
    [persistSoon]
  );

  const update = useCallback(
    (updater: (prev: I765FullAnswers) => Partial<I765FullAnswers>) => {
      setAnswers((prev) => {
        const next = { ...prev, ...updater(prev) };
        persistSoon(next);
        return next;
      });
    },
    [persistSoon]
  );

  const patchAddress = useCallback(
    (key: "mailingAddress" | "physicalAddress", partial: Partial<I765Address>) => {
      setAnswers((prev) => {
        const next = { ...prev, [key]: { ...prev[key], ...partial } };
        persistSoon(next);
        return next;
      });
    },
    [persistSoon]
  );

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    return saveSecureJson(latest.current);
  }, []);

  const reset = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    latest.current = {};
    setAnswers({});
    void clearSecureJson();
  }, []);

  return { answers, ready, patch, update, patchAddress, flush, reset };
}
