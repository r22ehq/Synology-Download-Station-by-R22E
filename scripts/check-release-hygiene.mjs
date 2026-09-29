import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const privatePath = /(^|\/)(?:AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.codex|\.agents|\.claude|\.gemini|\.playwright-cli|output|test-results|playwright-report|release-candidates|scratch|design-qa\.md|task\.md|walkthrough\.md|implementation_plan\.md)(?:\/|$)/i;
const sourceFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const violations = sourceFiles.filter(file => privatePath.test(file));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const browsers = ['chrome', 'edge', 'firefox', 'opera'];
const target = process.argv[2] === '--browser' ? process.argv[3] : undefined;
if (target && !browsers.includes(target)) throw new Error('Unknown browser target');
for (const browser of target ? [target] : browsers) {
  const dir = `.output/${browser}-mv3`;
  if (!existsSync(`${dir}/manifest.json`)) {
    violations.push(`${dir}: production build is missing`);
    continue;
  }
  const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
  if (manifest.version !== pkg.version) violations.push(`${dir}: version differs from ${pkg.version}`);
  if (manifest.host_permissions?.length) violations.push(`${dir}: production package contains permanent host permissions`);
  if (browser === 'firefox') {
    const policy = manifest.content_security_policy?.extension_pages || '';
    if (!policy.includes("script-src 'self'") || /upgrade-insecure-requests|unsafe-inline|unsafe-eval/.test(policy)) violations.push(`${dir}: Firefox must preserve the selected protocol and packaged-only scripts`);
    if (!manifest.optional_host_permissions?.includes('http://*/*') || !manifest.optional_host_permissions?.includes('https://*/*')) violations.push(`${dir}: Firefox optional HTTP/HTTPS host access is missing`);
  }
  const inspect = folder => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      const relative = path.relative(dir, full).replaceAll('\\', '/');
      if (privatePath.test(relative) || /\.(?:map|log|env)$/i.test(relative)) violations.push(`${dir}/${relative}`);
      if (entry.isDirectory()) inspect(full);
    }
  };
  inspect(dir);
}
if (violations.length) {
  console.error('Release hygiene check failed:\n' + violations.join('\n'));
  process.exit(1);
}
console.log(`Release hygiene passed for ${pkg.version}: no private workspace files tracked or bundled.`);
