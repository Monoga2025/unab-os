export function cleanDisplayFileName(input) {
  // Some source paths replaced the UTF-8 second byte for ó with the literal
  // digit 3. Restore the mojibake pair first so the bounded latin1 repair can
  // decode the whole filename without introducing U+FFFD.
  let value = input.replaceAll("Ã3", "Ã³");
  if (/[ÃÂ]|[\u0080-\u009f]/.test(value)) {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    if (!repaired.includes("\uFFFD")) value = repaired;
  }
  value = value.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f/\\]/g, "_").trim();
  if (!value || value === "." || value === "..") throw new Error("Unsafe source filename.");
  return value.slice(0, 255);
}
