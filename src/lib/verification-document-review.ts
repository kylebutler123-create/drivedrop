export type ReviewDocument = {
  id: string;
  type: string;
  status: string;
  createdAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  documentUrl?: string | null;
  insurer?: string | null;
  policyNumber?: string | null;
  reviewNote?: string | null;
  uploaderId?: string;
};

export const verificationLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const timestamp = (value: ReviewDocument["createdAt"]) =>
  value ? new Date(value).getTime() || 0 : 0;
export function orderedReviewDocuments(documents: ReviewDocument[]) {
  return [...documents].sort(
    (a, b) =>
      timestamp(b.createdAt) - timestamp(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
}

export function documentReviewGroups(documents: ReviewDocument[]) {
  const sorted = orderedReviewDocuments(documents);
  const types = [
    ...new Set(["INSURANCE", "DRIVING_LICENCE", ...sorted.map((d) => d.type)]),
  ];
  return types.map((type) => {
    const versions = sorted.filter((d) => d.type === type);
    const pending = versions.filter((d) => d.status === "PENDING");
    // Never hide an older pending upload or mistake a reviewed version for a new one.
    const current = pending.length ? pending : versions.slice(0, 1);
    const shown = new Set(current.map((d) => d.id));
    return {
      type,
      newestId: versions[0]?.id,
      current,
      history: versions.filter((d) => !shown.has(d.id)),
    };
  });
}

export function documentStoredFilename(document: ReviewDocument) {
  const path = (document.documentUrl || "").split(/[?#]/)[0];
  const name = path.split("/").filter(Boolean).at(-1);
  if (!name) return `Document ${document.id}`;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export function uploadDateLabel(value: ReviewDocument["createdAt"]) {
  if (!value || !Number.isFinite(new Date(value).getTime()))
    return "Upload time not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export function verificationDate(
  value: ReviewDocument["createdAt"],
  long = false,
) {
  if (!value || !Number.isFinite(new Date(value).getTime()))
    return "Not provided";
  return new Intl.DateTimeFormat("en-GB", {
    day: long ? "numeric" : "2-digit",
    month: long ? "long" : "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
