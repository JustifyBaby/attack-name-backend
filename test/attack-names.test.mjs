import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import app from '../src/index.ts'

test('attack names API with local D1', async (t) => {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("OK") } }',
    compatibilityDate: '2026-10-30',
    d1Databases: ['attack_name_backend_db'],
  }))
  t.after(() => mf.dispose())
  const db = await mf.getD1Database('attack_name_backend_db')
  const migrations = new URL('../drizzle/', import.meta.url)
  for (const file of (await readdir(migrations)).filter((file) => file.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(file, migrations), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) await db.prepare(statement).run()
    }
  }

  const env = { API_TOKEN: 'test-token', attack_name_backend_db: db }
  const request = (path = '', options = {}) => app.request(`/attack-names${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }, env)
  const input = { attackName: '流星拳', description: '星の勢いで放つ拳', author: '学生', tag: '攻撃' }

  await t.test('empty database returns an empty array', async () => {
    const res = await request()
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })

  await t.test('all API operations require authentication', async () => {
    for (const [method, path] of [['GET', ''], ['POST', ''], ['DELETE', '/1']]) {
      const res = await request(path, { method, headers: { Authorization: '' }, body: method === 'POST' ? JSON.stringify(input) : undefined })
      assert.equal(res.status, 401)
    }
  })

  await t.test('invalid JSON payloads are rejected without writing', async () => {
    const invalid = [
      {}, { ...input, attackName: '   ' }, { ...input, attackName: 'a'.repeat(51) },
      { ...input, author: 'a'.repeat(51) }, { ...input, description: '' },
      { ...input, description: 'a'.repeat(501) }, { ...input, tag: '補助' },
      { ...input, tag: 1 }, { ...input, id: 99 }, { ...input, createdAt: 'yesterday' },
      { ...input, effectId: -1 }, { ...input, effectId: 3 }, { ...input, effectId: 1.5 },
    ]
    for (const value of invalid) {
      const res = await request('', { method: 'POST', body: JSON.stringify(value) })
      assert.equal(res.status, 400, JSON.stringify(value))
    }
    const malformed = await request('', { method: 'POST', body: '{' })
    assert.equal(malformed.status, 400)
    assert.deepEqual(await (await request()).json(), [])
  })

  let id
  await t.test('POST persists trimmed fields and GET returns all rows in ID order', async () => {
    const res = await request('', { method: 'POST', body: JSON.stringify({ ...input, attackName: ` ${input.attackName} ` }) })
    assert.equal(res.status, 201)
    const row = await res.json()
    id = row.id
    assert.equal(res.headers.get('Location'), `/attack-names/${id}`)
    assert.deepEqual(row, { ...input, id, effectId: 0, createdAt: row.createdAt })
    assert.equal(new Date(row.createdAt).toISOString(), row.createdAt)
    const second = await request('', { method: 'POST', body: JSON.stringify({ ...input, tag: '回避', effectId: 2 }) })
    assert.equal(second.status, 201)
    const secondRow = await second.json()
    assert.equal(secondRow.effectId, 2)
    const list = await request()
    assert.equal(list.status, 200)
    assert.deepEqual(await list.json(), [row, secondRow])
  })

  await t.test('DELETE rejects invalid IDs and reports missing records', async () => {
    for (const value of ['0', '-1', '1.5', 'abc', '1e2', '9007199254740992']) {
      assert.equal((await request(`/${value}`, { method: 'DELETE' })).status, 400)
    }
    assert.equal((await request('/999999', { method: 'DELETE' })).status, 404)
  })

  await t.test('DELETE removes only the selected record', async () => {
    const res = await request(`/${id}`, { method: 'DELETE' })
    assert.equal(res.status, 204)
    assert.equal(await res.text(), '')
    const remaining = await (await request()).json()
    assert.equal(remaining.length, 1)
    assert.notEqual(remaining[0].id, id)
    assert.equal((await request(`/${id}`, { method: 'DELETE' })).status, 404)
  })
})
