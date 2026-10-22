/** Non-destructive local TCP bind check, not a guarantee against a later race. */
import {createServer} from 'node:net';
export async function canBindLoopback(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  return await new Promise(resolve => {
    const server = createServer();
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {server.close(() => resolve(value));}
      catch {resolve(false);}
    };
    const timer=setTimeout(()=>finish(false),1500);
    server.once('error',()=>finish(false));
    server.listen({host:'127.0.0.1',port,exclusive:true},()=>finish(true));
  });
}
