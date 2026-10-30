export type UploadType = 'DRIVING_LICENCE' | 'INSURANCE';
export type VerificationDocument = {id: string; type: string; status: string; createdAt?: string | null; expiresAt?: string | null; insurer?: string | null; policyNumber?: string | null};
export const requiredDocumentTypes: UploadType[] = ['DRIVING_LICENCE', 'INSURANCE'];

/** One current card per required type; older records remain available for review. */
export function currentVerificationDocuments(documents: VerificationDocument[]) {
  return requiredDocumentTypes.flatMap(type => {
    const matching = documents.filter(document => document.type === type);
    const latest = matching.reduce<VerificationDocument | undefined>((current, document) => {
      if (!current) return document;
      return new Date(document.createdAt || 0).getTime() > new Date(current.createdAt || 0).getTime() ? document : current;
    }, undefined);
    return latest ? [latest] : [];
  });
}

export function verificationDocumentStatus(document: VerificationDocument) {
  return document.expiresAt && new Date(document.expiresAt) < new Date() ? 'EXPIRED' : document.status;
}
