const https = require('https');
const fs = require('fs');

const SHEET_ID = '1vdkNKF0h8fEXMJgkHAJntLmtlDVjg81tGxjG3ctMLrg';

function getRows(name) {
  return new Promise((resolve, reject) => {
    https.get('https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(name), res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const m = d.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
          const j = JSON.parse(m[1]).table;
          const cols = j.cols.map(c => (c.label || c.id || '').trim());
          const rows = j.rows.map(r => {
            const o = {};
            r.c.forEach((cell, idx) => {
              if (cols[idx]) o[cols[idx]] = cell ? (cell.f !== undefined ? cell.f : cell.v) : '';
            });
            return o;
          });
          resolve(rows);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const scorecards = await getRows('Final_Scorecards');
  const registrations = await getRows('Master_Registrations');
  const affiliates = await getRows('SNA_College_Ledger');
  const audits = await getRows('Itemized_Exam_Audit');

  const out = {
    scorecards,
    registrations,
    affiliates,
    auditCount: audits.length
  };

  fs.writeFileSync('all_sheet_data.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(`Saved! Scorecards: ${scorecards.length}, Registrations: ${registrations.length}, Affiliates: ${affiliates.length}, Audits: ${audits.length}`);
}
run();
