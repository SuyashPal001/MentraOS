import { createRoot } from "react-dom/client";
import { MentraProvider } from "@mentra/miniapp/ui";
import { io } from "socket.io-client";
import "../shared/channels";

import App from "./App";
import "../index.css";

// Mock the mentra global for standard browser previews
if (typeof window !== 'undefined' && !('mentra' in window)) {
  console.log("🌐 Running in standalone browser. Connecting to local AI server...");
  
  // Use the local IP that the dev server is running on
  const socket = io(`http://${window.location.hostname}:3155`);
  
  const listeners: Record<string, ((data: any) => void)[]> = {};
  
  socket.onAny((event, ...args) => {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(args[0]));
    }
  });

  (window as any).mentra = {
    on: (channel: string, cb: (data: any) => void) => {
      if (!listeners[channel]) listeners[channel] = [];
      listeners[channel].push(cb);
      return () => {
        listeners[channel] = listeners[channel].filter(l => l !== cb);
      };
    },
    send: (channel: string, payload: any) => {
      socket.emit(channel, payload);
    },
    ready: () => {
      console.log("Ready fired to socket backend");
    }
  };
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <MentraProvider>
    <App />
  </MentraProvider>,
);

// Notify host/background JSContext that the UI has successfully mounted.
if (typeof window !== 'undefined' && 'mentra' in window) {
  // @ts-ignore
  window.mentra.ready();
} else if (typeof mentra !== 'undefined') {
  mentra.ready();
}
