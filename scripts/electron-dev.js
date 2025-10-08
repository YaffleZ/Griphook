const { spawn } = require('child_process');
const net = require('net');

// Function to check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to wait for server to be ready
function waitForServer(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkServer = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(port);
      });
      socket.on('error', () => {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 1000);
        } else {
          reject(new Error(`Server not ready on port ${port} after ${maxAttempts} attempts`));
        }
      });
      socket.connect(port, 'localhost');
    };
    checkServer();
  });
}

async function startElectronDev() {
  console.log('🚀 Starting Griphook Desktop Development...');
  
  // Start Next.js dev server
  console.log('📦 Starting Next.js development server...');
  const nextProcess = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  try {
    // Wait for Next.js server to be ready (try both ports)
    console.log('⏳ Waiting for Next.js server...');
    let serverPort;
    try {
      serverPort = await waitForServer(3000);
      console.log('✅ Next.js server ready on port 3000');
    } catch {
      try {
        serverPort = await waitForServer(3001);
        console.log('✅ Next.js server ready on port 3001');
      } catch {
        throw new Error('Next.js server failed to start on ports 3000 or 3001');
      }
    }
    
    // Update environment variable for Electron
    process.env.ELECTRON_DEV_SERVER_URL = `http://localhost:${serverPort}`;
    
    // Start Electron
    console.log('🖥️  Starting Electron...');
    const electronProcess = spawn('electron', ['.'], { 
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    // Handle process cleanup
    const cleanup = () => {
      console.log('\n🧹 Cleaning up processes...');
      nextProcess.kill();
      electronProcess.kill();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    electronProcess.on('close', () => {
      console.log('🖥️  Electron closed');
      nextProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    nextProcess.kill();
    process.exit(1);
  }
}

startElectronDev();