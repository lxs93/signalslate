interface NamedSubmission {
  studentId: string | null;
  studentName: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Find which student the AI meant by a name it returned. Tries the exact
 * full name, then a first name that only one submitter has. Returns null
 * when the name is ambiguous or unknown, so a flag is never linked to the
 * wrong student.
 */
export function matchStudentId(name: string, submissions: NamedSubmission[]): string | null {
  const target = norm(name);
  const unique = (ids: (string | null)[]) => {
    const set = new Set(ids);
    return set.size === 1 ? [...set][0] : null;
  };

  const exact = submissions.filter((s) => norm(s.studentName) === target);
  if (exact.length > 0) return unique(exact.map((s) => s.studentId));

  const first = target.split(" ")[0];
  const byFirst = submissions.filter((s) => norm(s.studentName).split(" ")[0] === first);
  if (byFirst.length > 0) return unique(byFirst.map((s) => s.studentId));

  return null;
}
