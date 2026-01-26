/**
 * Copyright (C) 2026 by Outlast.
 *
 * Column type definitions with width constraints for CLI table rendering.
 * These widths are based on realistic data expectations from the schema.
 */

export const ColumnTypes = {
  /** Full UUID (36 chars) + padding */
  uuid: { width: 38, maxContent: 36 },

  /** Email addresses - optimized for average length ~22 chars */
  email: { width: 24, maxContent: 28 },

  /** Phone format: +1-555-123-4567 (14 chars) */
  phone: { width: 14, maxContent: 15 },

  /** Person or entity names */
  name: { width: 22, maxContent: 25 },

  /** Record titles - variable length, may truncate */
  title: { width: 30, maxContent: 50 },

  /** Short enums: OPEN, LOW, EMAIL, SMS, DONE */
  enum_small: { width: 10, maxContent: 8 },

  /** Medium enums: PURCHASE_ORDER, INVENTORY_ITEM, BACKORDERED */
  enum_medium: { width: 16, maxContent: 14 },

  /** Locale date string: 01/25/2026 */
  date_short: { width: 12, maxContent: 10 },

  /** Cron expressions or schedule strings */
  schedule: { width: 15, maxContent: 20 },

  /** AI model names: gpt-4o, claude-3-opus */
  model: { width: 20, maxContent: 25 }
} as const;

export type ColumnTypeName = keyof typeof ColumnTypes;

export interface ColumnDef<T> {
  /** Column header text */
  header: string;
  /** Field name to extract from data object */
  field: keyof T;
  /** Column type for width calculation */
  type: ColumnTypeName;
  /** Optional formatter function */
  format?: (value: unknown) => string;
}

/**
 * Get the width for a column type
 */
export function getColumnWidth(type: ColumnTypeName): number {
  return ColumnTypes[type].width;
}

/**
 * Get the max expected content length for a column type
 */
export function getMaxContent(type: ColumnTypeName): number {
  return ColumnTypes[type].maxContent;
}

/**
 * Calculate total width needed for a set of columns
 */
export function calculateTotalWidth(types: ColumnTypeName[]): number {
  return types.reduce((sum, type) => sum + getColumnWidth(type), 0);
}
