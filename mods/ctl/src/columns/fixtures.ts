/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Mock data fixtures for testing column width alignment.
 * These fixtures include edge cases to ensure columns handle realistic data.
 */

export interface ContactFixture {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredChannel: "EMAIL" | "PHONE" | "SMS" | "WHATSAPP";
  createdAt: Date;
}

export interface RecordFixture {
  id: string;
  title: string;
  status: "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";
  type:
    | "GENERIC"
    | "PURCHASE_ORDER"
    | "INVENTORY_ITEM"
    | "INVOICE"
    | "SHIPMENT"
    | "TICKET"
    | "RETURN";
  priority: "LOW" | "MEDIUM" | "HIGH" | null;
  createdAt: Date;
}

export interface WorkflowFixture {
  id: string;
  name: string;
  model: string | null;
  schedule: string | null;
  createdAt: Date;
}

/**
 * Contact fixtures with edge cases for column width testing
 */
export const contactFixtures: ContactFixture[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1-555-0100",
    preferredChannel: "EMAIL",
    createdAt: new Date("2026-01-15")
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    name: "Alexandra K.", // Abbreviated name
    email: "alex.k@enterprise.com", // Average email
    phone: "+44-207-946-095",
    preferredChannel: "WHATSAPP",
    createdAt: new Date("2026-01-10")
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    name: "Li Ming",
    email: null,
    phone: "+86-1012345678",
    preferredChannel: "SMS",
    createdAt: new Date("2025-12-20")
  },
  {
    id: "d4e5f6a7-b8c9-0123-def0-234567890123",
    name: "María García-Rodríguez",
    email: "m.garcia@company.co",
    phone: null,
    preferredChannel: "PHONE",
    createdAt: new Date("2025-11-05")
  },
  {
    id: "e5f6a7b8-c9d0-1234-ef01-345678901234",
    name: "Bob Smith",
    email: "bob.smith@company.org",
    phone: "+1-555-0199",
    preferredChannel: "EMAIL",
    createdAt: new Date("2025-10-01")
  }
];

/**
 * Record fixtures with edge cases for column width testing
 */
export const recordFixtures: RecordFixture[] = [
  {
    id: "f6a7b8c9-d0e1-2345-f012-456789012345",
    title: "Q1 Inventory Audit",
    status: "OPEN",
    type: "GENERIC",
    priority: "HIGH",
    createdAt: new Date("2026-01-20")
  },
  {
    id: "a7b8c9d0-e1f2-3456-0123-567890123456",
    title: "Purchase Order #12345 - Office Supplies Bulk Order", // Long title
    status: "BLOCKED",
    type: "PURCHASE_ORDER",
    priority: "MEDIUM",
    createdAt: new Date("2026-01-18")
  },
  {
    id: "b8c9d0e1-f2a3-4567-1234-678901234567",
    title: "Laptop - MacBook Pro 16in",
    status: "DONE",
    type: "INVENTORY_ITEM",
    priority: "LOW",
    createdAt: new Date("2026-01-15")
  },
  {
    id: "c9d0e1f2-a3b4-5678-2345-789012345678",
    title: "INV-2026-00142",
    status: "ARCHIVED",
    type: "INVOICE",
    priority: null,
    createdAt: new Date("2025-12-01")
  },
  {
    id: "d0e1f2a3-b4c5-6789-3456-890123456789",
    title: "Customer complaint regarding delayed shipment tracking", // Long title
    status: "OPEN",
    type: "TICKET",
    priority: "HIGH",
    createdAt: new Date("2026-01-22")
  },
  {
    id: "e1f2a3b4-c5d6-7890-4567-901234567890",
    title: "RMA-5544",
    status: "OPEN",
    type: "RETURN",
    priority: "MEDIUM",
    createdAt: new Date("2026-01-21")
  }
];

/**
 * Workflow fixtures with edge cases for column width testing
 */
export const workflowFixtures: WorkflowFixture[] = [
  {
    id: "f2a3b4c5-d6e7-8901-5678-012345678901",
    name: "Invoice Processing",
    model: "gpt-4o",
    schedule: "0 9 * * 1-5",
    createdAt: new Date("2026-01-01")
  },
  {
    id: "a3b4c5d6-e7f8-9012-6789-123456789012",
    name: "Customer Support Triage Automation", // Long name
    model: "claude-3-5-sonnet-20241022", // Long model name
    schedule: "*/15 * * * *",
    createdAt: new Date("2025-12-15")
  },
  {
    id: "b4c5d6e7-f8a9-0123-7890-234567890123",
    name: "Daily Inventory Sync",
    model: "gpt-4o-mini",
    schedule: "0 6 * * *",
    createdAt: new Date("2025-11-20")
  },
  {
    id: "c5d6e7f8-a9b0-1234-8901-345678901234",
    name: "PO Approval",
    model: null,
    schedule: null,
    createdAt: new Date("2025-10-10")
  },
  {
    id: "d6e7f8a9-b0c1-2345-9012-456789012345",
    name: "Shipment ETA Prediction Model Runner", // Long name
    model: "gemini-1.5-pro",
    schedule: "0 */4 * * *",
    createdAt: new Date("2026-01-05")
  }
];
