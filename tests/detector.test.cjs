const assert=require('node:assert/strict');
const d=require('../extension/detector.js');
const visible='Hello Vancouver! Public result. Contact: demo@example.com';
assert.deepEqual(d.spans(visible),[]);
assert.equal(d.luhn('4111 1111 1111 1111'),true);
assert.equal(d.luhn('4111 1111 1111 1112'),false);
for (const [text,kind] of [
 ['password: demo-fake-secret-123','passwords'],
 ['Authorization: Bearer abcdefghijklmnopqrstuvwxyz12345','tokens'],
 ['API key: dummy-test-secret-long-string-123','tokens'],
 ['Card: 4111 1111 1111 1111','cards'],
]) assert(d.spans(text).some(x=>x.kind===kind),`not detected: ${text}`);
const sensitive='API key: dummy-test-secret-long-string-123';
const spans=d.spans(sensitive);
assert(spans[0].start>0,'mask must be narrower than entire sentence');
console.log('PASS: deterministic secret recognizers, precision spans and card checksum');
