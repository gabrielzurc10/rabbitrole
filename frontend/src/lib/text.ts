/**
 * Title-case a value: capitalize the first letter of each word and lower-case the rest
 * (e.g. "NEW york" → "New York", "software engineer" → "Software Engineer"). Word starts
 * are the string start or a letter after a space, apostrophe, or hyphen, so names like
 * "o'brien" / "jean-luc" capitalize correctly.
 */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
