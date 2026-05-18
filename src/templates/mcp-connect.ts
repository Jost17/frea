export function McpConnectPage(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FREA MCP Integration</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
    .container { background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
    h1 { color: #1f2937; margin-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .highlight { background: #fef08a; padding: 15px; border-left: 4px solid #facc15; border-radius: 4px; margin: 15px 0; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Courier New', monospace; }
    .code-block { background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 6px; overflow-x: auto; margin: 15px 0; }
    .code-block code { background: none; padding: 0; color: inherit; }
    button { background: #3b82f6; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    button:hover { background: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status.active { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔌 FREA MCP Integration</h1>
    <p>FREA bietet einen MCP-Server für KI-Assistenten zur Echtzeit-Rechnungsvalidierung. Das ist dein Alleinstellungsmerkmal — kein Konkurrenzprodukt hat das.</p>
  </div>

  <div class="container">
    <h2>1. Claude Desktop konfigurieren</h2>
    <p>Kopiere diesen Config-Block in deine <code>claude_desktop_config.json</code>:</p>
    <div class="code-block"><code>{
  "mcpServers": {
    "frea": {
      "command": "curl",
      "args": ["-N", "http://localhost:3114/mcp/server"],
      "env": {}
    }
  }
}
    </code></div>
    <p><strong>Pfad:</strong> <code>~/.config/Claude/claude_desktop_config.json</code> (macOS) / <code>%APPDATA%\\Claude\\claude_desktop_config.json</code> (Windows)</p>
  </div>

  <div class="container">
    <h2>2. Claude Code CLI nutzen</h2>
    <p>Oder verwende den Cloud-CLI (wenn lokal nicht möglich):</p>
    <div class="code-block"><code>claude mcp add frea http://your-frea-domain.de/mcp/server
    </code></div>
  </div>

  <div class="container">
    <h2>3. Verfügbare Tools</h2>
    <table>
      <thead>
        <tr>
          <th>Tool</th>
          <th>Beschreibung</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>frea:validate_invoice</code></td>
          <td>Validiert eine Rechnung gegen §14 UStG, GoBD und MwSt-Regeln (pro Position)</td>
          <td><span class="status active">✓ Aktiv</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="container">
    <h2>4. Example Prompts (Deutsch)</h2>
    <div class="highlight">
      <strong>Beispiel 1:</strong><br>
      "Validiere diese Rechnung: Kunde 'Acme GmbH', Rechnungsdatum 2026-05-18, Fälligkeitsdat 2026-06-18. Positionen: Beratung 1000€ (19% MwSt), Schulung 500€ (7% MwSt)."
    </div>
    <div class="highlight">
      <strong>Beispiel 2:</strong><br>
      "Prüfe ob diese Rechnung GoBD-konform ist und gib mir Verbesserungsvorschläge: [Rechnungsdaten einfügen]"
    </div>
    <div class="highlight">
      <strong>Beispiel 3:</strong><br>
      "Ich bin Kleinunternehmer nach §19 UStG — wie muss ich meine Rechnungen anpassen?"
    </div>
  </div>

  <div class="container">
    <h2>5. MCP Server Status</h2>
    <p><strong>Basis-URL:</strong> <code>http://localhost:3114/mcp</code></p>
    <p><strong>Endpoints:</strong></p>
    <ul>
      <li><code>GET /mcp/server</code> — Server-Info und Capabilities</li>
      <li><code>POST /mcp/server</code> — JSON-RPC 2.0 Streamable HTTP Transport</li>
    </ul>
    <p><button onclick="testServer()">🔍 Server testen</button></p>
  </div>

  <script>
    async function testServer() {
      try {
        const res = await fetch('http://localhost:3114/mcp/server');
        const data = await res.json();
        alert('✓ Server antwortet:\\n' + JSON.stringify(data, null, 2));
      } catch (e) {
        alert('✗ Server erreichbar? Fehler: ' + e.message);
      }
    }
  </script>
</body>
</html>
  `;
}
