import { serve } from "bun";

const server = serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    
    // Handle the userscript route
    if (url.pathname === "/dateconverter/dateconverter.user.js") {
      // Read the userscript file
      const userscript = Bun.file("./public/dateconverter.user.js");
      
      // Set appropriate headers for Tampermonkey to recognize it as a userscript
      return new Response(userscript, {
        headers: {
          "Content-Type": "application/javascript",
          "Content-Disposition": "inline; filename=dateconverter.user.js"
        }
      });
    }
    
    // Serve a simple landing page with installation link
    if (url.pathname === "/dateconverter/" || url.pathname === "/dateconverter/index.html") {
      return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Date Converter Userscript</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #333; }
            .install-btn {
              display: inline-block;
              background: #4CAF50;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              margin: 20px 0;
            }
            .install-btn:hover {
              background: #45a049;
            }
            pre {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 4px;
              overflow-x: auto;
            }
            .features {
              margin: 30px 0;
            }
            .feature {
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <h1>Date Converter Userscript</h1>
          <p>This userscript allows you to convert between Unix timestamps and human-readable dates by selecting text on any webpage.</p>
          
          <a href="/tampermonkey/dateconverter.user.js" class="install-btn">Install Userscript</a>
          
          <div class="features">
            <h2>Features:</h2>
            <div class="feature">
              <strong>Convert Unix Timestamps:</strong> Select any Unix timestamp to see it in human-readable format.
            </div>
            <div class="feature">
              <strong>Convert Dates:</strong> Select any date text to get the Unix timestamp and other formats.
            </div>
            <div class="feature">
              <strong>Smart Extraction:</strong> Works even when dates or timestamps are part of longer text.
            </div>
            <div class="feature">
              <strong>Copy to Clipboard:</strong> Easily copy any converted format with a single click.
            </div>
            <div class="feature">
              <strong>Multiple Activation Methods:</strong> Works with selection, double-click, or keyboard shortcut (Ctrl+Shift+D).
            </div>
          </div>
          
          <h2>How to Use:</h2>
          <ol>
            <li>Install the userscript by clicking the button above (requires Tampermonkey or similar extension)</li>
            <li>Select any date or timestamp on a webpage</li>
            <li>A popup will appear with conversions</li>
            <li>Click "Copy" next to any format you want to copy to clipboard</li>
          </ol>
          
          <h2>Examples:</h2>
          <p>Works with:</p>
          <ul>
            <li>Unix timestamps: <code>1741238895</code></li>
            <li>Labeled timestamps: <code>Epoch timestamp: 1741238895</code></li>
            <li>ISO dates: <code>2023-05-15T14:30:00Z</code></li>
            <li>Human-readable dates: <code>May 15, 2023 2:30 PM</code></li>
            <li>Dates with context: <code>Date and time (GMT): Friday, March 6, 2020 5:16:38 AM</code></li>
          </ul>
        </body>
        </html>
      `, {
        headers: {
          "Content-Type": "text/html"
        }
      });
    }
    
    // Handle 404
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`Server running at http://localhost:${server.port}`);

