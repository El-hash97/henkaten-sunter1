import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL belum di-set');
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}
