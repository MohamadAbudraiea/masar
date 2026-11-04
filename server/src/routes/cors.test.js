import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

test('CORS - allows requests from masar.vydo.tech', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'https://masar.vydo.tech',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://masar.vydo.tech');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    server.close();
  }
});

test('CORS - allows requests from api-masar.vydo.tech', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'https://api-masar.vydo.tech',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://api-masar.vydo.tech');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    server.close();
  }
});

test('CORS - allows requests from localhost for development', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  } finally {
    server.close();
  }
});

test('CORS - handles preflight OPTIONS request for masar.vydo.tech', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://masar.vydo.tech',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://masar.vydo.tech');
    assert.ok(res.headers.get('access-control-allow-methods').includes('POST'));
  } finally {
    server.close();
  }
});

