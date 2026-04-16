import { app } from "./app";

const port = Number(Bun.env.PORT) || 3114;

console.log(`
╔═══════════════════════════════════════╗
║              F R E A                  ║
║   Kunden · Projekte · Rechnungen      ║
║   http://localhost:${port}              ║
╚═══════════════════════════════════════╝
`);

export default { port, hostname: "127.0.0.1", fetch: app.fetch };
