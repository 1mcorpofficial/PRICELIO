#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const versionFile = path.resolve(process.cwd(), 'version.json');

function parseSemver(value) {
  const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

async function main() {
  let current;
  try {
    current = JSON.parse(await readFile(versionFile, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${versionFile}: ${error.message}`);
    process.exit(1);
  }

  const parsed = parseSemver(current.version);
  if (!parsed) {
    console.error('version.json has invalid version. Expected semver: x.y.z');
    process.exit(1);
  }

  const nextVersion = `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  const nextPayload = {
    version: nextVersion,
    forceUpdate: true
  };

  await writeFile(versionFile, `${JSON.stringify(nextPayload)}\n`, 'utf8');
  process.stdout.write(`${nextVersion}\n`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
