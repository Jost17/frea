export function McpConnectPage(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FREA — KI-Integration via MCP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 860px; margin: 0 auto; padding: 24px; color: #1f2937; }
    h1 { color: #111827; }
    h2 { color: #374151; margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    pre { background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f9fafb; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .highlight { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 12px 0; }
    button { background: #2563eb; color: #fff; border: none; padding: 9px 18px; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>FREA — KI-Assistent verbinden</h1>
  <p>Verbinde Claude direkt mit FREA über das Model Context Protocol (MCP).</p>

  <h2>1. Claude Desktop</h2>
  <pre>{
  "mcpServers": {
    "frea": {
      "command": "curl",
      "args": ["-s", "-X", "POST", "http://localhost:3114/mcp/server"],
      "env": {}
    }
  }
}</pre>
  <p>Pfad (macOS): <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></p>

  <h2>2. Claude Code CLI</h2>
  <pre>claude mcp add frea --transport http http://localhost:3114/mcp/server</pre>

  <h2>3. Verfügbare Tools</h2>
  <table>
    <thead><tr><th>Tool</th><th>Beschreibung</th></tr></thead>
    <tbody>
      <tr>
        <td><code>frea:validate_invoice</code></td>
        <td>Prüft Rechnung auf §14 UStG, GoBD und MwSt-Konformität (pro Position)</td>
      </tr>
    </tbody>
  </table>

  <h2>4. Beispiel-Prompt</h2>
  <div class="highlight">„Validiere diese Rechnung: Kunde 'Acme GmbH', Datum 2026-06-01, fällig 2026-07-01. Positionen: Beratung 2.000€ × 19% MwSt, Schulung 800€ × 7% MwSt."</div>

  <h2>5. Server-Status</h2>
  <p><button onclick="ping()">Server testen</button></p>
  <script>
    async function ping() {
      try {
        const r = await fetch('/mcp/server');
        const d = await r.json();
        alert('✓ Verbunden\\n' + JSON.stringify(d, null, 2));
      } catch (e) {
        alert('✗ Fehler: ' + e.message);
      }
    }
  </script>
</body>
</html>`;
}
