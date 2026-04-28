type Meta = { page?: number; total?: number };

export const ok = <T>(data: T, meta?: Meta) => ({
  success: true as const,
  data,
  ...(meta !== undefined && { meta }),
});

export const fail = (code: string, message: string, details?: unknown[]) => ({
  success: false as const,
  error: { code, message, ...(details !== undefined && { details }) },
});
