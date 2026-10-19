import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveKey,
  encryptJournal,
  decryptJournal,
  validateEnvelope,
  KDF_ITERATIONS,
} from "../lib/vault";
import { emptyJournal } from "../lib/schema";
const pass = "test-only-passphrase-123";
test("AES-GCM round trip and non-extractable key", async () => {
  const vault = await deriveKey(pass);
  assert.equal(vault.key.extractable, false);
  const e = await encryptJournal(emptyJournal(), vault);
  assert.equal(e.iterations, KDF_ITERATIONS);
  assert.ok(!JSON.stringify(e).includes("checkins"));
  const r = await decryptJournal(e, pass);
  assert.deepEqual(r.journal, emptyJournal());
});
test("same content gets a fresh random IV every save", async () => {
  const v = await deriveKey(pass);
  const a = await encryptJournal(emptyJournal(), v),
    b = await encryptJournal(emptyJournal(), v);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.ciphertext, b.ciphertext);
});
test("wrong passphrase and tampered ciphertext fail authentication", async () => {
  const e = await encryptJournal(emptyJournal(), await deriveKey(pass));
  await assert.rejects(
    () => decryptJournal(e, "incorrect-long-passphrase"),
    /Could not unlock/,
  );
  const bytes = Uint8Array.from(atob(e.ciphertext), (c) => c.charCodeAt(0));
  bytes[0] ^= 1;
  await assert.rejects(
    () =>
      decryptJournal(
        { ...e, ciphertext: btoa(String.fromCharCode(...bytes)) },
        pass,
      ),
    /Could not unlock/,
  );
});
test("invalid envelopes and weak passphrases are rejected", async () => {
  assert.throws(() => validateEnvelope({ version: 2 }));
  assert.throws(() =>
    validateEnvelope({
      version: 1,
      iterations: KDF_ITERATIONS,
      salt: "?",
      iv: "?",
      ciphertext: "abc",
    }),
  );
  await assert.rejects(() => deriveKey("short"));
});
test("larger valid journals encrypt without argument-stack overflow", async () => {
  const j = {
    ...emptyJournal(),
    checkins: Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      date: "2026-01-01",
      symptoms: ["Fatigue" as const],
      severity: 4,
      note: "x".repeat(1000),
      safety: "no" as const,
    })),
  };
  const e = await encryptJournal(j, await deriveKey(pass));
  assert.equal((await decryptJournal(e, pass)).journal.checkins.length, 200);
});
