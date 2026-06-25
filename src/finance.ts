import fs from 'fs';
import path from 'path';

export interface FinancialRecord {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  timestamp: number;
}

export class FinanceManager {
  private filePath = path.join('data', 'finance.json');
  private records: FinancialRecord[] = [];

  constructor() {
    this.loadRecords();
  }

  private loadRecords(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.records = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load finance records:', err);
      this.records = [];
    }
  }

  private saveRecords(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save finance records:', err);
    }
  }

  public addRecord(userId: string, type: 'income' | 'expense', amount: number, category: string, note: string): void {
    const newRecord: FinancialRecord = {
      id: `${Date.now()}-${userId}`,
      userId,
      type,
      amount,
      category,
      note,
      timestamp: Date.now()
    };
    this.records.push(newRecord);
    this.saveRecords();
  }

  public getRecords(userId: string): FinancialRecord[] {
    return this.records.filter(r => r.userId === userId);
  }

  public getMonthlySummary(userId: string): { income: number; expense: number; balance: number } {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const userRecords = this.getRecords(userId).filter(r => {
      const date = new Date(r.timestamp);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const income = userRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const expense = userRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

    return { income, expense, balance: income - expense };
  }
}
