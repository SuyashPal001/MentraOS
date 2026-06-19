import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { CoachController } from './src/background/controllers/CoachController';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3155;

console.log('🚀 Starting Agentic Coach Local AI Server...');

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in .env file!');
  console.warn('The Mastra AI Agent requires this to function.');
}

// Mock the Mentra Miniapp Session environment
class MockSession {
  socket: any;
  ui: any;
  speaker: any;
  display: any;
  glasses: any;
  imu: any;
  transcription: any;

  constructor(socket: any) {
    this.socket = socket;

    // Route UI calls to the connected web browser via socket
    this.ui = {
      send: (channel: string, payload: any) => {
        socket.emit(channel, payload);
      },
      onOpen: (cb: () => void) => {
        // Trigger immediately for browser connection
        cb();
        return () => {};
      },
      on: (channel: string, cb: (payload: any) => void) => {
        socket.on(channel, cb);
        return () => socket.off(channel, cb);
      }
    };

    // Mock hardware output APIs
    this.speaker = {
      speak: async (text: string) => {
        console.log(`[SPEAKER] 🔊 "${text}"`);
        socket.emit('coach:speech-cue', { text, timestamp: Date.now() });
      }
    };

    this.display = {
      showTextWall: async (text: string) => {
        console.log(`[HUD DISPLAY] 👓 "${text.replace(/\n/g, ' ')}"`);
      },
      clear: async () => {
        console.log(`[HUD DISPLAY] 👓 (cleared)`);
      }
    };

    // Mock hardware input event emitters
    this.glasses = {
      onConnection: (cb: (data: { connected: boolean }) => void) => {
        // Immediately trigger as connected for testing
        setTimeout(() => cb({ connected: true }), 1000);
        return () => {};
      }
    };

    this.imu = {
      onAccel: (cb: (data: any) => void) => {
        socket.on('simulate:accel', cb);
        return () => socket.off('simulate:accel', cb);
      }
    };

    this.transcription = {
      on: (cb: (data: any) => void) => {
        socket.on('simulate:voice', cb);
        return () => socket.off('simulate:voice', cb);
      }
    };
  }
}

io.on('connection', (socket) => {
  console.log('📱 Browser UI Connected!');

  const mockSession = new MockSession(socket);
  const controller = new CoachController(mockSession as any);
  
  controller.start();

  socket.on('disconnect', () => {
    console.log('📱 Browser UI Disconnected');
    controller.stop();
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
✅ AI Backend Server running at http://localhost:${PORT}
   Waiting for browser to connect...
  `);
});
