export type SessionStep =
  | 'idle'
  | 'waiting_invoice_template'
  | 'waiting_setting_template'
  | 'confirm';

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface InvoiceSession {
  step: SessionStep;
  customerName: string;
  items: InvoiceItem[];
  discount: number; // raw value or decimal percentage (e.g. 0.1 for 10%)
  discountIsPercentage: boolean;
  tax: number; // raw value or decimal percentage (e.g. 0.11 for 11%)
  taxIsPercentage: boolean;
  paid: number; // Amount paid/down payment
  lastActive: number; // Date.now() timestamp
}

export class SessionManager {
  private sessions = new Map<string, InvoiceSession>();

  /**
   * Retrieves or initializes a session for a user.
   */
  public getSession(userId: string): InvoiceSession {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.createDefaultSession();
      this.sessions.set(userId, session);
    }
    return session;
  }

  /**
   * Updates an existing session with new data.
   */
  public updateSession(userId: string, data: Partial<InvoiceSession>): void {
    const session = this.getSession(userId);
    const updated = {
      ...session,
      ...data,
      lastActive: Date.now()
    };
    this.sessions.set(userId, updated);
  }

  /**
   * Clears (resets to idle) the session for a user.
   */
  public clearSession(userId: string): void {
    this.sessions.set(userId, this.createDefaultSession());
  }

  /**
   * Checks for sessions inactive for longer than timeoutMs and resets them.
   */
  public checkInactivity(timeoutMs = 600000): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (session.step !== 'idle' && now - session.lastActive > timeoutMs) {
        console.log(`Session for user ${userId} expired due to inactivity.`);
        this.clearSession(userId);
      }
    }
  }

  private createDefaultSession(): InvoiceSession {
    return {
      step: 'idle',
      customerName: '',
      items: [],
      discount: 0,
      discountIsPercentage: false,
      tax: 0,
      taxIsPercentage: false,
      paid: 0,
      lastActive: Date.now()
    };
  }
}
