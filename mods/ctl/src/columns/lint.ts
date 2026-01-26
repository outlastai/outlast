#!/usr/bin/env npx tsx
/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Column width linting script.
 * Validates that mock data fits within defined column widths.
 *
 * Usage: npx tsx src/columns/lint.ts
 */
import { ColumnTypeName, getColumnWidth, getMaxContent } from "./schema.js";
import {
  contactFixtures,
  recordFixtures,
  workflowFixtures,
  ContactFixture,
  RecordFixture,
  WorkflowFixture
} from "./fixtures.js";
import {
  renderTable,
  getContactColumns,
  getRecordColumns,
  getWorkflowColumns
} from "./renderTable.js";

interface LintWarning {
  entity: string;
  field: string;
  columnType: ColumnTypeName;
  value: string;
  valueLength: number;
  columnWidth: number;
  severity: "warning" | "error";
  message: string;
}

const warnings: LintWarning[] = [];
const TABLE_WIDTH = 120;

/**
 * Check if a value exceeds the column width
 */
function checkValue(
  entity: string,
  field: string,
  columnType: ColumnTypeName,
  value: string | null | undefined
): void {
  if (value === null || value === undefined) return;

  const strValue = String(value);
  const colWidth = getColumnWidth(columnType);
  const maxContent = getMaxContent(columnType);

  // Error: Value significantly exceeds max expected content
  if (strValue.length > maxContent * 1.5) {
    warnings.push({
      entity,
      field,
      columnType,
      value: strValue.slice(0, 50) + (strValue.length > 50 ? "..." : ""),
      valueLength: strValue.length,
      columnWidth: colWidth,
      severity: "error",
      message: `Value (${strValue.length} chars) significantly exceeds expected max (${maxContent} chars)`
    });
  }
  // Warning: Value exceeds column display width (will be truncated)
  else if (strValue.length > colWidth - 2) {
    warnings.push({
      entity,
      field,
      columnType,
      value: strValue.slice(0, 50) + (strValue.length > 50 ? "..." : ""),
      valueLength: strValue.length,
      columnWidth: colWidth,
      severity: "warning",
      message: `Value (${strValue.length} chars) exceeds display width (${colWidth - 2} chars), will be truncated`
    });
  }
}

/**
 * Lint contact fixtures
 */
function lintContacts(): void {
  const columns = getContactColumns<ContactFixture>();

  for (const contact of contactFixtures) {
    checkValue("Contact", "name", "name", contact.name);
    checkValue("Contact", "email", "email", contact.email);
    checkValue("Contact", "phone", "phone", contact.phone);
    checkValue("Contact", "preferredChannel", "enum_small", contact.preferredChannel);
  }

  // Check total width
  const totalWidth = columns.reduce((sum, col) => sum + getColumnWidth(col.type), 0);
  if (totalWidth > TABLE_WIDTH) {
    warnings.push({
      entity: "Contact",
      field: "*",
      columnType: "uuid",
      value: "",
      valueLength: 0,
      columnWidth: totalWidth,
      severity: "error",
      message: `Total column width (${totalWidth}) exceeds table width (${TABLE_WIDTH})`
    });
  }
}

/**
 * Lint record fixtures
 */
function lintRecords(): void {
  const columns = getRecordColumns<RecordFixture>();

  for (const record of recordFixtures) {
    checkValue("Record", "title", "title", record.title);
    checkValue("Record", "status", "enum_small", record.status);
    checkValue("Record", "type", "enum_medium", record.type);
    checkValue("Record", "priority", "enum_small", record.priority);
  }

  // Check total width
  const totalWidth = columns.reduce((sum, col) => sum + getColumnWidth(col.type), 0);
  if (totalWidth > TABLE_WIDTH) {
    warnings.push({
      entity: "Record",
      field: "*",
      columnType: "uuid",
      value: "",
      valueLength: 0,
      columnWidth: totalWidth,
      severity: "error",
      message: `Total column width (${totalWidth}) exceeds table width (${TABLE_WIDTH})`
    });
  }
}

/**
 * Lint workflow fixtures
 */
function lintWorkflows(): void {
  const columns = getWorkflowColumns<WorkflowFixture>();

  for (const workflow of workflowFixtures) {
    checkValue("Workflow", "name", "name", workflow.name);
    checkValue("Workflow", "model", "model", workflow.model);
    checkValue("Workflow", "schedule", "schedule", workflow.schedule);
  }

  // Check total width
  const totalWidth = columns.reduce((sum, col) => sum + getColumnWidth(col.type), 0);
  if (totalWidth > TABLE_WIDTH) {
    warnings.push({
      entity: "Workflow",
      field: "*",
      columnType: "uuid",
      value: "",
      valueLength: 0,
      columnWidth: totalWidth,
      severity: "error",
      message: `Total column width (${totalWidth}) exceeds table width (${TABLE_WIDTH})`
    });
  }
}

/**
 * Print a sample table render for visual inspection
 */
function printSampleTables(): void {
  console.log("\n" + "=".repeat(TABLE_WIDTH));
  console.log("SAMPLE TABLE RENDERS (for visual inspection)");
  console.log("=".repeat(TABLE_WIDTH));

  console.log("\n--- Contacts ---\n");
  console.log(
    renderTable(
      contactFixtures.map((c) => ({ ...c, createdAt: c.createdAt })),
      getContactColumns()
    )
  );

  console.log("\n--- Records ---\n");
  console.log(
    renderTable(
      recordFixtures.map((r) => ({ ...r, createdAt: r.createdAt })),
      getRecordColumns()
    )
  );

  console.log("\n--- Workflows ---\n");
  console.log(
    renderTable(
      workflowFixtures.map((w) => ({ ...w, createdAt: w.createdAt })),
      getWorkflowColumns()
    )
  );
}

/**
 * Main lint function
 */
function main(): void {
  console.log("Column Width Linter");
  console.log("===================\n");

  // Run linting
  lintContacts();
  lintRecords();
  lintWorkflows();

  // Report warnings
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");

  if (warns.length > 0) {
    console.log(`\n⚠️  Warnings (${warns.length}):\n`);
    for (const warn of warns) {
      console.log(`  [${warn.entity}] ${warn.field}: ${warn.message}`);
      if (warn.value) {
        console.log(`    Value: "${warn.value}"`);
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):\n`);
    for (const error of errors) {
      console.log(`  [${error.entity}] ${error.field}: ${error.message}`);
      if (error.value) {
        console.log(`    Value: "${error.value}"`);
      }
    }
  }

  // Print sample tables
  printSampleTables();

  // Summary
  console.log("\n" + "=".repeat(TABLE_WIDTH));
  console.log("SUMMARY");
  console.log("=".repeat(TABLE_WIDTH));
  console.log(`  Warnings: ${warns.length}`);
  console.log(`  Errors:   ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Lint failed with errors.\n");
    process.exit(1);
  } else if (warns.length > 0) {
    console.log("\n⚠️  Lint passed with warnings.\n");
    process.exit(0);
  } else {
    console.log("\n✅ All columns within expected widths.\n");
    process.exit(0);
  }
}

main();
