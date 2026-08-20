import type { ItemCategory } from "@/lib/db/types";

/**
 * Turns a block of typed Portuguese into stays and agenda lines.
 *
 * This is a parser, not a language model: it reads the shapes a person
 * actually writes a plan in, and everything it cannot read comes back in
 * `unparsed` so nothing is silently dropped. Whatever it produces is shown for
 * confirmation before a single row is written — a guess that writes itself to
 * the database is worse than no guess at all.
 */

export type ParsedStay = {
  city: string;
  from: string;
  to: string;
  fromTime: string | null;
  toTime: string | null;
  line: string;
};

export type ParsedItem = {
  date: string;
  time: string | null;
  title: string;
  costCents: number;
  category: ItemCategory;
  line: string;
};

export type ParsedPlan = {
  stays: ParsedStay[];
  items: ParsedItem[];
  unparsed: string[];
};

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, "março": 3, marco: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12,
};

/** Words that carry no meaning at the front of a city or a title. */
/** Longest first: alternation is first-match, and "mar" would eat "março". */
const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length);

const LEAD_NOISE =
  /^(?:em|no|na|de|do|da|para|pra|chego|chegada|fico|estarei|vou|dia|dias|entre)\b[\s,:-]*/i;

const FOOD = /\b(almo[çc]o|jantar|janta|caf[ée]|lanche|restaurante|comida|brunch|padaria|bar)\b/i;
const LODGING = /\b(hotel|hostel|airbnb|pousada|check[- ]?in|check[- ]?out|hospedagem|quarto)\b/i;
const ACTIVITY =
  /\b(museu|tour|passeio|castelo|ingresso|visita|igreja|parque|show|jogo|praia|trilha|catedral|palácio|palacio|exposi[çc][ãa]o)\b/i;

export function categoryOf(text: string): ItemCategory {
  if (LODGING.test(text)) return "lodging";
  if (FOOD.test(text)) return "food";
  if (ACTIVITY.test(text)) return "activity";
  return "other";
}

type Found<T> = { value: T; start: number; end: number };

function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The first date in the text, in any shape a person writes it.
 * `6/11`, `06/11/2026`, `6 de novembro`, `6 nov`, and a bare `dia 6` when the
 * month is already known from the trip.
 */
export function findDate(
  text: string,
  year: number,
  defaultMonth: number | null,
): Found<string> | null {
  const numeric = /(\b[0-3]?\d)[/.-]([01]?\d)(?:[/.-](\d{2,4}))?\b/.exec(text);
  const named = new RegExp(
    `\\b([0-3]?\\d)\\s*(?:de\\s+)?(${MONTH_NAMES.join("|")})\\b`,
    "i",
  ).exec(text);

  // Whichever comes first in the line wins, so "6 nov" is not read as "6/11"
  // from a different part of the sentence.
  const candidates: Found<string>[] = [];

  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const rawYear = numeric[3];
    const resolved = rawYear
      ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear)
      : year;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      candidates.push({
        value: `${resolved}-${pad(month)}-${pad(day)}`,
        start: numeric.index,
        end: numeric.index + numeric[0].length,
      });
    }
  }

  if (named) {
    const day = Number(named[1]);
    const month = MONTHS[named[2].toLowerCase()];
    if (day >= 1 && day <= 31 && month) {
      candidates.push({
        value: `${year}-${pad(month)}-${pad(day)}`,
        start: named.index,
        end: named.index + named[0].length,
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.start - b.start);
    return candidates[0];
  }

  // "dia 7" only means something once a month is on the table.
  if (defaultMonth) {
    const bare = /\bdia\s+([0-3]?\d)\b/i.exec(text);
    if (bare) {
      const day = Number(bare[1]);
      if (day >= 1 && day <= 31) {
        return {
          value: `${year}-${pad(defaultMonth)}-${pad(day)}`,
          start: bare.index,
          end: bare.index + bare[0].length,
        };
      }
    }
  }

  return null;
}

/** `14h`, `14h30`, `14:00`, `às 9h`. A bare number is never an hour. */
export function findTime(text: string): Found<string> | null {
  const match = /\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/i.exec(text);
  if (!match) return null;
  return {
    value: `${pad(Number(match[1]))}:${match[2] ?? "00"}`,
    start: match.index,
    end: match.index + match[0].length,
  };
}

/**
 * The price on the line. It has to look like money — a currency sign, or
 * cents, or the word — because a plain integer is far more likely to be part
 * of a name ("Sala 2", "Linha 66") than a price.
 */
export function findCost(text: string): Found<number> | null {
  const patterns = [
    /(?:€|eur|r\$|brl)\s*(\d{1,6})(?:[.,](\d{1,2}))?/i,
    /(\d{1,6})[.,](\d{2})\s*(?:€|eur|euros?|r\$|reais?)?\b/,
    /(\d{1,6}),(\d)(?!\d)\s*(?!km|kg|k?m\b|h\b|min)/i,
    /(\d{1,6})\s*(?:€|eur|euros?|reais?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const units = Number(match[1]);
    const cents = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
    if (!Number.isFinite(units)) continue;
    return {
      value: units * 100 + cents,
      start: match.index,
      end: match.index + match[0].length,
    };
  }
  return null;
}

/**
 * A range of dates on one line. The shape that matters most is "6 a 9 de
 * novembro", where the first day never says its own month — reading the two
 * dates independently would put the sixth in whatever month came before.
 */
export function findDateRange(
  text: string,
  year: number,
  defaultMonth: number | null,
): { from: string; to: string; start: number; end: number } | null {
  const SEP = "(?:\\s*(?:a|at[ée]|-|–|—|until|ao dia|至)\\s*)";

  // 6/11 a 9/11
  const bothNumeric = new RegExp(
    `\\b([0-3]?\\d)[/.-]([01]?\\d)${SEP}([0-3]?\\d)[/.-]([01]?\\d)\\b`,
    "i",
  ).exec(text);
  if (bothNumeric) {
    const [, d1, m1, d2, m2] = bothNumeric.map(Number);
    return {
      from: `${year}-${pad(m1)}-${pad(d1)}`,
      to: `${year}-${pad(m2)}-${pad(d2)}`,
      start: bothNumeric.index,
      end: bothNumeric.index + bothNumeric[0].length,
    };
  }

  // 6 a 9 de novembro — one month, shared by both days
  const sharedMonth = new RegExp(
    `\\b([0-3]?\\d)${SEP}([0-3]?\\d)\\s*(?:de\\s+)?(${MONTH_NAMES.join("|")})\\b`,
    "i",
  ).exec(text);
  if (sharedMonth) {
    const day1 = Number(sharedMonth[1]);
    const day2 = Number(sharedMonth[2]);
    const month = MONTHS[sharedMonth[3].toLowerCase()];
    if (month && day1 <= 31 && day2 <= 31) {
      return {
        from: `${year}-${pad(month)}-${pad(day1)}`,
        to: `${year}-${pad(month)}-${pad(day2)}`,
        start: sharedMonth.index,
        end: sharedMonth.index + sharedMonth[0].length,
      };
    }
  }

  // Anything else: two dates, each complete on its own.
  const first = findDate(text, year, defaultMonth);
  if (!first) return null;
  const rest = text.slice(first.end);
  const second = findDate(rest, year, monthOf(first.value));
  if (!second) return null;

  return {
    from: first.value,
    to: second.value,
    start: first.start,
    end: first.end + second.end,
  };
}

function cut(text: string, ...spans: Array<Found<unknown> | null>): string {
  let out = text;
  for (const span of spans.filter(Boolean).sort((a, b) => b!.start - a!.start)) {
    out = out.slice(0, span!.start) + " " + out.slice(span!.end);
  }
  return out;
}

const CONNECTOR =
  "de|do|da|em|no|na|a|ao|à|as|às|at[ée]|para|pra|entre|dia|dias|estarei|estou|vou|fico|ficarei|chego|saio";

const EDGE_START = new RegExp(`^(?:${CONNECTOR})(?![\\wÀ-ÿ])[\\s,:;.–—-]*`, "i");
const EDGE_END = new RegExp(`[\\s,:;.–—-]+(?:${CONNECTOR})$`, "i");

/**
 * What is left of a line once the dates and hours are cut out, as a city name.
 * Only the ends are stripped of connecting words: "Rio de Janeiro" has to keep
 * the one in the middle.
 */
function cityFrom(text: string): string {
  let out = text.replace(TIME_ANYWHERE, " ").replace(/[—–]/g, " ");
  let previous = "";
  while (out !== previous) {
    previous = out;
    out = out
      .replace(/\s+/g, " ")
      .trim()
      .replace(EDGE_START, "")
      .replace(EDGE_END, "")
      .replace(/^[\s,;:.–—-]+|[\s,;:.–—-]+$/g, "");
  }
  return out.trim();
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.–—-]+|[\s,;:.–—-]+$/g, "")
    .replace(LEAD_NOISE, "")
    .trim();
}

/**
 * @param year   the year to assume when a line does not say one
 * @param month  the month to assume for a bare "dia 7" — the trip's own month
 */
const ARRIVAL_OR_DEPARTURE = /\b(chego|chegada|chegar|chegando|saio|sa[ií]da|sair|saindo|parto)\b/i;
const ARRIVAL = /\b(chego|chegada|chegar|chegando)\b/i;
const DEPARTURE = /\b(saio|sa[ií]da|sair|saindo|parto)\b/i;
const TIME_ANYWHERE = /\b(?:[01]?\d|2[0-3])\s*(?:h|:)\s*(?:[0-5]\d)?\b/gi;

/**
 * Reads "chego 14h, saio 22h" into the stay's own two times. With only one
 * verb the single hour goes to the side it names; with neither, two hours in
 * order are taken as arrival and departure.
 */
function applyTimes(stay: ParsedStay, line: string): void {
  const arrivalAt = ARRIVAL.exec(line)?.index ?? -1;
  const departureAt = DEPARTURE.exec(line)?.index ?? -1;

  const times: Array<Found<string>> = [];
  let rest = line;
  let offset = 0;
  for (;;) {
    const found = findTime(rest);
    if (!found) break;
    times.push({ ...found, start: found.start + offset, end: found.end + offset });
    offset += found.end;
    rest = rest.slice(found.end);
  }
  if (times.length === 0) return;

  if (arrivalAt === -1 && departureAt === -1) {
    stay.fromTime ??= times[0].value;
    if (times[1]) stay.toTime ??= times[1].value;
    return;
  }

  for (const time of times) {
    // The verb a time belongs to is the nearest one before it.
    const afterArrival = arrivalAt !== -1 && time.start > arrivalAt;
    const afterDeparture = departureAt !== -1 && time.start > departureAt;

    if (afterDeparture && (!afterArrival || departureAt > arrivalAt)) {
      stay.toTime = time.value;
    } else if (afterArrival) {
      stay.fromTime = time.value;
    }
  }
}

export function parsePlan(text: string, year: number, month: number | null): ParsedPlan {
  const stays: ParsedStay[] = [];
  const items: ParsedItem[] = [];
  const unparsed: string[] = [];

  let currentDate: string | null = null;
  let currentMonth = month;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    // "chego 14h, saio 22h" on its own line refines the stay above it rather
    // than inventing an appointment called "saio".
    if (ARRIVAL_OR_DEPARTURE.test(line) && stays.length > 0) {
      applyTimes(stays[stays.length - 1], line);
      continue;
    }

    const range = findDateRange(line, year, currentMonth);

    if (range) {
      currentMonth = monthOf(range.from);
      currentDate = range.from;

      const city = cityFrom(cut(line, { value: null, start: range.start, end: range.end }));

      const stay: ParsedStay = {
        city,
        from: range.from,
        to: range.to,
        fromTime: null,
        toTime: null,
        line,
      };
      applyTimes(stay, line);

      if (stay.city) {
        stays.push(stay);
        continue;
      }

      // A range with no city is just a heading for the days that follow.
      continue;
    }

    const found = findDate(line, year, currentMonth);

    if (found) {
      currentMonth = monthOf(found.value);
      currentDate = found.value;

      const rest = tidy(cut(line, found));
      const time = findTime(rest);
      const cost = findCost(rest);
      const title = tidy(cut(rest, time, cost));
      if (!title) continue;

      items.push({
        date: found.value,
        time: time?.value ?? null,
        title,
        costCents: cost?.value ?? 0,
        category: categoryOf(title),
        line,
      });
      continue;
    }

    // No date on the line: it belongs to the day last named.
    if (!currentDate) {
      unparsed.push(line);
      continue;
    }

    const time = findTime(line);
    const cost = findCost(line);
    const title = tidy(cut(line, time, cost));

    if (!title) {
      unparsed.push(line);
      continue;
    }

    items.push({
      date: currentDate,
      time: time?.value ?? null,
      title,
      costCents: cost?.value ?? 0,
      category: categoryOf(title),
      line,
    });
  }

  return { stays, items, unparsed };
}
