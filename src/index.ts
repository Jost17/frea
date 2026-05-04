import { app } from "./app";
import { closeBrowserSingleton } from "./lib/pdf/invoice-pdf";

const port = Number(Bun.env.PORT) || 3114;

console.log(`
╔═══════════════════════════════════════╗
║              F R E A                  ║
║   Kunden · Projekte · Rechnungen      ║
║   http://localhost:${port}              ║
╚═══════════════════════════════════════╝
`);

// Graceful shutdown: close browser singleton on process termination
process.on("SIGTERM", async () => {
  console.log("[server] SIGTERM received, closing browser singleton");
  await closeBrowserSingleton();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[server] SIGINT received, closing browser singleton");
  await closeBrowserSingleton();
  process.exit(0);
});

export default { port, hostname: "127.0.0.1", fetch: app.fetch };
