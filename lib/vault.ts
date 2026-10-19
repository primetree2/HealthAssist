/** Browser-only encrypted persistence. Keys stay in memory. No plaintext journal is persisted. */
import { journalSchema, type Journal } from "./schema";
const DB = "health-assist-v2",
  STORE = "vault",
  RECORD = "journal";
export const KDF_ITERATIONS = 310000;
export type Envelope = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
  iterations: number;
};
export type VaultKey = { key: CryptoKey; salt: string };
function b64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function bytes(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function buffer(b: Uint8Array): ArrayBuffer {
  return b.slice().buffer as ArrayBuffer;
}
export async function deriveKey(
  passphrase: string,
  salt?: string,
): Promise<VaultKey> {
  if (passphrase.length < 12 || passphrase.length > 256)
    throw new Error("Use a passphrase of 12–256 characters.");
  const saltText = salt ?? b64(crypto.getRandomValues(new Uint8Array(16)));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: buffer(bytes(saltText)),
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return { key, salt: saltText };
}
export async function encryptJournal(
  journal: Journal,
  vault: VaultKey,
): Promise<Envelope> {
  const valid = journalSchema.parse(journal);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: buffer(iv),
      additionalData: new TextEncoder().encode("health-assist:v1"),
    },
    vault.key,
    new TextEncoder().encode(JSON.stringify(valid)),
  );
  return {
    version: 1,
    salt: vault.salt,
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(ciphertext)),
    iterations: KDF_ITERATIONS,
  };
}
export function validateEnvelope(raw: unknown): Envelope {
  if (!raw || typeof raw !== "object") throw new Error("Invalid vault file.");
  const e = raw as Envelope;
  if (
    e.version !== 1 ||
    e.iterations !== KDF_ITERATIONS ||
    typeof e.salt !== "string" ||
    typeof e.iv !== "string" ||
    typeof e.ciphertext !== "string" ||
    e.ciphertext.length > 12_000_000
  )
    throw new Error("Unsupported or damaged vault.");
  try {
    if (
      bytes(e.salt).length !== 16 ||
      bytes(e.iv).length !== 12 ||
      bytes(e.ciphertext).length < 16
    )
      throw new Error();
  } catch {
    throw new Error("Invalid vault encoding.");
  }
  return e;
}
export async function decryptJournal(
  raw: unknown,
  passphrase: string,
): Promise<{ journal: Journal; vault: VaultKey }> {
  const e = validateEnvelope(raw);
  const vault = await deriveKey(passphrase, e.salt);
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: buffer(bytes(e.iv)),
        additionalData: new TextEncoder().encode("health-assist:v1"),
      },
      vault.key,
      buffer(bytes(e.ciphertext)),
    );
    return {
      journal: journalSchema.parse(
        JSON.parse(new TextDecoder().decode(plaintext)),
      ),
      vault,
    };
  } catch {
    throw new Error(
      "Could not unlock: the passphrase is incorrect or the vault is damaged. No data was changed.",
    );
  }
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Browser storage unavailable. Try a normal browser window or use the demo.",
        ),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Storage is blocked by another tab. Close other Health Assist tabs and try again.",
        ),
      );
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result as T);
    };
    tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Could not save browser storage. Your last change was not saved.",
        ),
      );
    };
    tx.onabort = () => {
      db.close();
      reject(
        new Error("Storage was interrupted. Your last change was not saved."),
      );
    };
  });
}
export const readEnvelope = () =>
  operation<Envelope | undefined>("readonly", (s) => s.get(RECORD));
export const persistEnvelope = (e: Envelope) =>
  operation<void>("readwrite", (s) => s.put(validateEnvelope(e), RECORD));
export const deleteVault = () =>
  operation<void>("readwrite", (s) => s.delete(RECORD));
/** Exclusive tab ownership avoids silent last-writer-wins data loss. Requires secure-context Web Locks. */
export async function acquireVaultLock(): Promise<() => void> {
  if (!navigator.locks)
    throw new Error(
      "This browser cannot safely lock the vault. Use a current Chrome, Edge, Firefox, or Safari over HTTPS.",
    );
  return new Promise((resolve, reject) => {
    navigator.locks
      .request("health-assist-vault", { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(
            new Error(
              "Vault is open in another tab. Lock it there before continuing.",
            ),
          );
          return;
        }
        await new Promise<void>((release) => resolve(release));
      })
      .catch(reject);
  });
}
