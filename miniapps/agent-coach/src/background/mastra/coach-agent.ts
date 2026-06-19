import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { MiniappSession } from "@mentra/miniapp/background";

/**
 * Constructs the Mastra AI Coach Agent dynamically, binding it to the active device session.
 */
export function createCoachAgent(
  session: MiniappSession,
  onThought: (thought: string) => void,
  onSpeak: (text: string) => void
) {
  // 1. Define Speak Coach Tool
  const speakCoachTool = createTool({
    id: "speak_coach",
    description: "Speak concise tactical coaching cues, breathing adjustments, or encouragement directly into the user's smart glasses speaker.",
    inputSchema: z.object({
      phrase: z.string().describe("A very short, direct audio cue (max 10 words). Example: 'Cadence low, pick up the pace!'"),
    }),
    execute: async ({ phrase }: { phrase: string }) => {
      onThought(`Tool Executed (Mastra): speak_coach("${phrase}")`);
      try {
        onSpeak(phrase);
        await session.speaker.speak(phrase);
      } catch (err) {
        console.error("[CoachAgent] speak_coach failed:", err);
      }
      return { success: true, spoken: phrase };
    },
  });

  // 2. Define Write to Lens Tool
  const writeToLensTool = createTool({
    id: "write_to_lens",
    description: "Write direct visual alerts or real-time HUD corrections onto the smart glasses lens display.",
    inputSchema: z.object({
      text: z.string().describe("Concise HUD text (max 20 characters). Example: 'CADENCE: 155 BPM' or 'POSTURE UP!'"),
    }),
    execute: async ({ text }: { text: string }) => {
      onThought(`Tool Executed (Mastra): write_to_lens("${text}")`);
      try {
        await session.display.showTextWall(text);
      } catch (err) {
        console.error("[CoachAgent] write_to_lens failed:", err);
      }
      return { success: true, displayed: text };
    },
  });

  // 3. Define Trigger Metronome Tool
  const triggerMetronomeTool = createTool({
    id: "trigger_metronome",
    description: "Trigger an audio-visual metronome rhythm on the smart glasses to guide running cadence or squat repetitions.",
    inputSchema: z.object({
      bpm: z.number().describe("Beats per minute. For running, typically 170-185. For squats, typically 30-40."),
      durationSeconds: z.number().default(10).describe("Duration in seconds to play the rhythmic assist."),
    }),
    execute: async ({ bpm, durationSeconds }: { bpm: number; durationSeconds: number }) => {
      onThought(`Tool Executed (Mastra): trigger_metronome(BPM=${bpm}, Duration=${durationSeconds}s)`);
      try {
        const intro = `Starting pacing assist at ${bpm} BPM`;
        onSpeak(intro);
        await session.speaker.speak(intro);
        await session.display.showTextWall(`[PACE BEAT: ${bpm} BPM]`);

        let count = 0;
        const intervalId = setInterval(async () => {
          count++;
          if (count > (bpm / 60) * durationSeconds) {
            clearInterval(intervalId);
            return;
          }
          try {
            await session.display.showTextWall(`• PACE •\n${bpm} BPM`);
          } catch {}
        }, (60 / bpm) * 1000);

        setTimeout(() => {
          clearInterval(intervalId);
          session.display.showTextWall("").catch(() => {});
        }, durationSeconds * 1000);

      } catch (err) {
        console.error("[CoachAgent] trigger_metronome failed:", err);
      }
      return { success: true, bpm };
    },
  });

  // 4. Create and Return Mastra Agent
  return new Agent({
    name: "CoachAgent",
    instructions: `You are an elite, personal athletic AI Coach running inside the MentraOS smart glasses framework.
You monitor real-time bio-telemetry and motion sensor data of athletes while they run or perform exercises.

Workout Modes:
1. "tempo": Running / Pace Tracking. Monitor Heart Rate, Cadence (BPM), and Speed (km/h).
   - Target Running Cadence: 170 - 185 steps per minute.
   - Heart Rate: High HR (> 165) means they need to pace their breathing.
2. "squat": Squat Repetition Trainer. Monitor reps and movement posture.
   - Target Posture: Neutral head-position. Look straight ahead, not slouched or slumped.

Key Guidelines:
- Because the athlete is exercising, your cues MUST be incredibly short, clear, and eyes-up. No long explanations.
- Speak direct cues aloud using "speak_coach".
- Update critical statistics on their lens HUD using "write_to_lens".
- If their cadence is lagging behind the target (e.g. cadence < 165 in running), trigger the "trigger_metronome" tool to help them synchronize their gait.
- Be supportive, energetic, and elite, like an Olympic coach.
- ALWAYS use tools to communicate if changes are needed. Summarize your feedback in the final response as a short coaching tip.`,
    model: google("gemini-2.5-flash"),
    tools: {
      speak_coach: speakCoachTool,
      write_to_lens: writeToLensTool,
      trigger_metronome: triggerMetronomeTool,
    },
  });
}
