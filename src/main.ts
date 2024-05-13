import logger from './log';
import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { hostname } from 'os';
import {
  UpdateFromDevice,
  isInterruptedReflow,
  isStartingReflow,
  isStatusUpdate,
  setupOvenCommunications,
} from './oven';
import { state } from './state';

const server = createServer();

const wss = new WebSocketServer({ noServer: true });

const clients: WebSocket[] = [];

wss.on('connection', function connection(ws) {
  logger.info('Client connected');
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.send(JSON.stringify({ state }));

  clients.push(ws);

  ws.on('close', () => {
    logger.info('Client disconnected');
    clients.splice(clients.indexOf(ws), 1);
  });
});

server.on('request', (req, res) => {
  logger.info(`HTTP Request ${req.url}`);
});

server.on('upgrade', function upgrade(request, socket, head) {
  if (request.url) {
    const { pathname } = parse(request.url);

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });

      return;
    }
  }

  socket.destroy();
});

// TODO: Server local files

const port = 80;
server.listen(port, () => {
  logger.info(`Server listening http://${hostname()}${port === 80 ? '' : `:${port}`}`);
});

// 10 minutes, 4 updates per second
const historyLimit = 10 * 60 * 4;

export function handleUpdate(update: UpdateFromDevice) {
  clients.forEach(client => client.send(JSON.stringify({ update })));

  if (isStatusUpdate(update)) {
    state.status.unshift(update);
    state.status.splice(historyLimit);

    if (update.mode !== 'REFLOW') {
      state.activeProfile = undefined;
    }

    return;
  }

  if (isStartingReflow(update)) {
    state.activeProfile = update.profile;
    return;
  }

  if (isInterruptedReflow(update)) {
    state.activeProfile = undefined;
    return;
  }

  logger.error('Unknown update type', update);
}

setupOvenCommunications().catch(err => {
  console.error('Error in main');
  console.error(err);
  process.exitCode = 1;
});
