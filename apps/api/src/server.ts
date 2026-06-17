import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.apiPort, () => {
  console.log(`Substrata API listening on http://localhost:${env.apiPort}`);
});
