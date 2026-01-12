import { Command, Flags, Args } from '@oclif/core';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';

// Load .env from project root
// Try multiple possible locations
const possibleEnvPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(__dirname, '../../../../../.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  config(); // Try default locations
}

const logger = getLogger({ service: 'cli-load', filePath: __filename });

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
  
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
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

export default class Load extends Command {
  static description = 'Load data from CSV file into the database';

  static examples = [
    '$ outlast load ./seed.csv',
    '$ outlast load ./data/orders.csv --email test@example.com --sms +1234567890',
  ];

  static flags = {
    email: Flags.string({
      char: 'e',
      description: 'Test supplier email address (overrides TEST_SUPPLIER_EMAIL env var)',
      required: false,
    }),
    sms: Flags.string({
      char: 's',
      description: 'Test supplier SMS number (overrides TEST_SUPPLIER_SMS env var)',
      required: false,
    }),
    help: Flags.help({ char: 'h' }),
  };

  static args = {
    file: Args.string({
      description: 'Path to CSV file to load',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Load);
    
    const csvPath = resolve(process.cwd(), args.file);
    
    if (!existsSync(csvPath)) {
      this.error(`CSV file not found: ${csvPath}`, { exit: 1 });
    }

    const testEmail = flags.email || process.env.TEST_SUPPLIER_EMAIL;
    const testSms = flags.sms || process.env.TEST_SUPPLIER_SMS;
    
    if (!testEmail) {
      this.error('TEST_SUPPLIER_EMAIL environment variable or --email flag is required', { exit: 1 });
    }
    
    if (!testSms) {
      this.error('TEST_SUPPLIER_SMS environment variable or --sms flag is required', { exit: 1 });
    }

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./mods/apiserver/prisma/dev.db',
        },
      },
    });

    try {
      await prisma.$connect();
      this.log(`Loading data from: ${csvPath}`);

      // Parse CSV
      const rows = parseCsv(csvPath);
      this.log(`Parsed ${rows.length} rows from CSV`);

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

      this.log(`Found ${supplierMap.size} unique suppliers`);

      // Create providers
      const providerMap = new Map<string, string>();
      for (const [supplierName, supplierData] of supplierMap.entries()) {
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
          this.log(`Created provider: ${provider.name}`);
        } else {
          if (provider.country !== supplierData.country) {
            provider = await prisma.provider.update({
              where: { id: provider.id },
              data: { country: supplierData.country }
            });
            this.log(`Updated provider: ${provider.name}`);
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
          this.warn(`Skipping row - provider not found: ${row.Supplier}`);
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
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Failed to create/update order', { 
            orderId: row['Part Number'], 
            error: errorMessage 
          });
          this.warn(`Failed to create/update order: ${row['Part Number']} - ${errorMessage}`);
        }
      }

      this.log(`\nLoad completed successfully!`);
      this.log(`  Providers processed: ${supplierMap.size}`);
      this.log(`  Orders created: ${createdCount}`);
      this.log(`  Orders updated: ${updatedCount}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load data', { error: errorMessage });
      this.error(`Failed to load data: ${errorMessage}`, { exit: 1 });
    } finally {
      await prisma.$disconnect();
    }
  }
}
