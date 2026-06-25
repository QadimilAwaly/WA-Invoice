import { SessionManager } from '../src/session.js';

function runTests() {
  const manager = new SessionManager();
  console.log("Running SessionManager tests...");

  // Test 1: Get session for a new user
  const session1 = manager.getSession("user1");
  if (session1.step !== 'idle') {
    console.error("FAIL: Expected step to be 'idle'");
    process.exit(1);
  }
  console.log("PASS: Default session created correctly");

  // Test 2: Update session
  manager.updateSession("user1", { step: 'waiting_name', customerName: 'Budi' });
  const updated1 = manager.getSession("user1");
  if (updated1.step !== 'waiting_name' || updated1.customerName !== 'Budi') {
    console.error("FAIL: Session was not updated correctly", updated1);
    process.exit(1);
  }
  console.log("PASS: Session updated correctly");

  // Test 3: Clear session
  manager.clearSession("user1");
  const cleared1 = manager.getSession("user1");
  if (cleared1.step !== 'idle' || cleared1.customerName !== '') {
    console.error("FAIL: Session was not cleared correctly", cleared1);
    process.exit(1);
  }
  console.log("PASS: Session cleared correctly");

  // Test 4: Inactivity check
  manager.updateSession("user2", { step: 'waiting_items', customerName: 'Andi' });
  // Manually backdate lastActive for user2
  const session2 = manager.getSession("user2");
  session2.lastActive = Date.now() - 700000; // > 10 mins ago (600,000 ms)

  manager.checkInactivity(600000);
  const checked2 = manager.getSession("user2");
  if (checked2.step !== 'idle' || checked2.customerName !== '') {
    console.error("FAIL: Session did not expire correctly", checked2);
    process.exit(1);
  }
  console.log("PASS: Session expired correctly on inactivity check");

  console.log("All SessionManager tests passed successfully!");
}

runTests();
