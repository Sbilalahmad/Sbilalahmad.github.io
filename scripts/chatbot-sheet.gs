/**
 * Google Apps Script for the portfolio's robot chat.
 * Paste into Extensions → Apps Script of your Google Sheet, then
 * Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Put the /exec URL in the admin panel: Profile → "Chat robot Google Sheet URL".
 */

// Set to "" to turn off the email alert for each new message.
const NOTIFY_EMAIL = Session.getEffectiveUser().getEmail();

// Opening the /exec URL in a browser should show this text: confirms the deployment works.
function doGet() {
  return ContentService.createTextOutput("Portfolio chat endpoint is running.");
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const clip = (v, n) => String(v || "").slice(0, n);
    const row = {
      name: clip(d.name, 200),
      email: clip(d.email, 200),
      message: clip(d.message, 4000),
      asked: clip(d.asked, 1000),
      page: clip(d.page, 300),
    };
    if (!row.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      return ContentService.createTextOutput("invalid");
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Time", "Name", "Email", "Message", "Questions asked", "Page"]);
      sheet.setFrozenRows(1);
    }
    // Leading apostrophe stops a visitor's text being run as a spreadsheet formula
    const safe = (v) => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), safe(row.name), safe(row.email), safe(row.message), safe(row.asked), row.page]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: row.email,
        subject: "Portfolio chat: message from " + row.name,
        body: row.message + "\n\n— " + row.name + " (" + row.email + ")\n\nQuestions asked: " + (row.asked || "none"),
      });
    }
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}
