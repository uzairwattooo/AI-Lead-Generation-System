export interface SmoothProgressInput {
  displayed: number;
  reported: number;
  elapsedSeconds: number;
  terminal: boolean;
}

/**
 * Keeps the progress bar moving between backend updates without changing the
 * stored workflow state. Active runs stop at 94%; only a terminal backend
 * state may display 100%.
 */
export function nextSmoothProgress({
  displayed,
  reported,
  elapsedSeconds,
  terminal,
}: SmoothProgressInput): number {
  if (terminal) return 100;

  const current = Math.max(0, Math.min(94, Math.round(displayed)));
  const backendFloor = Math.max(0, Math.min(94, Math.round(reported)));
  const timeEstimate = Math.min(94, 4 + Math.floor(Math.max(0, elapsedSeconds) / 4));
  const target = Math.max(backendFloor, timeEstimate);

  if (current >= target) return current;
  return Math.min(94, current + 1);
}

export function initialSmoothProgress(
  reported: number,
  elapsedSeconds: number,
  terminal: boolean,
): number {
  if (terminal) return 100;
  return Math.min(
    94,
    Math.max(
      Math.max(0, Math.round(reported)),
      4 + Math.floor(Math.max(0, elapsedSeconds) / 8),
    ),
  );
}
