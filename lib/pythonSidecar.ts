import { spawn, exec } from 'child_process';
import http from 'http';

let isStarting = false;

/**
 * Checks if the Python FastAPI server is currently running on localhost:8000.
 */
function isServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Ensures the Python FastAPI sidecar is up and running.
 * If not, it installs dependencies from requirements.txt and spawns the FastAPI server as a daemon.
 */
export async function ensurePythonServer(): Promise<void> {
  if (await isServerRunning()) {
    return;
  }

  if (isStarting) {
    // Wait for the other startup attempt to complete
    await new Promise((r) => setTimeout(r, 1500));
    return;
  }

  isStarting = true;
  console.log('[Python Sidecar] Sidecar is offline. Initiating self-healing startup...');

  try {
    // 1. Asynchronously run pip install to ensure requirements are fully met.
    // In many sandbox environments, libraries are already preloaded or cached.
    // We run it with a quick check to prevent delaying the start.
    await new Promise<void>((resolve) => {
      console.log('[Python Sidecar] Resolving Python dependencies...');
      exec('python3 -m pip install -r backend_python/requirements.txt', (err, stdout, stderr) => {
        if (err) {
          console.warn('[Python Sidecar] pip install warning (might already have standard libs):', stderr);
        } else {
          console.log('[Python Sidecar] Python dependencies verified successfully.');
        }
        resolve();
      });
    });

    // 2. Spawn the FastAPI uvicorn process
    console.log('[Python Sidecar] Spawning FastAPI Server...');
    const child = spawn(
      'python3',
      ['-m', 'uvicorn', 'backend_python.main:app', '--host', '127.0.0.1', '--port', '8000'],
      {
        detached: true,
        stdio: 'ignore', // Let it run quietly in background
        cwd: process.cwd()
      }
    );

    child.unref(); // Allow Next.js parent process to exit independently if needed

    // 3. Poll and wait for server to become responsive (up to 5 seconds)
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isServerRunning()) {
        console.log('[Python Sidecar] FastAPI Sidecar is ONLINE and healthy on port 8000!');
        isStarting = false;
        return;
      }
    }
    console.error('[Python Sidecar] FastAPI server took too long to respond. Will retry on next request.');
  } catch (error) {
    console.error('[Python Sidecar] Error during sidecar startup:', error);
  } finally {
    isStarting = false;
  }
}
