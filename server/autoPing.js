// autoPing.js
// This script pings your server every 10 minutes to keep it awake.


import https from 'https';
import http from 'http';

// Set your deployed server URL here (must include http/https)
const SERVER_URL = process.env.PING_URL || 'https://your-server-url.com/';

function ping() {
  const url = new URL(SERVER_URL);
  const lib = url.protocol === 'https:' ? https : http;
  const req = lib.get(SERVER_URL, (res) => {
    console.log(`[${new Date().toISOString()}] Pinged ${SERVER_URL} - Status: ${res.statusCode}`);
    res.resume();
  });
  req.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Ping error:`, err.message);
  });
}

// Ping immediately, then every 10 minutes
ping();
setInterval(ping, 10 * 60 * 1000);
