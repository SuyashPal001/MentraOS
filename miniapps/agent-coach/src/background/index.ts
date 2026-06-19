/**
 * Background JSContext entry point — Agentic Coach miniapp.
 *
 * Loaded once by the MentraOS host inside a per-miniapp JSContext.
 * `registerMiniapp(...)` wires the handler to fire after CONNECT lands;
 * controllers constructed here live for the entire session, surviving
 * WebView open/close cycles.
 */

import { registerMiniapp } from "@mentra/miniapp/background";
import { CoachController } from "./controllers/CoachController";

registerMiniapp((session) => {
  try {
    const controller = new CoachController(session);
    controller.start();
    
    // Wire cleanup into session stop if supported
    if (typeof session.onClose === "function") {
      session.onClose(() => {
        controller.stop();
      });
    }
  } catch (err) {
    console.error("[agent-coach] CoachController failed to start:", err);
  }
});
