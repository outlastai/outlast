/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Shared table rendering utility with type-based column widths.
 */
import cliui from "cliui";
import { ColumnDef, getColumnWidth } from "./schema.js";

export interface RenderTableOptions {
  /** Total table width (default: 120) */
  width?: number;
}

/**
 * Truncate a string to fit within a max width, adding ellipsis if needed
 */
function truncate(str: string, maxWidth: number): string {
  if (str.length <= maxWidth) {
    return str;
  }
  return str.slice(0, maxWidth - 1) + "…";
}

/**
 * Default formatters for common data types
 */
export const formatters = {
  /** Format a UUID (full) */
  uuid: (value: unknown): string => {
    if (typeof value !== "string") return "-";
    return value;
  },

  /** Format a date to locale string */
  dateShort: (value: unknown): string => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value as string);
    return date.toLocaleDateString();
  },

  /** Format nullable string values */
  nullable: (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    return String(value);
  }
};

/**
 * Render a table with type-based column widths
 *
 * @param data - Array of data objects to render
 * @param columns - Column definitions with headers, fields, types, and optional formatters
 * @param options - Rendering options
 * @returns Formatted table string
 */
export function renderTable<T extends Record<string, unknown>>(
  data: T[],
  columns: ColumnDef<T>[],
  options: RenderTableOptions = {}
): string {
  const { width = 120 } = options;
  const ui = cliui({ width });

  // Build header row
  const headerCells = columns.map((col, index) => ({
    text: col.header,
    width: getColumnWidth(col.type),
    padding: [0, index === columns.length - 1 ? 0 : 1, 0, 0] as [number, number, number, number]
  }));

  ui.div(...headerCells);

  // Build data rows
  for (const row of data) {
    const cells = columns.map((col, index) => {
      const rawValue = row[col.field];
      const formatted = col.format ? col.format(rawValue) : formatters.nullable(rawValue);

      // Truncate to fit column width (minus padding)
      const colWidth = getColumnWidth(col.type);
      const displayValue = truncate(formatted, colWidth - 2);

      return {
        text: displayValue,
        width: colWidth,
        padding: [0, index === columns.length - 1 ? 0 : 1, 0, 0] as [number, number, number, number]
      };
    });

    ui.div(...cells);
  }

  return ui.toString();
}

/**
 * Get column definitions for contacts list
 */
export function getContactColumns<
  T extends {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    preferredChannel: string;
    createdAt: Date | string;
  }
>(): ColumnDef<T>[] {
  return [
    { header: "ID", field: "id" as keyof T, type: "uuid", format: formatters.uuid },
    { header: "NAME", field: "name" as keyof T, type: "name" },
    { header: "EMAIL", field: "email" as keyof T, type: "email", format: formatters.nullable },
    { header: "PHONE", field: "phone" as keyof T, type: "phone", format: formatters.nullable },
    { header: "CHANNEL", field: "preferredChannel" as keyof T, type: "enum_small" },
    {
      header: "CREATED",
      field: "createdAt" as keyof T,
      type: "date_short",
      format: formatters.dateShort
    }
  ];
}

/**
 * Get column definitions for records list
 */
export function getRecordColumns<
  T extends {
    id: string;
    title: string;
    status: string;
    type: string;
    priority: string | null;
    createdAt: Date | string;
  }
>(): ColumnDef<T>[] {
  return [
    { header: "ID", field: "id" as keyof T, type: "uuid", format: formatters.uuid },
    { header: "TITLE", field: "title" as keyof T, type: "title" },
    { header: "STATUS", field: "status" as keyof T, type: "enum_small" },
    { header: "TYPE", field: "type" as keyof T, type: "enum_medium" },
    {
      header: "PRIORITY",
      field: "priority" as keyof T,
      type: "enum_small",
      format: formatters.nullable
    },
    {
      header: "CREATED",
      field: "createdAt" as keyof T,
      type: "date_short",
      format: formatters.dateShort
    }
  ];
}

/**
 * Get column definitions for workflows list
 */
export function getWorkflowColumns<
  T extends {
    id: string;
    name: string;
    model: string | null;
    schedule: string | null;
    createdAt: Date | string;
  }
>(): ColumnDef<T>[] {
  return [
    { header: "ID", field: "id" as keyof T, type: "uuid", format: formatters.uuid },
    { header: "NAME", field: "name" as keyof T, type: "name" },
    { header: "MODEL", field: "model" as keyof T, type: "model", format: formatters.nullable },
    {
      header: "SCHEDULE",
      field: "schedule" as keyof T,
      type: "schedule",
      format: formatters.nullable
    },
    {
      header: "CREATED",
      field: "createdAt" as keyof T,
      type: "date_short",
      format: formatters.dateShort
    }
  ];
}
