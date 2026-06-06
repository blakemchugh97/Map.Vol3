#!/bin/bash
# Double-click this file to run the T2C Dispatch Map locally.
# It serves the folder over HTTP (required — the app can't run from file://)
# and opens it in your browser. Press Ctrl+C in the Terminal window to stop.

cd "$(dirname "$0")" || exit 1
PORT=8000

# If the port is busy, step up until we find a free one.
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/"
echo "──────────────────────────────────────────────"
echo "  T2C Dispatch Intelligence Map"
echo "  Serving at: $URL"
echo "  Stop with:  Ctrl+C"
echo "──────────────────────────────────────────────"

# Open the browser a moment after the server starts.
( sleep 1; open "$URL" ) &

python3 -m http.server "$PORT"
