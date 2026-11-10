import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

@Injectable()
export class PasswordHasher {
  private static readonly KEY_LENGTH = 64;
  private static readonly SCRYPT_OPTIONS = {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  };

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await this.derive(password, salt);
    return `scrypt$16384$8$1$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const [algorithm, n, r, p, saltValue, hashValue] =
      encodedHash.split('$');
    if (
      algorithm !== 'scrypt' ||
      n !== '16384' ||
      r !== '8' ||
      p !== '1' ||
      !saltValue ||
      !hashValue
    ) {
      return false;
    }

    let salt: Buffer;
    let expectedHash: Buffer;
    try {
      salt = Buffer.from(saltValue, 'base64url');
      expectedHash = Buffer.from(hashValue, 'base64url');
    } catch {
      return false;
    }
    if (
      salt.length !== 16 ||
      expectedHash.length !== PasswordHasher.KEY_LENGTH
    ) {
      return false;
    }

    const actualHash = await this.derive(password, salt);
    return timingSafeEqual(expectedHash, actualHash);
  }

  private derive(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(
        password,
        salt,
        PasswordHasher.KEY_LENGTH,
        PasswordHasher.SCRYPT_OPTIONS,
        (error, derivedKey) => {
          if (error) {
            reject(error);
          } else {
            resolve(derivedKey);
          }
        },
      );
    });
  }
}
