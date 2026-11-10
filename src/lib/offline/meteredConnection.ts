// Whether the current connection is probably paid by the megabyte: mobile data, or the learner
// asked the browser to save data. The Network Information API only exists in Chromium browsers;
// elsewhere nothing is known and no warning is shown.
export type ConnectionInfo = { type?: string; saveData?: boolean; effectiveType?: string };
export type MeteredReason = 'cellular' | 'save-data' | 'slow';

export function meteredReason(connection: ConnectionInfo | null | undefined): MeteredReason | null {
  if (!connection) return null;
  if (connection.saveData) return 'save-data';
  if (connection.type === 'cellular') return 'cellular';
  if (connection.type === undefined && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.effectiveType === '3g')) return 'slow';
  return null;
}

export function currentConnection(): ConnectionInfo | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: ConnectionInfo }).connection ?? null;
}
