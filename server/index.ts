import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { load } from './store/db'
import { api } from './routes'
import { cleanUpAttachments } from './attachments'

await load();
await cleanUpAttachments();

const app = express();
app.use(express.json());
app.use('/api', api);

const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));