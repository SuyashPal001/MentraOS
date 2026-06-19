import type {
  MiniappSession,
  AccelData,
  TranscriptionData,
} from "@mentra/miniapp/background";

import type { Channels, CoachStateSnapshot } from "../../shared/channels";
import { createCoachAgent } from "../mastra/coach-agent";

type Send = <C extends keyof Channels & string>(channel: C, payload: Channels[C]) => void;

export class CoachController {
  private unsubs: Array<() => void> = [];
  private subscribed = false;
  private agent: any = null;

  // Canonical State
  private mode: "tempo" | "squat" = "tempo";
  private sessionState: "idle" | "running" | "paused" = "idle";
  private heartRate = 135;
  private cadence = 165;
  private speed = 9.8;
  private repCount = 0;
  private coachTip = "Click Start Workout on your phone dashboard!";
  private thoughtLogs: string[] = [];
  private speechCues: string[] = [];
  private connected = false;

  // Sensor processing state
  private lastStepTime = 0;
  private stepCount = 0;
  private lastAccelY = 1.0;
  private squatStage: "up" | "down" = "up";
  private lastSquatTime = 0;

  // Background loops
  private statsIntervalId: any = null;
  private coachCheckIntervalId: any = null;

  constructor(private readonly session: MiniappSession) {}

  start(): void {
    if (this.subscribed) return;
    this.subscribed = true;

    const ui = this.session.ui as unknown as {
      send: Send;
      onOpen: (cb: () => void) => () => void;
      on: <C extends keyof Channels & string>(
        channel: C,
        cb: (p: Channels[C]) => void,
      ) => () => void;
    };

    // Initialize Mastra Agent
    this.agent = createCoachAgent(
      this.session,
      (thought) => this.addThoughtLog(thought),
      (speech) => this.addSpeechCue(speech)
    );

    this.addThoughtLog("Mastra Agentic Coach initialized with Google Gemini 2.0 Flash.");

    // Subscribe to Glasses Connection Status
    this.unsubs.push(
      this.session.glasses.onConnection((data) => {
        this.connected = data.connected;
        ui.send("coach:connection-update", { connected: data.connected });
        this.addThoughtLog(`Glasses connection status changed: ${data.connected ? "Connected" : "Disconnected"}`);
      })
    );

    // Subscribe to Glasses IMU Accelerometer for real-time cadence / reps detection
    this.unsubs.push(
      this.session.imu.onAccel((data: AccelData) => {
        if (this.sessionState !== "running") return;
        this.processAccelerometer(data);
      })
    );

    // Subscribe to voice transcription commands
    this.unsubs.push(
      this.session.transcription.on((data: TranscriptionData) => {
        if (data.isFinal && data.text.trim()) {
          this.addThoughtLog(`Voice command transcribed: "${data.text.trim()}"`);
          this.handleVoiceCommand(data.text.trim().toLowerCase());
        }
      })
    );

    // Subscribe to UI lifecycle: Open / Hydrate
    this.unsubs.push(
      ui.onOpen(() => {
        ui.send("coach:snapshot", this.getSnapshot());
      })
    );

    // Subscribe to UI Actions
    this.unsubs.push(
      ui.on("coach:mode-select", ({ mode }) => {
        this.mode = mode;
        this.repCount = 0;
        this.statsIntervalId = null;
        if (mode === "squat") {
          this.coachTip = "Ready for Squats! Keep your chest open and head straight ahead.";
        } else {
          this.coachTip = "Ready for Tempo Run! Maintain light, quick strides.";
        }
        this.broadcastState({ mode, repCount: 0, coachTip: this.coachTip });
        this.addThoughtLog(`Workout mode changed to: ${mode.toUpperCase()}`);
      })
    );

    this.unsubs.push(
      ui.on("coach:session-action", ({ action }) => {
        this.handleSessionAction(action);
      })
    );

    this.unsubs.push(
      ui.on("coach:trigger-feedback", () => {
        this.addThoughtLog("Feedback triggered manually by user.");
        this.triggerAgentEvaluation();
      })
    );

    // Interactive IMU simulation triggers for easy testing / pitch presentations
    this.unsubs.push(
      ui.on("coach:simulate-imu", ({ type }) => {
        this.addThoughtLog(`Simulating movement pattern: "${type.toUpperCase()}"`);
        this.handleImuSimulation(type);
      })
    );

    // Start background bio-telemetry fluctuations loop (Heart Rate & Speed)
    this.startTelemetryLoop();
  }

  stop(): void {
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);
    if (this.coachCheckIntervalId) clearInterval(this.coachCheckIntervalId);
    
    for (const u of this.unsubs) {
      try {
        u();
      } catch {}
    }
    this.unsubs = [];
    this.subscribed = false;
  }

  private getSnapshot(): CoachStateSnapshot {
    return {
      mode: this.mode,
      sessionState: this.sessionState,
      heartRate: this.heartRate,
      cadence: this.cadence,
      speed: this.speed,
      repCount: this.repCount,
      coachTip: this.coachTip,
      thoughtLogs: [...this.thoughtLogs],
      speechCues: [...this.speechCues],
      glassesConnected: this.connected,
    };
  }

  private broadcastState(update: Partial<CoachStateSnapshot>) {
    const ui = this.session.ui as unknown as { send: Send };
    try {
      ui.send("coach:state-update", update);
    } catch {}
  }

  private addThoughtLog(text: string) {
    const timestamp = Date.now();
    this.thoughtLogs.push(`[${new Date(timestamp).toLocaleTimeString()}] ${text}`);
    if (this.thoughtLogs.length > 50) this.thoughtLogs.shift();
    
    const ui = this.session.ui as unknown as { send: Send };
    try {
      ui.send("coach:thought-log", { text, timestamp });
    } catch {}
  }

  private addSpeechCue(text: string) {
    const timestamp = Date.now();
    this.speechCues.push(text);
    if (this.speechCues.length > 30) this.speechCues.shift();

    const ui = this.session.ui as unknown as { send: Send };
    try {
      ui.send("coach:speech-cue", { text, timestamp });
    } catch {}
  }

  /**
   * Processes accelerometer data in real-time.
   * - In "tempo" mode: Calculates Cadence by analyzing rhythmic peak-detection on vertical acceleration axis.
   * - In "squat" mode: Counts Squat repetitions by detecting descent and ascent movement signatures.
   */
  private processAccelerometer(data: AccelData) {
    const now = data.timestamp || Date.now();
    
    if (this.mode === "tempo") {
      // Running Cadence: Peak-detection of vertical bobbing (gravity on Y axis)
      // Normal gravity is 1.0g. Active stride generates a spike > 1.45g.
      const accelY = data.y;
      const diff = accelY - this.lastAccelY;

      if (accelY > 1.4 && diff > 0.3 && now - this.lastStepTime > 280) { // Max cadence 214 bpm limit
        const msSinceLast = now - this.lastStepTime;
        this.lastStepTime = now;
        
        // Calculate instantaneous cadence
        const instantCadence = Math.round(60000 / msSinceLast);
        
        // Rolling average for stability
        this.cadence = Math.round(this.cadence * 0.7 + instantCadence * 0.3);
        
        // Clamp to logical running range for safety
        if (this.cadence < 100) this.cadence = 120;
        if (this.cadence > 220) this.cadence = 195;

        this.broadcastState({ cadence: this.cadence });
        
        // Auto alert if cadence is too sluggish
        if (this.cadence < 155 && Math.random() < 0.05) {
          this.addThoughtLog(`Physical cadence dipped to ${this.cadence} BPM. Form deviation detected.`);
          this.triggerAgentEvaluation();
        }
      }
      this.lastAccelY = accelY;

    } else if (this.mode === "squat") {
      // Squat form: descending vs ascending posture check.
      // Descent shifts Z axis acceleration forwards, gravity vector on Y axis decreases.
      const accelY = data.y;
      
      if (this.squatStage === "up" && accelY < 0.65 && now - this.lastSquatTime > 1200) {
        this.squatStage = "down";
        this.addThoughtLog("Squat phase: Descent detected. Tracking posture...");
      } else if (this.squatStage === "down" && accelY > 0.95) {
        this.squatStage = "up";
        this.repCount++;
        this.lastSquatTime = now;
        this.broadcastState({ repCount: this.repCount });
        this.addThoughtLog(`Squat phase: Ascent complete. Total Reps: ${this.repCount}`);
        
        // Congratulate on perfect repetition or update lens count
        this.session.display.showTextWall(`REPS: ${this.repCount}`).catch(() => {});
        
        // Auto coaching every 4 reps
        if (this.repCount % 4 === 0) {
          this.triggerAgentEvaluation();
        }
      }
    }
  }

  private handleVoiceCommand(cmd: string) {
    if (cmd.includes("start") || cmd.includes("begin")) {
      this.handleSessionAction("start");
    } else if (cmd.includes("pause") || cmd.includes("stop")) {
      this.handleSessionAction("pause");
    } else if (cmd.includes("reset") || cmd.includes("clear")) {
      this.handleSessionAction("reset");
    } else if (cmd.includes("coach") || cmd.includes("help") || cmd.includes("status")) {
      this.addThoughtLog("Voice prompt requested coaching assistance.");
      this.triggerAgentEvaluation();
    }
  }

  private handleSessionAction(action: "start" | "pause" | "reset") {
    this.sessionState = action === "start" ? "running" : action === "pause" ? "paused" : "idle";
    
    if (action === "start") {
      this.coachTip = this.mode === "tempo" ? "Running session active! Enjoying your pace." : "Squat trainer active! Maintain neutral posture.";
      this.addThoughtLog("Workout session started.");
      this.session.speaker.speak("Session started. Keep moving!").catch(() => {});
      this.session.display.showTextWall("WORKOUT RUNNING").catch(() => {});

      // Set up periodic coaching turns every 20 seconds
      if (this.coachCheckIntervalId) clearInterval(this.coachCheckIntervalId);
      this.coachCheckIntervalId = setInterval(() => {
        if (this.sessionState === "running") {
          this.addThoughtLog("Autonomous interval audit triggered.");
          this.triggerAgentEvaluation();
        }
      }, 20000);

    } else if (action === "pause") {
      this.coachTip = "Workout paused.";
      this.addThoughtLog("Workout session paused.");
      this.session.speaker.speak("Workout paused.").catch(() => {});
      this.session.display.showTextWall("WORKOUT PAUSED").catch(() => {});
      if (this.coachCheckIntervalId) {
        clearInterval(this.coachCheckIntervalId);
        this.coachCheckIntervalId = null;
      }

    } else if (action === "reset") {
      this.repCount = 0;
      this.heartRate = 135;
      this.cadence = 165;
      this.speed = 9.8;
      this.coachTip = "Session reset. Click Start to begin!";
      this.addThoughtLog("Workout session reset.");
      this.session.speaker.speak("Workout reset.").catch(() => {});
      this.session.display.clear().catch(() => {});
      if (this.coachCheckIntervalId) {
        clearInterval(this.coachCheckIntervalId);
        this.coachCheckIntervalId = null;
      }
    }

    this.broadcastState({
      sessionState: this.sessionState,
      repCount: this.repCount,
      coachTip: this.coachTip,
      cadence: this.cadence,
      heartRate: this.heartRate,
      speed: this.speed,
    });
  }

  /** Fluctuate physiological stats organically while session is running to show 'living' telemetry */
  private startTelemetryLoop() {
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);
    
    this.statsIntervalId = setInterval(() => {
      if (this.sessionState !== "running") return;

      if (this.mode === "tempo") {
        // Heart rate climbs and fluctuates between 140 and 172
        const hrDelta = Math.round((Math.random() - 0.4) * 4); // upwards bias
        this.heartRate = Math.max(130, Math.min(180, this.heartRate + hrDelta));

        // Speed fluctuates based on cadence and random fatigue
        const speedBase = (this.cadence / 170) * 10.5;
        this.speed = Math.max(6.0, Math.min(16.0, Number((speedBase + (Math.random() - 0.5) * 1.5).toFixed(1))));

        // Cadence drifts slightly
        this.cadence = Math.max(130, Math.min(200, this.cadence + Math.round((Math.random() - 0.5) * 4)));
        
        this.broadcastState({
          heartRate: this.heartRate,
          speed: this.speed,
          cadence: this.cadence,
        });

      } else if (this.mode === "squat") {
        // Heart rate climbs slightly during reps
        const hrDelta = Math.round((Math.random() - 0.3) * 2);
        this.heartRate = Math.max(110, Math.min(150, this.heartRate + hrDelta));
        
        this.broadcastState({
          heartRate: this.heartRate,
        });
      }
    }, 2500);
  }

  /** Performs an asynchronous Coaching Turn with Mastra Agent */
  private async triggerAgentEvaluation() {
    if (!this.agent) {
      this.addThoughtLog("Agent not initialized yet.");
      return;
    }

    this.addThoughtLog("AI Coach: Starting reasoning loop...");
    
    const contextPrompt = `Evaluate this user's exercising data and execute a tool (speak, write to HUD, or metronome) if necessary.
Workout Mode: ${this.mode.toUpperCase()}
Session State: ${this.sessionState.toUpperCase()}
Physiological/Motion Data:
- Heart Rate: ${this.heartRate} BPM
- Speed: ${this.speed} km/h
- Cadence: ${this.cadence} Steps per Minute (Standard range: 170-185)
- Completed Repetitions: ${this.repCount}
- Glasses Connected: ${this.connected}

Think step-by-step. Is their cadence low? Is their heart rate dangerously high? Provide a coaching cue via the speaker and HUD display. Always call tools to interact with the athlete. If they are doing well, encourage them. Give a final short summary tip as your final text response.`;

    try {
      const response = await this.agent.generate(contextPrompt);
      
      const finalText = response.text || "Keep up the excellent effort!";
      this.coachTip = finalText;
      this.broadcastState({ coachTip: finalText });
      this.addThoughtLog(`AI Coach reasoning complete. Summary tip: "${finalText}"`);
    } catch (err) {
      console.error("[CoachController] Agent evaluation failed:", err);
      this.addThoughtLog(`Agent error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Action simulator for pitch presentations and simulator testing.
   */
  private handleImuSimulation(type: "bobbing" | "good-squat" | "bad-squat" | "slump") {
    const now = Date.now();
    
    if (type === "bobbing") {
      this.addThoughtLog("Simulating rapid running bobbing (good steps).");
      // Generate multiple step accel data points over 1.5 seconds
      let stepsSimulated = 0;
      const interval = setInterval(() => {
        stepsSimulated++;
        if (stepsSimulated > 5) {
          clearInterval(interval);
          return;
        }
        // Send simulated Accel step
        this.processAccelerometer({
          x: 0.1,
          y: 1.55, // Trigger peak
          z: -0.2,
          timestamp: now + stepsSimulated * 320, // ~187 BPM cadence
        });
      }, 320);

    } else if (type === "good-squat") {
      this.addThoughtLog("Simulating perfect squat repetition.");
      // 1. Descend
      this.processAccelerometer({
        x: -0.1,
        y: 0.52, // Descent trigger
        z: 0.8,
        timestamp: now,
      });
      // 2. Ascend after 1.5s
      setTimeout(() => {
        this.processAccelerometer({
          x: 0.0,
          y: 1.05, // Ascent trigger
          z: 0.1,
          timestamp: now + 1500,
        });
      }, 1500);

    } else if (type === "bad-squat") {
      this.addThoughtLog("Simulating incomplete/shallow squat rep.");
      this.processAccelerometer({
        x: -0.05,
        y: 0.78, // Shallow descent (does not hit 0.65 threshold)
        z: 0.4,
        timestamp: now,
      });
      setTimeout(() => {
        this.addThoughtLog("Form alert: Shallow descent. Squat range of motion incomplete.");
        this.session.display.showTextWall("FORM: SQUAT DEEPER!").catch(() => {});
        this.session.speaker.speak("Squat deeper to engage your glutes.").catch(() => {});
      }, 1000);

    } else if (type === "slump") {
      this.addThoughtLog("Simulating head-tilted posture slump.");
      // Low head pitch / chin on chest causes gravity to shift to the Z axis, Y drops.
      this.session.display.showTextWall("POSTURE ALERT!").catch(() => {});
      this.session.speaker.speak("Lift your gaze. Keep your chest up!").catch(() => {});
      
      // Request AI Coach to chime in
      setTimeout(() => {
        this.triggerAgentEvaluation();
      }, 1500);
    }
  }
}
