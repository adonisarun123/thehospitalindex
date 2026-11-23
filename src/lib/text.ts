/** Lookup normalisation shared by aliases, synonyms and search input. */
export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’'".,()]/g, "")
    .replace(/[\s\-_/]+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Alphabet without look-alikes (0/o, 1/l/i). */
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function newPublicId(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

export const PINCODE_RE = /^[1-9][0-9]{5}$/;

const ACRONYMS: Record<string, string> = { opd: "OPD", ppp: "PPP", icu_beds: "ICU beds", nicu_beds: "NICU beds", picu_beds: "PICU beds" };

export function titleCaseEnum(value: string): string {
  if (ACRONYMS[value]) return ACRONYMS[value];
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
