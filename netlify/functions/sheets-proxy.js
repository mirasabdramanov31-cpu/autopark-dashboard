const https = require('https');

exports.handler = async function(event, context) {
  const SHEET_ID = '1327sJpPvIZpBBeYlptEqmsp1PqVujU4zq69VqDO9m7k';
  const API_KEY  = 'AIzaSyCmJ74BkRMz_OMcd3GELToOSqQIDmLmsXg';
  // Читаем с B2:G чтобы пропустить пустую колонку A
  const RANGE    = encodeURIComponent("'счета'!B2:G");
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const rawRows = json.values || [];
          
          // Структура B2:G (индексы 0-5):
          // 0=Дата(B) | 1=Статья(C) | 2=Контрагент(D)
          // 3=Сумма(E) | 4=Проект(F) | 5=Разбивка г/н(G)

          const rows = [];
          rawRows.forEach((row, i) => {
            if (i === 0) return; // пропускаем строку заголовков
            
            const dateVal = row[0]; // B - Дата
            if (!dateVal) return;
            
            let dateStr = '';
            if (typeof dateVal === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateVal.trim())) {
              const [dd, mm, yyyy] = dateVal.trim().split('.');
              dateStr = `${yyyy}-${mm}-${dd}`;
            } else if (typeof dateVal === 'number' && dateVal > 40000) {
              const d = new Date((dateVal - 25569) * 86400 * 1000);
              dateStr = d.toISOString().substring(0, 10);
            } else {
              dateStr = String(dateVal).trim();
            }
            if (!dateStr || dateStr === 'Дата') return;

            const amt = typeof row[3] === 'number' ? row[3] :
                        parseFloat(String(row[3] || '0').replace(/[^\d.]/g, '')) || 0;

            if (!amt) return; // пропускаем строки без суммы

            rows.push({
              date:  dateStr,
              type:  String(row[1] || '').trim(),   // C - Статья
              contr: String(row[2] || '').trim(),   // D - Контрагент
              amt:   amt,                            // E - Сумма
              proj:  String(row[4] || '').trim(),   // F - Проект
              tech:  String(row[5] || '').trim()    // G - Разбивка по г/н
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
