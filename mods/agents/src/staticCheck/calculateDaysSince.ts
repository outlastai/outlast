/**
 * Copyright (C) 2026 by Outlast.
 *
 * Pure utility for calculating days between dates.
 */

/**
 * Calculate the number of full days since a given date.
 * @param date - The date to measure from
 * @param now - The current date (defaults to new Date())
 * @returns Number of full days since the date
 */
export function calculateDaysSince(date: Date, now: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - date.getTime()) / msPerDay);
}
