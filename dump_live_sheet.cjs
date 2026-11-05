// dump_live_sheet.cjs
const https = require('https');
const fs = require('fs');
const path = require('path');

const SHEET_ID = '1vdkNKF0h8fEXMJgkHAJntLmtlDVjg81tGxjG3ctMLrg';

function fetchGviz(sheetName) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
          if (!match) return reject(new Error('No gviz response'));
          const json = JSON.parse(match[1]);
          const table = json.table;
          const cols = table.cols.map(c => (c.label || c.id || '').trim());
          const rows = table.rows.map(r => {
            const obj = {};
            r.c.forEach((cell, idx) => {
              const colName = cols[idx] || `col_${idx}`;
              obj[colName] = cell ? (cell.f !== undefined ? cell.f : cell.v) : '';
            });
            return obj;
          });
          resolve({ cols, rows });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔄 Fetching live Google Sheet data from all tabs...');
  const regData = await fetchGviz('Master_Registrations');
  const scorecardData = await fetchGviz('Final_Scorecards');
  const auditData = await fetchGviz('Itemized_Exam_Audit');
  const affiliateData = await fetchGviz('SNA_College_Ledger');

  const unified = {
    registrations: regData.rows,
    scorecards: scorecardData.rows,
    itemizedAudit: auditData.rows,
    affiliates: affiliateData.rows,
    lastFetchedAt: new Date().toISOString()
  };

  const outPath = path.join(__dirname, 'all_sheet_data.json');
  fs.writeFileSync(outPath, JSON.stringify(unified, null, 2));
  console.log(`✅ Saved live data to ${outPath}`);
  console.log(`📊 Total Registrations: ${unified.registrations.length}`);
  console.log(`📊 Total Scorecards: ${unified.scorecards.length}`);
  console.log(`📊 Total Affiliates: ${unified.affiliates.length}`);
}

main().catch(err => {
  console.error('❌ Error fetching sheet:', err.message);
  process.exit(1);
});
