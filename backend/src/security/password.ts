import { randomBytes, scrypt as callbackScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(callbackScrypt);
export async function hashPassword(value: string) {
  const salt = randomBytes(16).toString('hex'); const hash = await scrypt(value, salt, 64) as Buffer;
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function checkPassword(value: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hash ?? '')) return false;
  const actual = await scrypt(value, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
