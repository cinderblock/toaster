type SimpleRegex = RegExp | (RegExp | string)[] | null;

function isRegExp(r: RegExp | string): r is RegExp {
  return r instanceof RegExp;
}

function convertSimpleRegex(regex: SimpleRegex): RegExp {
  if (!regex) {
    return /[^,]+/;
  }

  if (regex instanceof RegExp) {
    return regex;
  }

  // Array of strings or regexes are or'd together
  return new RegExp(regex.map(r => (isRegExp(r) ? r.source : r)).join('|'));
}

export function simpleRegExpCSV(columns: Record<string, SimpleRegex>) {
  const body = Object.entries(columns)
    .map(([name, r]) => `\\s+(?<${name}>${convertSimpleRegex(r).source})`)
    .join(',');

  return new RegExp(`^${body}$`);
}

// cSpell:ignore regexes
