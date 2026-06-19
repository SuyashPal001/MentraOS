/**
 * Typed channel registry — the single source of truth for every name
 * that flows between this miniapp's background JSContext and its UI
 * WebView. Both halves import this file at build time; the bundler
 * inlines the declarations.
 */

export interface CoachStateSnapshot {
  mode: "tempo" | "squat";
  sessionState: "idle" | "running" | "paused";
  heartRate: number;
  cadence: number;
  speed: number;
  repCount: number;
  coachTip: string;
  thoughtLogs: string[];
  speechCues: string[];
  glassesConnected: boolean;
}

export interface Channels {
  // ── background → UI broadcasts ──────────────────────────────────────────

  "coach:snapshot": CoachStateSnapshot;

  "coach:state-update": {
    mode?: "tempo" | "squat";
    sessionState?: "idle" | "running" | "paused";
    heartRate?: number;
    cadence?: number;
    speed?: number;
    repCount?: number;
    coachTip?: string;
  };

  /** Adds a new thought/reasoning log from the Mastra Agent. */
  "coach:thought-log": {
    text: string;
    timestamp: number;
  };

  /** Logs a spoken coaching cue. */
  "coach:speech-cue": {
    text: string;
    timestamp: number;
  };

  /** Glasses connection status. */
  "coach:connection-update": {
    connected: boolean;
  };

  // ── UI → background broadcasts ──────────────────────────────────────────

  /** Select workout mode. */
  "coach:mode-select": {
    mode: "tempo" | "squat";
  };

  /** Control workout session. */
  "coach:session-action": {
    action: "start" | "pause" | "reset";
  };

  /** Manually request the AI Agent to evaluate status and give feedback. */
  "coach:trigger-feedback": Record<string, never>;

  /** Simulate physical actions (for testing on simulator without live glasses/running). */
  "coach:simulate-imu": {
    type: "bobbing" | "good-squat" | "bad-squat" | "slump";
  };
}

declare global {
  // eslint-disable-next-line no-var
  var mentra: import("@mentra/miniapp/ui").MentraTyped<Channels>;
}
