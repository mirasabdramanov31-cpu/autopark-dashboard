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
          
          // Структура таблицы (A=0):
          // A(0)=№ | B(1)=Дата | C(2)=Статья | D(3)=Контрагент
          // E(4)=Сумма | F(5)=Проект | G(6)=Разбивка по г/н | H(7)=...

          const rows = [];
          rawRows.forEach(row => {
            const dateVal = row[1]; // B - Дата
            if (!dateVal) return;
            
            let dateStr = '';
            if (typeof dateVal === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateVal)) {
              const [dd, mm, yyyy] = dateVal.split('.');
              dateStr = `${yyyy}-${mm}-${dd}`;
            } else if (typeof dateVal === 'number' && dateVal > 40000) {
              const d = new Date((dateVal - 25569) * 86400 * 1000);
              dateStr = d.toISOString().substring(0, 10);
            } else {
              dateStr = String(dateVal).trim();
            }
            if (!dateStr) return;

            const amt = parseFloat(String(row[4] || '0').replace(/[^\d.]/g, '')) || 0; // E - Сумма

            rows.push({
              date:  dateStr,
              type:  String(row[2] || '').trim(),   // C - Статья
              contr: String(row[3] || '').trim(),   // D - Контрагент
              amt:   amt,                            // E - Сумма
              proj:  String(row[5] || '').trim(),   // F - Проект
              tech:  String(row[6] || '').trim()    // G - Разбивка по г/н
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
            body: JSON.stringify({ ok: false, error: e.message, raw: data.substring(0, 300) })
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
