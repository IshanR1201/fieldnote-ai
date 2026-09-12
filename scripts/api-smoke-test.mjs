#!/usr/bin/env node
/**
 * Fieldnote AI API smoke test.
 * Run the dev server first (npm run dev), then: node scripts/api-smoke-test.mjs
 */

const BASE = process.env.FIELDNOTE_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function run() {
  console.log(`Fieldnote AI API smoke test against ${BASE}\n`);

  console.log('Health and library');
  const health = await call('GET', '/api/health');
  check('health returns 200', health.status === 200, `got ${health.status}`);
  check('health reports indexed chunks', (health.json?.totalChunks ?? 0) > 0);
  check('health never leaks the API key', !JSON.stringify(health.json || {}).match(/AIza|sk-/));

  const manuals = await call('GET', '/api/manuals');
  check('manuals returns 200', manuals.status === 200, `got ${manuals.status}`);
  check('manual list is non-empty', (manuals.json?.manuals?.length ?? 0) > 0);

  const chunk = await call('GET', '/api/chunks/chunk_1');
  check('chunk lookup returns 200', chunk.status === 200, `got ${chunk.status}`);
  check('chunk response omits raw embeddings', chunk.json?.chunk?.embedding === undefined);
  const missingChunk = await call('GET', '/api/chunks/does-not-exist');
  check('unknown chunk returns 404', missingChunk.status === 404, `got ${missingChunk.status}`);
  const traversal = await call('GET', '/api/chunks/..%2F..%2Fetc%2Fpasswd');
  check('path traversal chunk id is rejected', traversal.status === 404, `got ${traversal.status}`);

  console.log('\nQuery: happy path');
  const covered = await call('POST', '/api/query', {
    brand: 'Carrier',
    model: '59MN7A',
    question: 'Fault code 33 limit switch circuit trip test procedure',
  });
  check('covered query returns 200', covered.status === 200, `got ${covered.status}`);
  check('covered query is answered', covered.json?.status === 'answered', covered.json?.status);
  check('every step carries a citation', (covered.json?.procedureSteps || []).every((s) => s.citation?.documentName && s.citation?.pageNumber));
  check('response never includes embeddings', !JSON.stringify(covered.json || {}).includes('"embedding"'));

  const hyphenated = await call('POST', '/api/query', {
    brand: 'Carrier',
    model: '59-MN-7A',
    question: 'Fault code 33 limit switch circuit trip test procedure',
  });
  check('hyphenated model still answers', hyphenated.json?.status === 'answered', hyphenated.json?.status);

  console.log('\nQuery: refusal path');
  const uncovered = await call('POST', '/api/query', {
    brand: 'Daikin',
    model: 'VRV-IV',
    question: 'How do I resolve communication error code U4?',
  });
  check('out-of-library brand refuses', uncovered.json?.status === 'refused', uncovered.json?.status);
  check('refusal returns no steps', (uncovered.json?.procedureSteps || []).length === 0);

  console.log('\nQuery: invalid and hostile input');
  const empty = await call('POST', '/api/query', { brand: 'Carrier', model: '59MN7A', question: '' });
  check('empty question returns 400', empty.status === 400, `got ${empty.status}`);

  const whitespace = await call('POST', '/api/query', { brand: 'Carrier', model: '59MN7A', question: '     ' });
  check('whitespace question returns 400', whitespace.status === 400, `got ${whitespace.status}`);

  const numeric = await call('POST', '/api/query', { brand: 12345, model: { a: 1 }, question: 99 });
  check('non-string fields return 400 (not 500)', numeric.status === 400, `got ${numeric.status}`);

  const noBody = await call('POST', '/api/query');
  check('missing body is rejected', noBody.status === 415 || noBody.status === 400, `got ${noBody.status}`);

  const formPost = await fetch(`${BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'question=fault+code+33',
  });
  check('cross-site form content type returns 415', formPost.status === 415, `got ${formPost.status}`);

  const malformed = await fetch(`${BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  check('malformed JSON returns 400', malformed.status === 400, `got ${malformed.status}`);

  const longQuestion = await call('POST', '/api/query', {
    brand: 'Carrier',
    model: '59MN7A',
    question: 'x'.repeat(50_000),
  });
  check('oversized question returns 400', longQuestion.status === 400, `got ${longQuestion.status}`);

  const xss = await call('POST', '/api/query', {
    brand: 'Carrier',
    model: '59MN7A',
    question: '<script>alert("xss")</script> fault code 33 limit switch',
  });
  check('script payload does not error the server', xss.status === 200, `got ${xss.status}`);

  const sqlish = await call('POST', '/api/query', {
    brand: "Carrier'; DROP TABLE chunks;--",
    model: '59MN7A',
    question: 'fault code 33 limit switch test procedure',
  });
  check('SQL-style payload handled without 500', sqlish.status === 200 || sqlish.status === 400, `got ${sqlish.status}`);

  console.log('\nIngest validation');
  const ingestMissing = await call('POST', '/api/manuals/ingest', { documentName: 'Test' });
  check('ingest without text returns 400', ingestMissing.status === 400, `got ${ingestMissing.status}`);

  const ingestShort = await call('POST', '/api/manuals/ingest', {
    documentName: 'Tiny Manual',
    brand: 'Lennox',
    model: 'XC21',
    text: 'too short',
  });
  check('ingest with sub-50-char text returns 400', ingestShort.status === 400, `got ${ingestShort.status}`);

  const ingestBadTypes = await call('POST', '/api/manuals/ingest', {
    documentName: { evil: true },
    text: 12345,
  });
  check('ingest with wrong types returns 400', ingestBadTypes.status === 400, `got ${ingestBadTypes.status}`);

  const ingestGood = await call('POST', '/api/manuals/ingest', {
    documentName: 'Smoke Test Lennox XC21 Manual',
    brand: 'Lennox',
    model: 'XC21',
    text:
      '--- Page 7 ---\nCHARGING PROCEDURE\n' +
      'Verify subcooling at the liquid line service port before adjusting charge. '.repeat(8),
  });
  check('valid ingest returns 200', ingestGood.status === 200, `got ${ingestGood.status}`);
  check('valid ingest creates chunks', (ingestGood.json?.chunksCreated ?? 0) > 0);

  const afterIngest = await call('POST', '/api/query', {
    brand: 'Lennox',
    model: 'XC21',
    question: 'What is the subcooling charging procedure for this unit?',
  });
  check('newly ingested manual is retrievable', afterIngest.json?.status === 'answered', afterIngest.json?.status);

  console.log('\nEscalations');
  const escNoQuestion = await call('POST', '/api/escalations', { brand: 'Daikin', model: 'VRV-IV' });
  check('escalation without question returns 400', escNoQuestion.status === 400, `got ${escNoQuestion.status}`);

  const escBadChunks = await call('POST', '/api/escalations', {
    brand: 'Daikin',
    model: 'VRV-IV',
    question: 'Error U4 between boards',
    chunks: 'not-an-array',
  });
  check('escalation with bad chunks payload returns 400', escBadChunks.status === 400, `got ${escBadChunks.status}`);

  const escOk = await call('POST', '/api/escalations', {
    brand: 'Daikin',
    model: 'VRV-IV',
    question: 'Error U4 between indoor and outdoor boards',
    chunks: [],
  });
  check('valid escalation returns 201', escOk.status === 201, `got ${escOk.status}`);
  check('escalation returns a record id', Boolean(escOk.json?.escalation?.id));

  console.log('\nFeedback');
  const fbBadRating = await call('POST', '/api/feedback', { queryId: 'Q-1', rating: 'sideways' });
  check('invalid rating returns 400', fbBadRating.status === 400, `got ${fbBadRating.status}`);

  const fbNoId = await call('POST', '/api/feedback', { rating: 'up' });
  check('feedback without queryId returns 400', fbNoId.status === 400, `got ${fbNoId.status}`);

  const fbLongNote = await call('POST', '/api/feedback', {
    queryId: covered.json?.queryId || 'Q-1',
    rating: 'down',
    note: 'n'.repeat(10_000),
    question: 'test',
    brand: 'Carrier',
    model: '59MN7A',
    chunkIds: [],
    answerStatus: 'answered',
  });
  check('oversized note is rejected or truncated', fbLongNote.status === 400 || (fbLongNote.json?.feedback?.note?.length ?? 0) <= 500,
    `status ${fbLongNote.status}, note length ${fbLongNote.json?.feedback?.note?.length}`);

  const fbPii = await call('POST', '/api/feedback', {
    queryId: covered.json?.queryId || 'Q-1',
    rating: 'down',
    note: 'call me at marcus@example.com or 317-555-0142',
    question: 'test',
    brand: 'Carrier',
    model: '59MN7A',
    chunkIds: [],
    answerStatus: 'answered',
  });
  check('feedback note redacts email and phone',
    !String(fbPii.json?.feedback?.note || '').includes('marcus@example.com') &&
      !String(fbPii.json?.feedback?.note || '').includes('317-555-0142'),
    fbPii.json?.feedback?.note);

  console.log('\nAdmin stats');
  const stats = await call('GET', '/api/admin/stats');
  check('admin stats returns 200', stats.status === 200, `got ${stats.status}`);
  check('answer rate is within 0..1', (stats.json?.usage?.answerRate ?? -1) >= 0 && (stats.json?.usage?.answerRate ?? 2) <= 1);
  check('library gaps include the Daikin escalation', (stats.json?.gaps || []).some((g) => g.brand === 'Daikin'));

  console.log('\nRate limiting (runs last: it deliberately exhausts the query budget)');
  let sawLimit = false;
  let limitMessage = '';
  for (let i = 0; i < 60; i += 1) {
    const burst = await call('POST', '/api/query', {
      brand: 'Carrier',
      model: '59MN7A',
      question: 'fault code 33 limit switch test procedure',
    });
    if (burst.status === 429) {
      sawLimit = true;
      limitMessage = burst.json?.error || '';
      break;
    }
  }
  check('query burst is rate limited', sawLimit);
  check('rate limit returns a readable message', /wait a minute/i.test(limitMessage), limitMessage);

  console.log('\nSecurity headers');
  const headerRes = await fetch(`${BASE}/api/health`);
  check('sends X-Content-Type-Options: nosniff', headerRes.headers.get('x-content-type-options') === 'nosniff',
    headerRes.headers.get('x-content-type-options') || 'missing');
  check('hides Express fingerprint', !headerRes.headers.get('x-powered-by'), headerRes.headers.get('x-powered-by') || 'absent');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Smoke test could not run. Is the dev server up on', BASE, '?');
  console.error(err.message);
  process.exitCode = 1;
});
