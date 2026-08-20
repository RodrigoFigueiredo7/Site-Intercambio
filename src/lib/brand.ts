/**
 * The product's name lives here once. Everything that prints it — the browser
 * tab, the sign-in screen, the panel header, the showcase — reads it from
 * this file so a rename is one edit.
 */
export const BRAND = "Onde está o Rod?";

/** What fits in a 16px-tall panel header, where the full question does not. */
export const BRAND_SHORT = "Rod";

export const BRAND_TAGLINE =
  "Onde eu estou agora, para onde vou depois e como foi cada viagem do intercâmbio.";

/**
 * The name the sentences use. It comes from the profile, so the person can
 * rename themselves without touching the code; the brand's own short name is
 * the fallback for a profile that has no display name yet.
 */
export function firstName(displayName: string | null): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0];
  return first || BRAND_SHORT;
}
