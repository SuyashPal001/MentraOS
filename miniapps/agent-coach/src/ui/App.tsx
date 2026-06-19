import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Activity,
  Flame,
  RefreshCw,
  Play,
  Pause,
  Compass,
  Cpu,
  Tv,
  Wifi,
  WifiOff,
  AlertTriangle,
  PlayCircle,
  Dumbbell
} from "lucide-react";

import type { CoachStateSnapshot } from "../shared/channels";

interface ThoughtLogEntry {
  text: string;
  timestamp: number;
}

interface SpeechCueEntry {
  text: string;
  timestamp: number;
}

export default function App() {
  // Sync'd State from Background JSContext
  const [mode, setMode] = useState<"tempo" | "squat">("tempo");
  const [sessionState, setSessionState] = useState<"idle" | "running" | "paused">("idle");
  const [heartRate, setHeartRate] = useState(135);
  const [cadence, setCadence] = useState(165);
  const [speed, setSpeed] = useState(9.8);
  const [repCount, setRepCount] = useState(0);
  const [coachTip, setCoachTip] = useState("Click Start Session to begin!");
  const [glassesConnected, setGlassesConnected] = useState(false);

  // Lists with limits
  const [thoughtLogs, setThoughtLogs] = useState<ThoughtLogEntry[]>([]);
  const [speechCues, setSpeechCues] = useState<SpeechCueEntry[]>([]);

  // UI tabs/options
  const [activeTab, setActiveTab] = useState<"dashboard" | "simulator">("dashboard");

  // Auto scroll refs
  const thoughtTerminalEndRef = useRef<HTMLDivElement>(null);
  const speechTerminalEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to background state updates
  useEffect(() => {
    // 1. Initial snapshot hydration on WebView mounting
    const unsubSnapshot = mentra.on("coach:snapshot", (snapshot: CoachStateSnapshot) => {
      setMode(snapshot.mode);
      setSessionState(snapshot.sessionState);
      setHeartRate(snapshot.heartRate);
      setCadence(snapshot.cadence);
      setSpeed(snapshot.speed);
      setRepCount(snapshot.repCount);
      setCoachTip(snapshot.coachTip);
      setGlassesConnected(snapshot.glassesConnected);
      
      const formattedThoughts = snapshot.thoughtLogs.map(text => ({ text, timestamp: Date.now() }));
      const formattedSpeech = snapshot.speechCues.map(text => ({ text, timestamp: Date.now() }));
      setThoughtLogs(formattedThoughts);
      setSpeechCues(formattedSpeech);
    });

    // 2. Incremental state updates
    const unsubState = mentra.on("coach:state-update", (update) => {
      if (update.mode !== undefined) setMode(update.mode);
      if (update.sessionState !== undefined) setSessionState(update.sessionState);
      if (update.heartRate !== undefined) setHeartRate(update.heartRate);
      if (update.cadence !== undefined) setCadence(update.cadence);
      if (update.speed !== undefined) setSpeed(update.speed);
      if (update.repCount !== undefined) setRepCount(update.repCount);
      if (update.coachTip !== undefined) setCoachTip(update.coachTip);
    });

    // 3. New Thought log entries
    const unsubThought = mentra.on("coach:thought-log", (entry) => {
      setThoughtLogs((prev) => [...prev.slice(-49), entry]);
    });

    // 4. New Speech cue entries
    const unsubSpeech = mentra.on("coach:speech-cue", (entry) => {
      setSpeechCues((prev) => [...prev.slice(-29), entry]);
    });

    // 5. Connection updates
    const unsubConn = mentra.on("coach:connection-update", ({ connected }) => {
      setGlassesConnected(connected);
    });

    return () => {
      unsubSnapshot();
      unsubState();
      unsubThought();
      unsubSpeech();
      unsubConn();
    };
  }, []);

  // Handle scrolling of terminals
  useEffect(() => {
    thoughtTerminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thoughtLogs]);

  useEffect(() => {
    speechTerminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [speechCues]);

  // UI trigger functions
  const handleModeChange = (newMode: "tempo" | "squat") => {
    setMode(newMode);
    mentra.send("coach:mode-select", { mode: newMode });
  };

  const handleAction = (action: "start" | "pause" | "reset") => {
    setSessionState(action === "start" ? "running" : action === "pause" ? "paused" : "idle");
    mentra.send("coach:session-action", { action });
  };

  const triggerFeedback = () => {
    mentra.send("coach:trigger-feedback", {});
  };

  const simulateIMU = (type: "bobbing" | "good-squat" | "bad-squat" | "slump") => {
    mentra.send("coach:simulate-imu", { type });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1020] via-[#080a13] to-[#040609] p-4 pb-12 flex flex-col select-none">
      
      {/* GLOWING HEADER */}
      <header className="flex justify-between items-center mb-6 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-emerald-500/20 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/25 shadow-lg shadow-emerald-500/10">
            <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-emerald-400 bg-clip-text text-transparent">
              AGENTIC COACH
            </h1>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
              Mastra + Gemini 2.5 HUD OS
            </p>
          </div>
        </div>

        {/* CONNECTION PILL */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all duration-300 ${
          glassesConnected 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-md shadow-emerald-500/5" 
            : "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-md shadow-amber-500/5"
        }`}>
          {glassesConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>GLASSES G2 CONNECTED</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute right-3" />
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>OFFLINE (SIMULATION MODE)</span>
            </>
          )}
        </div>
      </header>

      {/* TOP NAVIGATION TABS */}
      <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1.5 mb-6 shadow-inner">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            activeTab === "dashboard"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>VITAL DASHBOARD</span>
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            activeTab === "simulator"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>MOTION SIMULATOR</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "dashboard" ? (
        <div className="flex-1 flex flex-col space-y-6">

          {/* MASTER COACH HUD BOX */}
          <section className="bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-teal-500/10 rounded-full filter blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                LIVE GLASSES HUD FEEDBACK
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-emerald-500/15 rounded-2xl border border-emerald-500/25 mt-0.5">
                <Cpu className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                  Latest Coaching Command
                </h3>
                <p className="text-base font-bold text-white leading-relaxed tracking-wide">
                  "{coachTip}"
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                Want immediate coaching feedback based on your current statistics?
              </span>
              <button
                onClick={triggerFeedback}
                disabled={sessionState !== "running"}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border border-emerald-500/30 transition-all duration-300 select-none ${
                  sessionState === "running"
                    ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 active:scale-95"
                    : "opacity-40 cursor-not-allowed text-gray-500"
                }`}
              >
                REQUEST FEEDBACK
              </button>
            </div>
          </section>

          {/* TELEMETRY CARDS */}
          <section className="grid grid-cols-2 gap-4">
            
            {/* HEART RATE CARD */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-rose-500/15 rounded-xl border border-rose-500/20">
                  <Heart className={`w-4 h-4 text-rose-400 ${sessionState === "running" ? "animate-[ping_1.2s_infinite]" : ""}`} />
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vitals</span>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-white tracking-tighter">
                  {heartRate}
                </span>
                <span className="text-xs text-gray-400 font-semibold ml-1">BPM</span>
                <h4 className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Heart Rate</h4>
              </div>
              
              {/* Vitals Rating Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    heartRate > 165 ? "bg-rose-500" : heartRate > 145 ? "bg-amber-400" : "bg-emerald-400"
                  }`} 
                  style={{ width: `${Math.min(100, ((heartRate - 60) / 120) * 100)}%` }} 
                />
              </div>
            </div>

            {/* SPEED & CADENCE OR REPS CARD BASED ON MODE */}
            {mode === "tempo" ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
                    <Activity className={`w-4 h-4 text-emerald-400 ${sessionState === "running" ? "animate-[bounce_1.5s_infinite]" : ""}`} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cadence</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-white tracking-tighter">
                    {cadence}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold ml-1">SPM</span>
                  <h4 className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Running Cadence</h4>
                </div>
                
                {/* Cadence indicator bar */}
                <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      cadence >= 170 && cadence <= 185 ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(100, (cadence / 200) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-teal-500/15 rounded-xl border border-teal-500/20">
                    <Dumbbell className="w-4 h-4 text-teal-400" />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Squats</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-white tracking-tighter">
                    {repCount}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold ml-1">REPS</span>
                  <h4 className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Completed Squats</h4>
                </div>
                
                <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (repCount / 15) * 100)}%` }} />
                </div>
              </div>
            )}
          </section>

          {/* TELEMETRY ROW 2 (SPEED - RUNNING ONLY) */}
          {mode === "tempo" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-500/20">
                  <Flame className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Pace</h4>
                  <p className="text-sm font-extrabold text-white">Target Pace: 10.5 km/h</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-white">{speed}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">km/h</span>
              </div>
            </div>
          )}

          {/* WORKOUT CONTROLS & MODULE SELECTION */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 backdrop-blur-md">
            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                Configure Workout Focus
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleModeChange("tempo")}
                  className={`py-2 rounded-xl text-xs font-extrabold border tracking-wider transition-all duration-300 ${
                    mode === "tempo"
                      ? "bg-white/10 border-white/25 text-white shadow-lg"
                      : "bg-transparent border-white/5 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  💨 TEMPO RUNNING
                </button>
                <button
                  onClick={() => handleModeChange("squat")}
                  className={`py-2 rounded-xl text-xs font-extrabold border tracking-wider transition-all duration-300 ${
                    mode === "squat"
                      ? "bg-white/10 border-white/25 text-white shadow-lg"
                      : "bg-transparent border-white/5 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  🏋️ SQUAT TRAINER
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                Session Control
              </h3>
              <div className="flex space-x-3">
                {sessionState === "running" ? (
                  <button
                    onClick={() => handleAction("pause")}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-gray-950 flex items-center justify-center space-x-2 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-300 shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSE WORKOUT</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction("start")}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-gray-950 flex items-center justify-center space-x-2 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START WORKOUT</span>
                  </button>
                )}

                <button
                  onClick={() => handleAction("reset")}
                  className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* REASONING & SPEECH TERMINALS */}
          <section className="grid grid-cols-1 gap-5">
            
            {/* AI COACH REASONING ENGINE TERMINAL */}
            <div className="bg-[#070911] border border-white/5 rounded-2xl p-4 flex flex-col h-56 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none" />
              <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-2" />
                  AI REASONING TERMINAL (MASTRA)
                </span>
                <span className="text-[9px] text-gray-600 font-mono">logs: {thoughtLogs.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto text-xs font-mono space-y-1.5 scrollbar-thin text-emerald-300/80">
                {thoughtLogs.length === 0 ? (
                  <p className="text-gray-600 italic">Listening for sensor movement...</p>
                ) : (
                  thoughtLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed border-l-2 border-emerald-500/20 pl-2">
                      <span className="text-emerald-500/50">›</span> {log.text}
                    </div>
                  ))
                )}
                <div ref={thoughtTerminalEndRef} />
              </div>
            </div>

            {/* AUDIO SYNTHESIS LOG (TTS) */}
            <div className="bg-[#070911] border border-white/5 rounded-2xl p-4 flex flex-col h-40 relative overflow-hidden">
              <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center">
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                  SPEECH LOG (TTS HISTORY)
                </span>
                <span className="text-[9px] text-gray-600 font-mono">count: {speechCues.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto text-xs font-mono space-y-1.5 text-blue-300/80">
                {speechCues.length === 0 ? (
                  <p className="text-gray-600 italic">No audio cues synthesized yet.</p>
                ) : (
                  speechCues.map((cue, idx) => (
                    <div key={idx} className="leading-relaxed border-l-2 border-blue-500/20 pl-2">
                      <span className="text-blue-500/40">🔊</span> "{cue.text}"
                    </div>
                  ))
                )}
                <div ref={speechTerminalEndRef} />
              </div>
            </div>

          </section>

        </div>
      ) : (
        /* MOTION SIMULATOR WORKSPACE */
        <div className="flex-1 flex flex-col space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center">
                <Compass className="w-5 h-5 text-emerald-400 mr-2" />
                Physical Sensor Simulator
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                Since smart glasses development is often done at a desk, use this simulator tool to mock complex physical movements. 
                The background state machine will calculate cadence, evaluate postures, and coordinate Mastra agent responses instantly.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-4">
              
              {/* RUNNING / TEMPO SIMULATORS */}
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2.5">
                  🏃 TEMPO RUNNING SIMULATORS
                </span>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      handleModeChange("tempo");
                      setTimeout(() => simulateIMU("bobbing"), 200);
                    }}
                    className="w-full text-left bg-gradient-to-r from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/15 border border-emerald-500/20 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Simulate Rapid Jogging Steps
                      </h4>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                        187 BPM
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Generates a rapid sequence of vertical bobbing acceleration peaks on the Y-axis. Calculates high cadence.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      handleModeChange("tempo");
                      setCadence(145); // Set slow cadence
                      setHeartRate(158);
                      setSessionState("running");
                      // Tell background to change state
                      mentra.send("coach:session-action", { action: "start" });
                      setTimeout(() => triggerFeedback(), 300);
                    }}
                    className="w-full text-left bg-gradient-to-r from-amber-500/15 to-transparent hover:from-amber-500/20 border border-amber-500/20 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Simulate Slow / Lagging Cadence
                      </h4>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                        145 BPM
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Sets cadence to a sluggish 145 steps-per-minute. Triggers Mastra to invoke the Metronome pacer assist tool.
                    </p>
                  </button>
                </div>
              </div>

              {/* SQUAT / EXERCISE FORM SIMULATORS */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-2.5">
                  🏋️ SQUAT TRAINER SIMULATORS
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      handleModeChange("squat");
                      setTimeout(() => simulateIMU("good-squat"), 200);
                    }}
                    className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                  >
                    <h4 className="text-xs font-bold text-white mb-1">
                      Good Squat Rep
                    </h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Generates high-quality depth deceleration signature. Increments rep count.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      handleModeChange("squat");
                      setTimeout(() => simulateIMU("bad-squat"), 200);
                    }}
                    className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                  >
                    <h4 className="text-xs font-bold text-white mb-1">
                      Shallow Squat Rep
                    </h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Generates a shallow depth curve. Triggers HUD form alert: "SQUAT DEEPER!".
                    </p>
                  </button>
                </div>
              </div>

              {/* POSTURE MONITORING */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-2.5">
                  🚨 POSTURE & BIOMETRICS
                </span>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => simulateIMU("slump")}
                    className="w-full text-left bg-gradient-to-r from-rose-500/10 to-transparent hover:from-rose-500/15 border border-rose-500/20 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                        Simulate Head Posture Slump
                      </h4>
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded flex items-center">
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Posture Slump
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Simulates a heavy forward-looking tilt. Triggers HUD warning: "POSTURE UP" and starts verbal correction.
                    </p>
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* ACTIVE EMULATOR HARDWARE DIAGNOSTICS */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-white text-sm font-extrabold tracking-tight mb-3">
              Diagnostics & API Tools
            </h3>
            <div className="space-y-2.5 text-xs text-gray-400 leading-relaxed">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Display API (HUD Lenses)</span>
                <span className="text-emerald-400 font-bold">active: showTextWall</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Audio API (TTS bone-conduction)</span>
                <span className="text-emerald-400 font-bold">active: speaker.speak</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>IMU Streaming (Motion Sensor)</span>
                <span className={`font-bold ${sessionState === "running" ? "text-emerald-400 animate-pulse" : "text-gray-500"}`}>
                  {sessionState === "running" ? "streaming (10Hz)" : "idle"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Local Voice Recognition</span>
                <span className="text-emerald-400 font-bold">active: transcription.on</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
