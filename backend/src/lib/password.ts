export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || plainText.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }
  return Bun.password.hash(plainText, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 2,
  });
}

export async function verifyPassword(
  plainText: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plainText || !hashedPassword) return false;
  try {
    return await Bun.password.verify(plainText, hashedPassword);
  } catch {
    return false;
  }
}
