import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createServer } from 'http';
import parse from 'url';
import next from 'next';
import { initSocketServer } from './lib/socket/server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse.parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Attach Socket.io
  initSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (Next.js + Socket.io Server)`);
  });
});
