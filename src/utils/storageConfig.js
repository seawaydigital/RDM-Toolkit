// Validation for the Storage Calculator's shareable `?config=` link.
//
// The link is meant to be passed around, so whatever it carries is untrusted.
// Before this check the decoded object went straight into React state, and
// two of its fields (the format label and the backup multiplier) are written
// verbatim into the DMP storage statement that researchers copy into grant
// applications — a crafted link could put any text there. React escapes it,
// so this was never script injection, but it was content injection.
//
// Everything is checked against what the calculator itself can produce: known
// file ids, finite non-negative numbers, format labels that exist for that
// file type, and the same ranges the sliders allow. Anything else is dropped.

const MAX_QUANTITY = 1e9;

function quantity(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_QUANTITY
    ? value
    : undefined;
}

function integerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} raw  Parsed JSON from the ?config= parameter.
 * @param {(id: string) => ({ file: { id: string, formats?: { label: string }[] } } | null)} findFileById
 * @returns {object} Only the fields that passed validation.
 */
export function sanitizeStorageConfig(raw, findFileById) {
  if (!isPlainObject(raw)) return {};

  const perFile = (value, check) => {
    if (!isPlainObject(value)) return undefined;
    const result = {};
    for (const [id, entry] of Object.entries(value)) {
      const found = findFileById(id);
      if (!found) continue;
      const clean = check(entry, found.file);
      // Key by the registry's own id, never the link's string, so no property
      // name written here can come from the link.
      if (clean !== undefined) result[found.file.id] = clean;
    }
    return result;
  };

  const config = {
    inputs: perFile(raw.inputs, quantity),
    fileSizes: perFile(raw.fileSizes, quantity),
    durations: perFile(raw.durations, quantity),
    formatSelections: perFile(raw.formatSelections, (label, file) =>
      typeof label === 'string' && (file.formats || []).some((format) => format.label === label)
        ? label
        : undefined),
    multiplier: integerInRange(raw.multiplier, 1, 10),
    activeDuration: integerInRange(raw.activeDuration, 1, 10),
    archivalDuration: integerInRange(raw.archivalDuration, 1, 25),
    indigenousData: typeof raw.indigenousData === 'boolean' ? raw.indigenousData : undefined,
    customCount: quantity(raw.customCount),
    customSize: quantity(raw.customSize),
  };

  for (const key of Object.keys(config)) {
    if (config[key] === undefined) delete config[key];
  }
  return config;
}

/**
 * Decode a ?config= value (base64 JSON). Returns {} for anything malformed.
 */
export function decodeStorageConfig(encoded, findFileById) {
  try {
    return sanitizeStorageConfig(JSON.parse(atob(encoded)), findFileById);
  } catch {
    return {};
  }
}
