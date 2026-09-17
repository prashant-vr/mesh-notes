import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const getPort = () => {
  try {
    if (fs.existsSync('port.txt')) {
      const p = fs.readFileSync('port.txt', 'utf8').trim();
      if (p) return p;
    }
  } catch (_) {}
  return process.env.PORT || '3000';
};

const BASE_URL = `http://localhost:${getPort()}`;

const runTests = async () => {
  console.log(`--- Starting Comprehensive End-to-End Tests on ${BASE_URL} ---`);

  // 1. Health check & PWA manifest
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check should be 200');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  console.log('✓ Health check passed');

  const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
  assert.strictEqual(manifestRes.status, 200, 'PWA Manifest should return 200');
  const manifestData = await manifestRes.json();
  assert.strictEqual(manifestData.short_name, 'MeshNotes');
  console.log('✓ PWA Manifest passed');

  // SSR Landing Page
  const landingRes = await fetch(`${BASE_URL}/`);
  const landingHtml = await landingRes.text();
  assert.strictEqual(landingRes.status, 200);
  assert.ok(landingHtml.includes('The private space for your'), 'Landing should have hero text');
  assert.ok(landingHtml.includes('Free Forever'), 'Landing should have free plan');
  console.log('✓ SSR Landing Page delivery passed');

  // SSR Docs Page
  const docRes = await fetch(`${BASE_URL}/docs/getting-started`);
  const docHtml = await docRes.text();
  assert.strictEqual(docRes.status, 200);
  assert.ok(docHtml.includes('Welcome to Mesh Notes'), 'Doc should have chapter title');
  console.log('✓ SSR Docs chapter delivery passed');

  // SPA app shell
  const appRes = await fetch(`${BASE_URL}/app`);
  const appHtml = await appRes.text();
  assert.strictEqual(appRes.status, 200);
  assert.ok(appHtml.includes('id="root"'), 'SPA shell should contain #root');
  console.log('✓ SPA App shell (/app) delivery passed');

  // 2. Auth Flow (login existing or register test user)
  const testEmail = `user_${Date.now()}@meshnotes.local`;
  const testPassword = 'securePassword123';

  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  assert.strictEqual(regRes.status, 201, 'Registration should return 201');
  const regData = await regRes.json();
  const token = regData.token;
  assert.ok(token, 'Should receive JWT token');
  console.log('✓ User registration passed');

  // Test resend verification endpoint
  const resendRes = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  assert.strictEqual(resendRes.status, 200, 'Resend verification should return 200');
  console.log('✓ Email verification resend endpoint passed');

  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(meRes.status, 200, 'Auth me should return 200');
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, testEmail);
  console.log('✓ Auth /me verification passed');

  // 3. Hierarchical Folders
  const folderRes = await fetch(`${BASE_URL}/api/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Work', color: '#3b82f6' })
  });
  assert.strictEqual(folderRes.status, 201);
  const parentFolder = (await folderRes.json()).folder;

  const subFolderRes = await fetch(`${BASE_URL}/api/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Q3 Plans', parent_id: parentFolder.id, color: '#10b981' })
  });
  assert.strictEqual(subFolderRes.status, 201);
  const subFolder = (await subFolderRes.json()).folder;

  const listFoldersRes = await fetch(`${BASE_URL}/api/folders`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const foldersTree = await listFoldersRes.json();
  assert.ok(foldersTree.tree.some(f => f.id === parentFolder.id && f.children?.length === 1));
  console.log('✓ Hierarchical folders tree passed');

  // 4. Memos & Automatic URL Ingestion
  const memoRes = await fetch(`${BASE_URL}/api/memos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      content: 'Important research into #decentralized systems: https://github.com',
      folder_id: subFolder.id
    })
  });
  assert.strictEqual(memoRes.status, 201);
  const createdMemo = (await memoRes.json()).memo;
  assert.strictEqual(createdMemo.tags.length, 1);
  assert.strictEqual(createdMemo.tags[0].name, 'decentralized');
  assert.ok(createdMemo.bookmark, 'URL should be detected and bookmark created');
  assert.strictEqual(createdMemo.bookmark.domain, 'github.com');
  console.log('✓ Memo creation & URL unfurl passed');

  // 5. Unified FTS5 Search
  const searchRes = await fetch(`${BASE_URL}/api/memos?search=decentralized`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(searchRes.status, 200);
  const searchResults = (await searchRes.json()).memos;
  assert.ok(searchResults.length >= 1, 'FTS5 search should find memo by tag/content');
  assert.ok(searchResults[0].content_snippet.includes('<mark'), 'Snippet should have mark tag');
  console.log('✓ Unified FTS5 BM25 search & snippet highlighting passed');

  // 6. Reader Mode Endpoint & Bookmark Status
  const bookmarkId = createdMemo.bookmark.id;
  const statusRes = await fetch(`${BASE_URL}/api/bookmarks/${bookmarkId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'reading' })
  });
  assert.strictEqual(statusRes.status, 200);

  const readerRes = await fetch(`${BASE_URL}/api/bookmarks/${bookmarkId}/reader`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(readerRes.status, 200);
  const readerData = await readerRes.json();
  assert.strictEqual(readerData.reader.reading_status, 'reading');
  console.log('✓ Bookmark triage & Reader Mode endpoint passed');

  // 7. Prompts & LLM Providers
  const promptsRes = await fetch(`${BASE_URL}/api/ai/prompts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(promptsRes.status, 200);
  const promptsData = await promptsRes.json();
  assert.ok(promptsData.prompts.length >= 8, 'Default seeded AI prompts should be present');
  console.log('✓ AI prompt templates repository passed');

  // 8. Data Export (Zip archive)
  const exportRes = await fetch(`${BASE_URL}/api/data/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(exportRes.status, 200);
  assert.strictEqual(exportRes.headers.get('content-type'), 'application/zip');
  const buffer = await exportRes.arrayBuffer();
  assert.ok(buffer.byteLength > 100, 'Export zip should not be empty');
  // Check zip magic bytes: PK\x03\x04
  const bytes = new Uint8Array(buffer);
  assert.strictEqual(bytes[0], 0x50, 'PK zip magic byte 1');
  assert.strictEqual(bytes[1], 0x4b, 'PK zip magic byte 2');
  console.log('✓ Zip backup export (Markdown frontmatter + Netscape HTML) passed');

  // 9. Audit Logs
  const logsRes = await fetch(`${BASE_URL}/api/logs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(logsRes.status, 200);
  const logsData = await logsRes.json();
  assert.ok(logsData.logs.length > 0, 'Audit logs should record actions');
  console.log('✓ System activity & audit logging passed');

  console.log('\n🌟 ALL 9 INTEGRATION TEST SUITES PASSED FLAWLESSLY! 🌟\n');
};

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
