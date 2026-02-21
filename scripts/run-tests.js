const { execSync } = require('child_process')

try {
  const output = execSync('npx vitest run --reporter=verbose', {
    cwd: '/vercel/share/v0-project',
    encoding: 'utf-8',
    timeout: 60000,
    stdio: 'pipe',
  })
  console.log(output)
} catch (err) {
  console.log(err.stdout || '')
  console.log(err.stderr || '')
  process.exit(err.status || 1)
}
