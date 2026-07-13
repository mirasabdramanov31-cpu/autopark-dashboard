const https = require('https');

exports.handler = async function(event, context) {
  const SHEET_ID = '1327sJpPvIZpBBeYlptEqmsp1PqVujU4zq69VqDO9m7k';
  const API_KEY  = 'AIzaSyCmJ74BkRMz_OMcd3GELToOSqQIDmLmsXg';
  const RANGE    = encodeURIComponent("'счета'!A4:H");
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const rawRows = json.values || [];
          
          const rows = [];
          rawRows.forEach(row => {
            const dateVal = row[1];
            if (!dateVal) return;
            
            // Парсим дату ДД.ММ.ГГГГ → ГГГГ-ММ-ДД
            let dateStr = '';
            if (typeof dateVal === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateVal)) {
              const [dd, mm, yyyy] = dateVal.split('.');
              dateStr = `${yyyy}-${mm}-${dd}`;
            } else if (typeof dateVal === 'number' && dateVal > 40000) {
              // Excel serial number
              const d = new Date((dateVal - 25569) * 86400 * 1000);
              dateStr = d.toISOString().substring(0, 10);
            } else {
              dateStr = String(dateVal).trim();
            }
            if (!dateStr) return;

            const amt = parseFloat(String(row[5] || '0').replace(/[^\d.]/g, '')) || 0;
            
            rows.push({
              date:  dateStr,
              type:  String(row[3] || '').trim(),
              contr: String(row[4] || '').trim(),
              amt:   amt,
              proj:  String(row[6] || '').trim(),
              tech:  String(row[7] || '').trim()
            });
          });

          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ ok: true, rows, updated: new Date().toISOString() })
          });
        } catch(e) {
          resolve({
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ ok: false, error: e.message, raw: data.substring(0, 200) })
          });
        }
      });
    }).on('error', (e) => {
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: e.message })
      });
    });
  });
};
