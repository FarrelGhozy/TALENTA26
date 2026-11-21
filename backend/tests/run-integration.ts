const testFiles = [
  'backend/tests/integration/auth.test.ts',
  'backend/tests/integration/rbac.test.ts',
  'backend/tests/integration/stage3.test.ts',
  'backend/tests/integration/stage4.test.ts',
  'backend/tests/integration/stage5.test.ts',
  'backend/tests/integration/fase1-security-points.test.ts',
];

for (const testFile of testFiles) {
  const child = Bun.spawn(['bun', 'test', testFile], {
    cwd: import.meta.dir.replace('/backend/tests', ''),
    env: Bun.env,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    console.error(`Suite integrasi gagal: ${testFile}`);
    process.exit(exitCode);
  }
}
