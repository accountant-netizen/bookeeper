const assert = require('assert');
const { matchLinesToCandidates } = require('../apps/web/lib/bankMatcher.cjs');

// Simple test: one line matching one candidate by amount+description
async function run() {
  const lines = [ { id: 'l1', description: 'ACME PAYMENT INV 123', amount: 100.00 } ];
  const rules = [ { id: 'r1', pattern: { description_contains: 'ACME', amount_delta: 1 }, priority: 1 } ];
  const candidates = [ { id: 'c1', description: 'ACME PAYMENT', amount: 100.00 } ];

  const updates = matchLinesToCandidates(lines, rules, candidates);
  assert(Array.isArray(updates), 'updates should be array');
  assert(updates.length >= 1, 'should find at least one match');
  const u = updates[0];
  assert(u.lineId === 'l1', 'line id should match');
  assert(u.matchedId === 'c1', 'should match candidate c1');
  console.log('bankMatcher test passed');
}

run().catch(err => { console.error(err); process.exit(2); });
