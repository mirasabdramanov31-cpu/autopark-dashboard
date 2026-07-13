const https = require('https');

function followRedirect(url, resolve) {
  https.get(url, { headers: { 'User-Agent': 'netlify-proxy' } }, (res) => {
    if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
      followRedirect(res.headers.location, resolve);
      return;
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: data
    }));
  }).on('error', (e) => resolve({
    statusCode: 500,
    body: JSON.stringify({ ok: false, error: e.message })
  }));
}

exports.handler = async function(event, context) {
const URL = 'https://script.google.com/macros/s/AKfycbwq7L3z3eLH-G-fqnxPoXPOErS36Y9YnjB65ZW3bbeca-8yRkoxVfNIum0E5pNq_rM/exec';
  return new Promise((resolve) => followRedirect(URL, resolve));
};
