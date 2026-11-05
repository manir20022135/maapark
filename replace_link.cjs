const fs = require('fs');
const OLD = 'https://rzp.io/rzp/YBmABxMr';
const NEW = 'https://razorpay.me/@manirulhussain?amount=CVDUr6Uxp2FOGZGwAHntNg%3D%3D';
const files = ['championship.html', 'championship-exam.html', 'championship-verify.html', 'index.html'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const count = content.split(OLD).length - 1;
    if (count > 0) {
        content = content.split(OLD).join(NEW);
        fs.writeFileSync(f, content, 'utf8');
        console.log(f + ' - replaced ' + count + ' OK');
    } else {
        console.log(f + ' - not found');
    }
});
console.log('DONE');
