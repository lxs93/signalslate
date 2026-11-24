// Case- and accent-insensitive, so "de la Cruz" sorts with the Cs and "Émile"
// with the Es. The database's own ordering (collation C) puts lowercase last.
const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

type Named = { firstName: string; lastName: string };

/** Class-list order: last name, then first name. Students with one name sort by it. */
export function byLastName(a: Named, b: Named): number {
  return collator.compare(a.lastName || a.firstName, b.lastName || b.firstName) || collator.compare(a.firstName, b.firstName);
}

/** Picker order, as students see themselves: first name, then last name. */
export function byFirstName(a: Named, b: Named): number {
  return collator.compare(a.firstName, b.firstName) || collator.compare(a.lastName, b.lastName);
}

/** Compares two display names such as "Lily Chen". */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}
