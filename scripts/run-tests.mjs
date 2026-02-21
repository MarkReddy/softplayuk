import { execSync } from 'child_process'

try {
  const result = execSync('npx vitest run --reporter=verbose 2>&1', {
    cwd: '/vercel/share/v0-project',
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...process.env, DATABASE_URL: 'postgresql://placeholder:placeholder@placeholder/placeholder' },
  })
  console.log(result)
} catch (err) {
  console.log(err.stdout || '')
  console.log(err.stderr || '')
  console.log('Exit code:', err.status)
}
