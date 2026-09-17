import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '0.0.0.0');
  });
};

const findAvailablePort = async (startPort = 3000) => {
  let port = startPort;
  while (port < 65535) {
    const available = await isPortAvailable(port);
    if (available) return port;
    port++;
  }
  return 0; // system will assign random open port
};

export const resolvePort = async (baseDir = process.cwd()) => {
  const portFilePath = path.join(baseDir, 'port.txt');
  
  if (fs.existsSync(portFilePath)) {
    try {
      const content = fs.readFileSync(portFilePath, 'utf8').trim();
      const parsedPort = parseInt(content, 10);
      if (!Number.isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        const available = await isPortAvailable(parsedPort);
        if (available) {
          console.log(`[Port] Using existing port from port.txt: ${parsedPort}`);
          return parsedPort;
        }
        console.warn(`[Port] Port ${parsedPort} from port.txt is busy. Finding new open port...`);
      }
    } catch (err) {
      console.error('[Port] Failed reading port.txt:', err.message);
    }
  }

  const newPort = await findAvailablePort(3000);
  try {
    fs.writeFileSync(portFilePath, `${newPort}\n`, 'utf8');
    console.log(`[Port] Found and saved available port ${newPort} to port.txt`);
  } catch (err) {
    console.error('[Port] Failed to save port to port.txt:', err.message);
  }
  return newPort;
};
