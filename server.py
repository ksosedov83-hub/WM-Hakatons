#!/usr/bin/env python3
"""
Simple HTTP server for local development of the Модель Мира landing page.

Serves static files with proper MIME types and SPA fallback routing
(mirrors the Vercel rewrite rules in vercel.json).

Usage:
    python3 server.py [port]

Default port is 8080. Open http://localhost:8080 in your browser.
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class SPAHandler(SimpleHTTPRequestHandler):
    """Handler that serves static files and falls back to index.html for SPA routing."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Serve the file if it exists on disk, otherwise fall back to index.html
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(
            os.path.join(path, "index.html")
        ):
            self.path = "/index.html"
        return super().do_GET()


def main():
    server = HTTPServer(("0.0.0.0", PORT), SPAHandler)
    print(f"Serving at http://localhost:{PORT}")
    print(f"Directory: {DIRECTORY}")
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
