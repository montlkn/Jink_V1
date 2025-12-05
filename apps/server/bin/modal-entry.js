#!/usr/bin/env node

/**
 * Modal adapter entry point for invoking summary services without Express.
 * Reads JSON payload from stdin and writes JSON response to stdout.
 */

import {
    getSummaryMetaService,
    getSummaryService,
    regenerateSummaryService,
} from '../src/summary/service.js';

// Redirect all console.log output to stderr so stdout stays JSON-only.
console.log = (...args) => {
  process.stderr.write(`${args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')}\n`);
};

async function readInput() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    process.stdin.on('error', reject);
  });
}

async function main() {
  const command = process.argv[2];
  if (!command) {
    process.stdout.write(JSON.stringify({ status: 400, body: { error: 'Missing command' } }));
    return;
  }

  let payload = {};
  try {
    payload = await readInput();
  } catch (error) {
    process.stderr.write(`[modal-entry] Failed to parse payload: ${error.message}\n`);
    process.stdout.write(JSON.stringify({ status: 400, body: { error: 'Invalid JSON payload' } }));
    return;
  }

  try {
    let result;
    if (command === 'get-summary') {
      result = await getSummaryService({
        authorization: payload.authorization || '',
        autogen: Boolean(payload.autogen),
      });
    } else if (command === 'regenerate-summary') {
      result = await regenerateSummaryService({
        authorization: payload.authorization || '',
        idempotencyKey: payload.idempotencyKey,
      });
    } else if (command === 'get-summary-meta') {
      result = await getSummaryMetaService({
        authorization: payload.authorization || '',
      });
    } else if (command === 'upload-contribution') {
      result = await uploadContributionService({
        authId: payload.authId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        heading: payload.heading,
        fov: payload.fov,
        pitch: payload.pitch,
        imagePath: payload.imagePath,
        userNotes: payload.userNotes,
      });
      // Wrap result in standard format if service returns direct object
      if (!result.status) {
        result = { status: 200, body: result };
      }
    } else {
      result = { status: 404, body: { error: `Unknown command: ${command}` } };
    }

    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(`[modal-entry] Error: ${error.message}\n`);
    process.stdout.write(JSON.stringify({ status: 500, body: { error: 'Internal server error' } }));
  }
}

main().catch(error => {
  process.stderr.write(`[modal-entry] Unhandled error: ${error.message}\n`);
  process.stdout.write(JSON.stringify({ status: 500, body: { error: 'Internal server error' } }));
});
