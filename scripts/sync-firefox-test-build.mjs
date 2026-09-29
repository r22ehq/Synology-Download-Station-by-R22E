import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(workspace, '.output', 'firefox-mv3');
const parent = join(workspace, 'release-candidates', 'firefox');
const current = join(parent, 'current');
const marker = '.r22e-generated-build.json';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const exists = async path => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const manifest = await readJson(join(source, 'manifest.json'));
const project = await readJson(join(workspace, 'package.json'));
if (manifest.version !== project.version) {
  throw new Error('Firefox build version does not match package.json; refusing to publish a confusing test folder.');
}

await mkdir(parent, { recursive: true });
if (await exists(current) && !(await exists(join(current, marker)))) {
  throw new Error('The current Firefox folder was not created by this script. Leaving it untouched.');
}

const stage = await mkdtemp(join(parent, '.current-staging-'));
const backup = join(parent, `.current-backup-${randomUUID()}`);
let movedCurrent = false;
try {
  await cp(source, stage, { recursive: true, force: true });
  await writeFile(join(stage, marker), `${JSON.stringify({
    generatedBy: 'scripts/sync-firefox-test-build.mjs',
    version: manifest.version,
    builtAt: new Date().toISOString(),
    source: '.output/firefox-mv3',
  }, null, 2)}\n`);

  if (await exists(current)) {
    await rename(current, backup);
    movedCurrent = true;
  }
  await rename(stage, current);
  if (movedCurrent) await rm(backup, { recursive: true });
  process.stdout.write(`Current Firefox test build: ${current} (v${manifest.version})\n`);
} catch (error) {
  if (movedCurrent && !(await exists(current))) await rename(backup, current);
  if (await exists(stage)) await rm(stage, { recursive: true });
  throw error;
}
