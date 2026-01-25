/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
export function assertEnvsAreSet(variables: string[]): void {
  const missing: string[] = [];

  variables.forEach((variable) => {
    if (!Object.prototype.hasOwnProperty.call(process.env, variable)) {
      missing.push(variable);
      return;
    }
    if (process.env[variable] === "") {
      missing.push(variable);
    }
  });

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}
