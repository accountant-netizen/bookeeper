const assert = require('assert');
const { detectFormat, parseCSV, parseOFX, parseMT940 } = require('../apps/web/lib/bankParser.cjs');

function sampleCSV() {
  return `Date,Description,Amount\n2024-01-01,Opening balance,1000.00\n2024-01-05,ACME PAYMENT,100.00`;
}

function sampleOFX() {
  return `OFXHEADER:100\n<OFX>\n  <BANKMSGSRSV1>\n    <STMTTRNRS>\n      <STMTRS>\n        <BANKTRANLIST>\n          <STMTTRN>\n            <DTPOSTED>20240105\n            <TRNAMT>-100.00\n            <FITID>12345\n            <NAME>ACME PAYMENT\n          </STMTTRN>\n        </BANKTRANLIST>\n      </STMTRS>\n    </STMTTRNRS>\n  </BANKMSGSRSV1>\n</OFX>`;
}

function sampleMT940() {
  return `:20:START\n:25:123456789\n:61:2401050105C100,00NTRFNONREF\n:86:ACME PAYMENT INV 123\n`;
}

async function run() {
  // CSV
  const csv = sampleCSV();
  assert(detectFormat(csv) === 'csv');
  const p1 = parseCSV(csv);
  assert(p1.length === 2);

  // OFX
  const ofx = sampleOFX();
  assert(detectFormat(ofx) === 'ofx');
  const p2 = parseOFX(ofx);
  assert(p2.length === 1);
  assert(p2[0].description.toLowerCase().includes('acme'));

  // MT940
  const m = sampleMT940();
  assert(detectFormat(m) === 'mt940');
  const p3 = parseMT940(m);
  assert(p3.length === 1);
  console.log('parser tests passed');
}

run().catch(err => { console.error(err); process.exit(2); });
