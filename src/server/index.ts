import { createServer, getServerPort } from '@devvit/web/server';
import { createExpressApp } from './app';
import { runPriceEngineTick } from './core/marketRepository';

const app = createExpressApp();
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
void runPriceEngineTick().catch((error) =>
  console.error('Initial price engine tick failed', error)
);
