import { FinanceManager } from '../src/finance.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const dataDir = 'data';
  const filePath = path.join(dataDir, 'finance.json');
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const manager = new FinanceManager();
  const userId = "user-test-finance";

  console.log("Running FinanceManager tests...");

  // Add records
  manager.addRecord(userId, 'income', 1000000, 'Gaji', 'Gaji Juni');
  await new Promise(r => setTimeout(r, 10));
  manager.addRecord(userId, 'expense', 500000, 'Makan', 'Makan siang');

  const records = manager.getRecords(userId);
  if (records.length !== 2) {
    console.error("FAIL: Expected 2 records, got", records.length);
    process.exit(1);
  }
  console.log("PASS: Records added successfully");

  const summary = manager.getMonthlySummary(userId);
  if (summary.income !== 1000000 || summary.expense !== 500000 || summary.balance !== 500000) {
    console.error("FAIL: Summary incorrect", summary);
    process.exit(1);
  }
  console.log("PASS: Monthly summary verified");

  console.log("All FinanceManager tests passed!");
}

runTests();
