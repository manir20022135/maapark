const fs = require('fs');
const data = JSON.parse(fs.readFileSync('all_sheet_data.json', 'utf8'));

const razorpayList = [
  { id: 'pay_Ta2sIvJ1wZ7aIC', amount: '99', phone: '9971664621', email: 'void@razorpay.com', date: 'Sep 10, 2026', status: 'Captured' },
  { id: 'pay_TVVk75Y9TmPaTc', amount: '99', phone: '9007866960', email: '', date: 'Aug 29, 2026', status: 'Captured' },
  { id: 'pay_TVVeGzJvWbbDzj', amount: '99', phone: '9007866960', email: '', date: 'Aug 29, 2026', status: 'Captured' },
  { id: 'pay_TVEGkJ89Oew8BZ', amount: '99', phone: '9863187436', email: 'void@razorpay.com', date: 'Aug 28, 2026', status: 'Failed' },
  { id: 'pay_TVDO0dnG6Fosf9', amount: '99', phone: '7629893520', email: 'patiancheansilsg@gmail.com', date: 'Aug 28, 2026', status: 'Captured' },
  { id: 'pay_TV23gcSQ3ilW0j', amount: '99', phone: '9101726509', email: 'void@razorpay.com', date: 'Aug 28, 2026', status: 'Captured' },
  { id: 'pay_TUe9qhcmqnvNAe', amount: '99', phone: '9365965167', email: 'void@razorpay.com', date: 'Aug 27, 2026', status: 'Captured' },
  { id: 'pay_TUVLJ99EDZthy3', amount: '99', phone: '9859090635', email: 'kushal91b@gmail.com', date: 'Aug 27, 2026', status: 'Captured' },
  { id: 'pay_TUT3aiL0udzBck', amount: '99', phone: '6000931509', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed' },
  { id: 'pay_TUP8sfU2B03E2i', amount: '99', phone: '7085352692', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured' },
  { id: 'pay_TULV4RtDk0K9Hk', amount: '99', phone: '9395273750', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured' },
  { id: 'pay_TULD9hju4FQhk7', amount: '99', phone: '8472938620', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured' },
  { id: 'pay_TULAbw0P1VN0qI', amount: '99', phone: '8472938620', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed' },
  { id: 'pay_TULA8cyT6FIMTR', amount: '99', phone: '8472938620', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed' },
  { id: 'pay_TUKbXGCuaj8ZGt', amount: '99', phone: '6001220466', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured' },
  { id: 'pay_TUJUhuZEAJiumX', amount: '99', phone: '7577883676', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed' },
];

console.log('=== CROSS-REFERENCING RAZORPAY WITH SHEET DATA ===\n');

razorpayList.forEach(rzp => {
  const normPhone = rzp.phone.slice(-10);
  const matchedRegs = data.registrations.filter(r => {
    const ph = (r['WhatsApp'] || '').replace(/\D/g, '').slice(-10);
    return ph === normPhone;
  });

  const matchedScorecards = data.scorecards.filter(s => {
    const ph = (s['WhatsApp'] || '').replace(/\D/g, '').slice(-10);
    return ph === normPhone;
  });

  console.log(`Payment: ${rzp.id} | Status: ${rzp.status} | Phone: ${rzp.phone} | Date: ${rzp.date}`);
  if (matchedRegs.length > 0) {
    const candidate = matchedRegs[matchedRegs.length - 1];
    console.log(`  -> Candidate: ${candidate['Full Name']} (${candidate['Roll Number']}) | College: ${candidate['College']}`);
    console.log(`  -> Sheet Status: ${candidate['Status'] || candidate['Payment Status']} | Order: ${candidate['Razorpay Order ID'] || candidate['Payment ID']}`);
  } else {
    console.log('  -> No matching registration found in Sheet!');
  }

  if (matchedScorecards.length > 0) {
    console.log('  -> SCORECARD FOUND:', matchedScorecards);
  }
  console.log('');
});
