/**
 * Copyright (C) 2026 by Outlast.
 *
 * Simple utility to convert escaped newlines in PEM keys.
 */

export const toPem = (value: string | undefined): string => (value ?? "").replace(/\\n/g, "\n");
