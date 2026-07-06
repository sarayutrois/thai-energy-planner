import { spawn } from 'child_process';
import http from 'http';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES_TO_TEST = [
  { path: '/', expectedStatus: 200 },
  { path: '/analysis/new', expectedStatus: 200 },
  { path: '/analysis/load-data', expectedStatus: 200 },
  { path: '/analysis/scenarios', expectedStatus: 200 },
  { path: '/analysis/solar', expectedStatus: 200 },
  { path: '/analysis/battery', expectedStatus: 200 },
  { path: '/analysis/ev', expectedStatus: 200 },
  { path: '/analysis/reports', expectedStatus: 200 },
  { path: '/admin', allowedStatuses: [401, 404] },
  { path: '/admin/tariffs', allowedStatuses: [401, 404] },
  { path: '/admin/audit-logs', allowedStatuses: [401, 404] },
];

function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

async function waitForServer(port, maxRetries = 30) {
  console.log(`Waiting for server on port ${port}...`);
  for (let i = 0; i < maxRetries; i++) {
    const isAvailable = await checkPortAvailability(port);
    if (isAvailable) {
      console.log('Server is ready!');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function runSmokeTests() {
  console.log('--- Starting Smoke Tests ---');
  let allPassed = true;

  for (const route of ROUTES_TO_TEST) {
    try {
      const url = `${BASE_URL}${route.path}`;
      const res = await fetch(url, { redirect: 'manual' });
      
      const allowedStatuses = route.allowedStatuses ?? [route.expectedStatus];
      if (allowedStatuses.includes(res.status)) {
        console.log(`✅ [PASS] GET ${route.path} -> ${res.status}`);
      } else {
        console.error(`❌ [FAIL] GET ${route.path} -> Expected ${allowedStatuses.join(' or ')}, got ${res.status}`);
        allPassed = false;
      }
    } catch (err) {
      console.error(`❌ [ERROR] GET ${route.path} -> ${err.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function main() {
  let serverProcess;
  const isAlreadyRunning = await checkPortAvailability(PORT);
  
  if (!isAlreadyRunning) {
    console.log('Starting Next.js production server...');
    serverProcess = spawn('npm', ['--workspace', '@thai-energy-planner/web', 'run', 'start', '--', '-p', PORT.toString()], {
      stdio: 'inherit',
      shell: true
    });
    
    const serverReady = await waitForServer(PORT, 30);
    if (!serverReady) {
      console.error('Server failed to start within the timeout.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  } else {
    console.log('Server is already running.');
  }

  const success = await runSmokeTests();
  
  if (serverProcess) {
    serverProcess.kill();
  }

  if (success) {
    console.log('--- All Smoke Tests Passed! ---');
    process.exit(0);
  } else {
    console.error('--- Smoke Tests Failed! ---');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
