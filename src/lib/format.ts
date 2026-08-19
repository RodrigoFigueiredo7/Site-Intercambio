import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Money is an integer number of cents everywhere in the app. This function is
 * the border where it becomes a string, and the only place that divides by 100.
 */
export function formatMoney(cents: number, currency: "EUR" | "BRL" = "EUR") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function eurCentsToBrlCents(cents: number, fxBrl: number) {
  return Math.round(cents * fxBrl);
}

/** "12 set" — the short form used in cards and timetables. */
export function formatShortDate(iso: string) {
  return format(parseISO(iso), "d MMM", { locale: ptBR });
}

/** "12 – 19 set" when the month is shared, "28 set – 3 out" when it is not. */
export function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (start && !end) return formatShortDate(start);
  if (!start && end) return formatShortDate(end);

  const from = parseISO(start!);
  const to = parseISO(end!);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();

  return sameMonth
    ? `${format(from, "d", { locale: ptBR })} – ${format(to, "d MMM", { locale: ptBR })}`
    : `${formatShortDate(start!)} – ${formatShortDate(end!)}`;
}

/**
 * A three-letter code from a city name, used until the person edits it.
 * Strips accents so that "Zürich" yields ZUR rather than ZÜR.
 */
export function cityCode(name: string) {
  const plain = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return plain.slice(0, 3) || "---";
}

/**
 * "34,50" or "34.50" → 3450. The interface takes euros because that is what
 * a ticket says; the database only ever sees integer cents.
 */
export function parseMoneyToCents(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** The reverse, for filling an editable field. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
