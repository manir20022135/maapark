// parse_all_data.cjs
const https = require('https');

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
  console.log('Fetching Google Sheet Data...\n');
  const sheets = ['Master_Registrations', 'Final_Scorecards', 'Itemized_Exam_Audit', 'SNA_College_Ledger'];
  const data = {};

  for (const s of sheets) {
    try {
      const res = await fetchGviz(s);
      data[s] = res;
      console.log(`✅ [${s}]: ${res.rows.length} rows found. Columns: ${res.cols.filter(Boolean).join(', ')}`);
    } catch(err) {
      console.log(`❌ [${s}]:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('📌 1. FINAL SCORECARDS / EXAM RESULTS:');
  console.log('='.repeat(120));
  if (data['Final_Scorecards'] && data['Final_Scorecards'].rows.length > 0) {
    console.table(data['Final_Scorecards'].rows);
  } else {
    console.log('No rows in Final_Scorecards');
  }

  console.log('\n' + '='.repeat(120));
  console.log('📌 2. MASTER REGISTRATIONS:');
  console.log('='.repeat(120));
  if (data['Master_Registrations'] && data['Master_Registrations'].rows.length > 0) {
    console.log(`Total Registrations: ${data['Master_Registrations'].rows.length}`);
    data['Master_Registrations'].rows.forEach((r, i) => {
      console.log(`${i+1}. [${r['Roll Number'] || r['Roll Number '] || '--'}] Name: ${r['Full Name'] || r['Full Name '] || '--'}, Phone: ${r['WhatsApp'] || r['WhatsApp '] || '--'}, College: ${r['College'] || r['College '] || '--'}, Fee: ${r['Fee Paid (₹)'] || r['Fee Paid'] || '--'}, Status: ${r['Payment Status'] || r['Exam Status'] || '--'}, Score: ${r['Score (/60)'] || '--'}`);
    });
  }

  console.log('\n' + '='.repeat(120));
  console.log('📌 3. SNA COLLEGE LEDGER / AFFILIATES:');
  console.log('='.repeat(120));
  if (data['SNA_College_Ledger'] && data['SNA_College_Ledger'].rows.length > 0) {
    console.table(data['SNA_College_Ledger'].rows);
  }

  console.log('\n' + '='.repeat(120));
  console.log('📌 4. ITEMIZED AUDIT SAMPLE:');
  console.log('='.repeat(120));
  if (data['Itemized_Exam_Audit'] && data['Itemized_Exam_Audit'].rows.length > 0) {
    console.log(`Total audit entries: ${data['Itemized_Exam_Audit'].rows.length}`);
    console.table(data['Itemized_Exam_Audit'].rows.slice(0, 10));
  }
}

main();
