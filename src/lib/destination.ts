export interface DestinationInput {
  destination?: string | null;
  destinationCountryRegion?: string | null;
  destinationCity?: string | null;
  destinationPlace?: string | null;
  destinationNote?: string | null;
}

export interface StandardizedDestination {
  destination: string;
  destinationCountryRegion: string;
  destinationCity: string;
  destinationPlace: string;
  destinationNote: string;
}

const COUNTRY_REGION_HINTS = new Set([
  "中国",
  "中国大陆",
  "香港",
  "澳门",
  "台湾",
  "日本",
  "韩国",
  "新加坡",
  "泰国",
  "马来西亚",
  "越南",
  "美国",
  "英国",
  "法国",
  "德国",
  "意大利",
  "西班牙",
  "澳大利亚",
  "新西兰",
  "加拿大",
  "usa",
  "us",
  "u.s.",
  "uk",
  "uae",
]);

export function cleanDestinationPart(value?: string | null, maxLength = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function tokenizeDestination(value?: string | null) {
  const cleaned = cleanDestinationPart(value, 240);
  if (!cleaned) return [];

  const separator = /[A-Za-z]/.test(cleaned)
    ? /[·,，、/|｜>→\-]+/
    : /[·,，、/|｜>→\-\s]+/;

  return cleaned
    .split(separator)
    .map((part) => cleanDestinationPart(part, 80))
    .filter(Boolean)
    .slice(0, 6);
}

function looksLikeCountryRegion(value: string) {
  const normalized = value.toLowerCase();
  return (
    COUNTRY_REGION_HINTS.has(value) ||
    COUNTRY_REGION_HINTS.has(normalized) ||
    /(?:国|地区|省|州|自治区|特别行政区)$/.test(value)
  );
}

function inferFromDestination(value?: string | null) {
  const parts = tokenizeDestination(value);
  const inferred = {
    destinationCountryRegion: "",
    destinationCity: "",
    destinationPlace: "",
  };

  if (parts.length >= 3) {
    inferred.destinationCountryRegion = parts[0];
    inferred.destinationCity = parts[1];
    inferred.destinationPlace = parts.slice(2).join(" · ");
    return inferred;
  }

  if (parts.length === 2) {
    if (looksLikeCountryRegion(parts[0])) {
      inferred.destinationCountryRegion = parts[0];
      inferred.destinationCity = parts[1];
    } else {
      inferred.destinationCity = parts[0];
      inferred.destinationPlace = parts[1];
    }
    return inferred;
  }

  if (parts.length === 1) {
    inferred.destinationCity = parts[0];
  }

  return inferred;
}

export function buildDestinationLabel(input: DestinationInput) {
  const parts = [
    cleanDestinationPart(input.destinationCountryRegion, 80),
    cleanDestinationPart(input.destinationCity, 80),
    cleanDestinationPart(input.destinationPlace, 120),
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" · ");

  const fallbackDestination = cleanDestinationPart(input.destination, 160);
  if (fallbackDestination) return fallbackDestination;

  return cleanDestinationPart(input.destinationNote, 160);
}

export function standardizeDestinationLocal(input: DestinationInput): StandardizedDestination {
  const inferred = inferFromDestination(input.destination);
  const destinationCountryRegion =
    cleanDestinationPart(input.destinationCountryRegion, 80) || inferred.destinationCountryRegion;
  const destinationCity =
    cleanDestinationPart(input.destinationCity, 80) || inferred.destinationCity;
  const destinationPlace =
    cleanDestinationPart(input.destinationPlace, 120) || inferred.destinationPlace;
  const destinationNote = cleanDestinationPart(input.destinationNote, 240);
  const destination = buildDestinationLabel({
    destination: input.destination,
    destinationCountryRegion,
    destinationCity,
    destinationPlace,
    destinationNote,
  });

  return {
    destination,
    destinationCountryRegion,
    destinationCity,
    destinationPlace,
    destinationNote,
  };
}
