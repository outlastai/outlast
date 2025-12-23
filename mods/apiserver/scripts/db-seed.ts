// Database seed script
// Reads CSV file and creates providers and orders

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';

// Initialize logger first
const logger = getLogger({ service: 'db-seed', filePath: __filename });

// Load .env from project root
// From mods/apiserver/scripts/ -> go up 3 levels to reach project root
const rootEnvPath = resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
} else {
  // Fallback: try to find .env in current working directory or parent directories
  const cwdEnvPath = resolve(process.cwd(), '.env');
  if (existsSync(cwdEnvPath)) {
    config({ path: cwdEnvPath });
  } else {
    logger.warn('No .env file found, using environment variables or defaults');
    config();
  }
}

interface CsvRow {
  'Part Number': string;
  'Component Description': string;
  'Sub-System': string;
  'Supplier': string;
  'Supplier Country': string;
  'Ordered Date': string;
  'Confirmed Delivery Date': string;
  'Lead Time (Wks)': string;
}

function parseCsv(csvPath: string): CsvRow[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  // Simple CSV parser that handles quoted fields
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  }
  
  const headers = parseCsvLine(lines[0]);
  
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row as CsvRow);
  }
  
  return rows;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function parseLeadTime(leadTimeStr: string): number | null {
  if (!leadTimeStr || leadTimeStr.trim() === '') {
    return null;
  }
  const weeks = parseInt(leadTimeStr, 10);
  return isNaN(weeks) ? null : weeks;
}

async function seedDatabase(csvPath: string): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Require test email and SMS from environment
    const testEmail = process.env.TEST_SUPPLIER_EMAIL;
    const testSms = process.env.TEST_SUPPLIER_SMS;
    
    if (!testEmail) {
      throw new Error('TEST_SUPPLIER_EMAIL environment variable is required');
    }
    
    if (!testSms) {
      throw new Error('TEST_SUPPLIER_SMS environment variable is required');
    }

    logger.info('Starting database seed...', { csvPath });

    // Parse CSV
    const rows = parseCsv(csvPath);
    logger.info('Parsed CSV', { rowCount: rows.length });

    // Get unique suppliers
    const supplierMap = new Map<string, { name: string; country: string | null }>();
    rows.forEach(row => {
      if (row.Supplier && !supplierMap.has(row.Supplier)) {
        supplierMap.set(row.Supplier, {
          name: row.Supplier,
          country: row['Supplier Country'] || null
        });
      }
    });

    logger.info('Found unique suppliers', { count: supplierMap.size });

    // Create providers
    const providerMap = new Map<string, string>(); // supplier name -> provider id
    for (const [supplierName, supplierData] of supplierMap.entries()) {
      // Check if provider already exists
      let provider = await prisma.provider.findFirst({
        where: { name: supplierData.name }
      });

      if (!provider) {
        provider = await prisma.provider.create({
          data: {
            name: supplierData.name,
            country: supplierData.country,
            preferredChannel: 'EMAIL',
            contactInfo: JSON.stringify({
              EMAIL: testEmail!,
              SMS: testSms!
            })
          }
        });
        logger.verbose('Created provider', { 
          id: provider.id, 
          name: provider.name,
          country: provider.country 
        });
      } else {
        // Update existing provider if country is different
        if (provider.country !== supplierData.country) {
          provider = await prisma.provider.update({
            where: { id: provider.id },
            data: { country: supplierData.country }
          });
          logger.verbose('Updated provider', { 
            id: provider.id, 
            name: provider.name,
            country: provider.country 
          });
        }
      }

      providerMap.set(supplierName, provider.id);
    }

    // Create orders
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const providerId = providerMap.get(row.Supplier);
      if (!providerId) {
        logger.warn('Skipping row - provider not found', { supplier: row.Supplier });
        continue;
      }

      const orderedDate = parseDate(row['Ordered Date']);
      const expectedDeliveryDate = parseDate(row['Confirmed Delivery Date']);
      const leadTimeWeeks = parseLeadTime(row['Lead Time (Wks)']);

      try {
        const existingOrder = await prisma.order.findUnique({
          where: { orderId: row['Part Number'] }
        });

        if (existingOrder) {
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              partName: row['Part Number'],
              componentDescription: row['Component Description'] || null,
              subSystem: row['Sub-System'] || null,
              orderedDate,
              expectedDeliveryDate,
              leadTimeWeeks
            }
          });
          updatedCount++;
          logger.verbose('Updated order', { orderId: row['Part Number'] });
        } else {
          await prisma.order.create({
            data: {
              orderId: row['Part Number'],
              partName: row['Part Number'],
              componentDescription: row['Component Description'] || null,
              subSystem: row['Sub-System'] || null,
              providerId,
              status: 'PENDING',
              orderedDate,
              expectedDeliveryDate,
              leadTimeWeeks,
              priority: 'NORMAL'
            }
          });
          createdCount++;
          logger.verbose('Created order', { orderId: row['Part Number'] });
        }
      } catch (error) {
        logger.error('Failed to create/update order', { 
          orderId: row['Part Number'], 
          error 
        });
      }
    }

    logger.info('Database seed completed', { 
      providersCreated: providerMap.size,
      ordersCreated: createdCount,
      ordersUpdated: updatedCount
    });
  } catch (error) {
    logger.error('Failed to seed database', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get CSV path from command line argument or use default
// Filter out environment variable assignments (e.g., "DOTENV_CONFIG_PATH=../../.env")
const csvArg = process.argv.slice(2).find(arg => !arg.includes('=') && !arg.startsWith('DOTENV'));
const csvPath = csvArg || resolve(__dirname, '../../../seed.csv');

if (!existsSync(csvPath)) {
  logger.error('CSV file not found', { csvPath });
  console.error(`Error: CSV file not found at ${csvPath}`);
  console.error('Usage: ts-node scripts/db-seed.ts [path/to/file.csv]');
  process.exit(1);
}

seedDatabase(csvPath)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });

