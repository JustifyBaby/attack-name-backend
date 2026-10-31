import assert from 'node:assert/strict'
import test from 'node:test'
import app from '../src/index.ts'

const env = { API_TOKEN: 'test-token' }
const origin = 'https://example.com'

test('every route and method requires a bearer token', async () => {
  for (const path of ['/', '/private', '/nested/path']) {
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = await app.request(path, { method, headers: { Origin: origin } }, env)
      assert.equal(res.status, 401, `${method} ${path}`)
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
      assert.match(res.headers.get('WWW-Authenticate'), /^Bearer /)
    }
  }
})

test('invalid token is rejected', async () => {
  const res = await app.request('/', {
    headers: { Authorization: 'Bearer wrong-token', Origin: origin },
  }, env)
  assert.equal(res.status, 401)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
})

test('valid token grants access and preserves routing', async () => {
  const headers = { Authorization: `Bearer ${env.API_TOKEN}`, Origin: origin }
  const res = await app.request('/', { headers }, env)
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'Hello Hono!')
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')

  const missing = await app.request('/missing', { headers }, env)
  assert.equal(missing.status, 404)
})

test('missing or empty configuration denies access', async () => {
  for (const bindings of [{}, { API_TOKEN: '' }, { API_TOKEN: '   ' }]) {
    const res = await app.request('/', {
      headers: { Authorization: `Bearer ${env.API_TOKEN}`, Origin: origin },
    }, bindings)
    assert.equal(res.status, 503)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
  }
})

test('preflight permits authorization headers from any origin without a token', async () => {
  for (const requestOrigin of [origin, 'https://another.example']) {
    const res = await app.request('/nested/path', {
      method: 'OPTIONS',
      headers: {
        Origin: requestOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    }, {})
    assert.equal(res.status, 204)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
    assert.match(res.headers.get('Access-Control-Allow-Methods'), /POST/)
    assert.match(res.headers.get('Access-Control-Allow-Headers'), /Authorization/i)
    assert.match(res.headers.get('Access-Control-Allow-Headers'), /Content-Type/i)
  }
})
