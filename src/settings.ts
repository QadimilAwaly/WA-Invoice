import fs from 'fs';
import path from 'path';

export interface UserSettings {
  shopName: string;
  shopEmail: string;
  shopAddress: string;
  shopPhone: string;
  paymentInfo: string;
  themeColor: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  shopName: "INVOICE GENERATOR BOT",
  shopEmail: "info@invoicebot.id",
  shopAddress: "Jakarta, Indonesia",
  shopPhone: "-",
  paymentInfo: "Transfer Bank Mandiri: 123-456-7890 (a/n Invoice Bot)",
  themeColor: "#1A365D"
};

export class SettingsManager {
  private filePath = path.join('data', 'settings.json');
  private settingsMap = new Map<string, UserSettings>();

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const [userId, settings] of Object.entries(data)) {
          this.settingsMap.set(userId, settings as UserSettings);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  private saveSettings(): void {
    try {
      const obj: Record<string, UserSettings> = {};
      for (const [userId, settings] of this.settingsMap.entries()) {
        obj[userId] = settings;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  public getSettings(userId: string): UserSettings {
    let settings = this.settingsMap.get(userId);
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS };
      this.settingsMap.set(userId, settings);
    }
    return settings;
  }

  public updateSettings(userId: string, data: Partial<UserSettings>): void {
    const current = this.getSettings(userId);
    const updated = {
      ...current,
      ...data
    };
    this.settingsMap.set(userId, updated);
    this.saveSettings();
  }
}
