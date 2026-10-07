// Generates three fictional, slightly messy insurance questionnaires into /samples.
// Run with: npm run samples
//
// Every business, person, FEIN (00- prefix, never issued), phone (555-01xx)
// and email (.example domain) here is made up for the demo.
// Each document has at least one deliberately ambiguous answer so the
// low-confidence highlighting in the review screen has something to show.
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const OUT_DIR = path.join(process.cwd(), "samples");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- small drawing helpers ----------

function newDoc(file) {
  const doc = new PDFDocument({ size: "LETTER", margin: 54 });
  doc.pipe(fs.createWriteStream(path.join(OUT_DIR, file)));
  return doc;
}

/** "Handwritten" note: blue Courier, slightly rotated. */
function scribble(doc, text, x, y, angle = -2) {
  const cursor = { x: doc.x, y: doc.y }; // a note in the margin must not move the text flow
  doc.save();
  doc.rotate(angle, { origin: [x, y] });
  doc.font("Courier-Oblique").fontSize(10).fillColor("#1d3fb8").text(text, x, y, { lineBreak: false });
  doc.restore();
  doc.fillColor("black");
  doc.x = cursor.x;
  doc.y = cursor.y;
}

function footer(doc, label) {
  const bottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0; // allow writing in the margin without adding a page
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#888888")
    .text(`SAMPLE DOCUMENT - ALL NAMES, NUMBERS AND DATA ARE FICTIONAL - ${label}`, 54, doc.page.height - 32, {
      width: doc.page.width - 108,
      align: "center",
      lineBreak: false,
    });
  doc.page.margins.bottom = bottom;
  doc.fillColor("black");
}

/**
 * Question on the left, typed (or handwritten) answer on a ruled line.
 * `was` prints an earlier typed answer crossed out in pen before the new one.
 */
function qa(doc, question, answer, { hand = false, was = null } = {}) {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333").text(question, 54, y, { width: 200 });
  const qBottom = doc.y;
  let x = 264;
  if (was) {
    doc.font("Helvetica").fontSize(10).fillColor("black");
    const w = doc.widthOfString(was);
    doc.text(was, x, y, { lineBreak: false });
    doc.moveTo(x - 2, y + 4).lineTo(x + w + 2, y + 5).lineWidth(1.2).strokeColor("#1d3fb8").stroke();
    x += w + 12;
  }
  if (hand) {
    doc.font("Courier-Oblique").fontSize(10.5).fillColor("#1d3fb8");
  } else {
    doc.font("Helvetica").fontSize(10).fillColor("black");
  }
  doc.text(answer, x, y, { width: 554 - x });
  const bottom = Math.max(qBottom, doc.y) + 3;
  doc.moveTo(264, bottom).lineTo(558, bottom).lineWidth(0.4).strokeColor("#bbbbbb").stroke();
  doc.fillColor("black");
  doc.y = bottom + 7;
}

function checkbox(doc, x, y, checked, label) {
  doc.rect(x, y, 9, 9).lineWidth(0.8).strokeColor("black").stroke();
  if (checked) {
    doc.moveTo(x + 1.5, y + 1.5).lineTo(x + 7.5, y + 7.5).moveTo(x + 7.5, y + 1.5).lineTo(x + 1.5, y + 7.5).stroke();
  }
  doc.font("Helvetica").fontSize(9).fillColor("black").text(label, x + 14, y, { lineBreak: false });
}

function sectionTitle(doc, text) {
  doc.moveDown(0.6);
  doc.rect(54, doc.y, 504, 16).fill("#e8e8e8");
  doc.fillColor("black").font("Helvetica-Bold").fontSize(9.5).text(text.toUpperCase(), 60, doc.y + 4);
  doc.y += 8;
}

/** Two-column boxed grid of label/value cells. */
function grid(doc, cells, { ink = "#0f4c5c", rule = "#9bb7bf" } = {}) {
  const colW = 252;
  for (let i = 0; i < cells.length; i += 2) {
    const y = doc.y;
    let rowH = 34;
    cells.slice(i, i + 2).forEach(([label, value], j) => {
      const x = 54 + j * colW;
      doc.font("Helvetica").fontSize(7).fillColor(ink).text(label.toUpperCase(), x + 5, y + 4, { width: colW - 10 });
      doc.font("Helvetica").fontSize(10).fillColor("black").text(value, x + 5, y + 14, { width: colW - 10 });
      rowH = Math.max(rowH, doc.y - y + 4);
    });
    cells.slice(i, i + 2).forEach((_, j) => doc.rect(54 + j * colW, y, colW, rowH).lineWidth(0.6).strokeColor(rule).stroke());
    doc.y = y + rowH;
  }
}

/** Plain paragraph across the page. */
function para(doc, text, { font = "Helvetica", size = 10, after = 0.6 } = {}) {
  doc.font(font).fontSize(size).fillColor("black").text(text, 54, doc.y, { width: 504, lineGap: 2 });
  doc.moveDown(after);
}

/** The From / To / Date block of a printed email. */
function emailHeader(doc, rows) {
  for (const [key, value] of rows) {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#444444").text(`${key}:`, 54, y, { width: 50 });
    doc.font("Helvetica").fontSize(9).fillColor("#444444").text(value, 106, y, { width: 452 });
  }
  doc.moveTo(54, doc.y + 4).lineTo(558, doc.y + 4).lineWidth(0.5).strokeColor("#cccccc").stroke();
  doc.fillColor("black");
  doc.y += 12;
}

/** Simple ruled table. `cols` are the left x of each column. */
function table(doc, cols, head, rows, { fill = "#eeeeee", rowH = 30 } = {}) {
  const edges = [...cols.slice(1), 558];
  let y = doc.y;
  doc.rect(54, y - 3, 504, 16).fill(fill);
  doc.fillColor("black").font("Helvetica-Bold").fontSize(8.5);
  head.forEach((h, i) => doc.text(h, cols[i] + 4, y, { lineBreak: false }));
  y += 20;
  doc.font("Helvetica").fontSize(8.5);
  for (const row of rows) {
    row.forEach((cell, i) => doc.text(cell, cols[i] + 4, y, { width: edges[i] - cols[i] - 8 }));
    y += rowH;
    doc.moveTo(54, y - 6).lineTo(558, y - 6).lineWidth(0.4).strokeColor("#cccccc").stroke();
  }
  doc.y = y;
}

// ---------- 1. Bakery: agency intake questionnaire, partly handwritten ----------

function bakery() {
  const doc = newDoc("sweet-crumb-bakery-questionnaire.pdf");

  doc.font("Times-Bold").fontSize(16).text("Pemberton & Vale Insurance Agency", { align: "left" });
  doc.font("Times-Roman").fontSize(11).fillColor("#555555").text("Commercial Insurance Intake Questionnaire");
  doc.fillColor("black").fontSize(8).text("Please complete and return to your agent. Attach additional pages if needed.");
  doc.moveDown(0.5);

  sectionTitle(doc, "Section A - About your business");
  qa(doc, "Legal name of business", "Sweet Crumb Bakery LLC");
  qa(doc, "Trade name / DBA (if any)", "Sweet Crumb", { hand: true });
  qa(doc, "Type of entity (LLC, corp, sole prop, etc.)", "LLC - single member");
  qa(doc, "Federal Tax ID / FEIN", "00-1234567");
  qa(doc, "When did the business start?", "Opened our doors spring 2017", { hand: true });
  qa(doc, "What kind of business is it?", "Retail bakery & small cafe");
  qa(
    doc,
    "Describe your operations",
    "Scratch bakery making bread, pastries and custom cakes. Counter service with 18 seats. " +
      "We also deliver wedding cakes within 30 miles in our own van.",
  );

  sectionTitle(doc, "Section B - Contact & location");
  qa(doc, "Primary contact (name & title)", "Marisol Okafor-Reyes, Owner / Head Baker");
  qa(doc, "Email", "marisol@sweetcrumb.example");
  qa(doc, "Phone", "(555) 014-2290", { hand: true });
  qa(doc, "Business address", "418 Larkspur Ave\nEugene, OR 97405");
  qa(doc, "How many locations?", "1 (plus a farmers market stand on Saturdays)", { hand: true });

  sectionTitle(doc, "Section C - Employees & financials");
  qa(doc, "Full-time employees", "6");
  // Deliberately ambiguous answer for the demo.
  qa(doc, "Part-time employees", "a few seasonal helpers around the holidays, 3 or 4 maybe?", { hand: true });
  qa(doc, "Annual revenue (last full year)", "$640,000");
  scribble(doc, "<- maybe closer to 700k this yr", 380, doc.y - 22, -3);
  qa(doc, "Annual payroll", "$310,000");

  footer(doc, "Sweet Crumb Bakery");
  doc.addPage();

  sectionTitle(doc, "Section D - Coverage");
  doc.font("Helvetica").fontSize(9).text("Which coverages would you like quoted?", 54, doc.y);
  let y = doc.y + 6;
  checkbox(doc, 60, y, true, "General Liability");
  checkbox(doc, 190, y, false, "Workers Compensation");
  checkbox(doc, 340, y, true, "Property");
  checkbox(doc, 440, y, false, "Commercial Auto");
  scribble(doc, "also ask about the van??", 430, y + 16, -4);
  doc.y = y + 32;
  qa(doc, "Desired effective date", "11/01/2026");
  qa(doc, "Limits requested", "$1M per occurrence / $2M aggregate");

  sectionTitle(doc, "Section E - Loss history (last 5 years)");
  qa(doc, "Any claims or losses? If yes, describe.", "Yes - one.", { hand: true });
  qa(
    doc,
    "Claim details",
    "March 2024: customer slipped on wet floor near the drink station. General liability claim, insurer paid $4,200. Closed.",
  );

  doc.moveDown(2);
  doc.font("Helvetica").fontSize(9).text("Signature: ______________________     Date: 09/22/2026", 54);
  scribble(doc, "M. Okafor-Reyes", 110, doc.y - 18, -1);

  footer(doc, "Sweet Crumb Bakery");
  doc.end();
}

// ---------- 2. Contractor: narrative letter + claims table ----------

function contractor() {
  const doc = newDoc("ironvale-builders-intake.pdf");

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#7a3b10").text("IRONVALE BUILDERS", 54, 54);
  doc.font("Helvetica").fontSize(8).fillColor("#555555").text("2290 Quarry Road, Unit B  |  Boise, ID 83709  |  (555) 014-7731");
  doc.moveTo(54, doc.y + 6).lineTo(558, doc.y + 6).lineWidth(2).strokeColor("#7a3b10").stroke();
  doc.fillColor("black").moveDown(1.5);

  const p = (text) => {
    doc.font("Times-Roman").fontSize(11).text(text, 54, doc.y, { width: 504, align: "left", lineGap: 2 });
    doc.moveDown(0.7);
  };

  doc.font("Times-Roman").fontSize(11).text("September 24, 2026");
  doc.moveDown();
  p("Hi Jordan,");
  p(
    "Thanks for the call last week. As promised, here is the info for our renewal shopping. Our current carrier " +
      "is raising rates again so we'd like to see a few quotes.",
  );
  p(
    "The company is Ironvale Builders, Inc. (it's a C-corp). Most customers know us as Ironvale Renovation, which " +
      "is the name on the trucks. Our FEIN is 00-7654321. My dad started the business in 2011, so 15 years now.",
  );
  p(
    "We are a general contractor doing residential remodels and light commercial tenant improvements. Kitchens, " +
      "baths, additions, some storefront build-outs. We sub out electrical and plumbing. No roofing, no work " +
      "above three stories.",
  );
  p(
    "Headcount: 14 full-time (crew + office) and 3 part-time (two estimators and our bookkeeper). Payroll last " +
      "year was about $1,120,000 and revenue was $4.8 million. We have 2 locations: the office on Quarry Road and " +
      "an equipment yard on Fenwick St.",
  );
  p(
    "We need general liability, workers comp and commercial auto (5 pickups, 1 box truck). We'd like " +
      "$1M/$2M on the GL. Timing-wise, sometime early next spring, ideally before the Hollis St job kicks off in April.",
  );
  p("You can reach me directly at tbrennan@ironvale.example or my cell (555) 014-7790.");
  p("Thanks,");
  doc.font("Times-Italic").fontSize(11).text("Tomasz Brennan");
  doc.font("Times-Roman").text("Operations Manager, Ironvale Builders, Inc.");

  footer(doc, "Ironvale Builders");
  doc.addPage();

  doc.font("Helvetica-Bold").fontSize(12).text("Attachment A - Loss runs (summary, typed from carrier letters)", 54, 54);
  doc.moveDown();
  const cols = [54, 140, 250, 340];
  const head = ["Date", "Line", "Paid", "What happened"];
  let y = doc.y;
  doc.rect(54, y - 3, 504, 16).fill("#f1e4da");
  doc.fillColor("black").font("Helvetica-Bold").fontSize(9);
  head.forEach((h, i) => doc.text(h, cols[i] + 4, y, { lineBreak: false }));
  y += 20;
  const rows = [
    ["08/14/2022", "Workers comp", "$18,750", "Carpenter cut hand on table saw, 6 weeks off work."],
    ["2/3/24", "Auto", "$6,300", "Box truck backed into customer's fence while unloading."],
  ];
  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    row.forEach((cell, i) => doc.text(cell, cols[i] + 4, y, { width: i === 3 ? 210 : 82 }));
    y += 30;
    doc.moveTo(54, y - 6).lineTo(558, y - 6).lineWidth(0.4).strokeColor("#cccccc").stroke();
  }
  scribble(doc, "no other claims since 2021 - TB", 340, y + 10, -2);

  footer(doc, "Ironvale Builders");
  doc.end();
}

// ---------- 3. Dental clinic: boxed two-column application form ----------

function dental() {
  const doc = newDoc("brightside-dental-application.pdf");

  doc.rect(54, 54, 504, 44).fill("#0f4c5c");
  doc.fillColor("white").font("Helvetica-Bold").fontSize(15).text("Brightside Family Dental, PLLC", 66, 64);
  doc.font("Helvetica").fontSize(9).text("Business Insurance Application - prepared for agent review", 66, 82);
  doc.fillColor("black");
  doc.y = 112;

  grid(doc, [
    ["Applicant legal name", "Brightside Family Dental, PLLC"],
    ["DBA", "Brightside Dental"],
    ["Entity type", "Professional LLC"],
    ["FEIN", "00-5550199"],
    ["Years in business", "8"],
    ["Industry / NAICS description", "Offices of dentists (general & pediatric dentistry)"],
    ["Contact name", "Dr. Priya Ramaswamy-Lund"],
    ["Contact title", "Managing Dentist / Owner"],
    ["Contact email", "priya@brightsidedental.example"],
    ["Contact phone", "(555) 014-3318"],
  ]);
  // Messy correction scribbled next to the phone number.
  scribble(doc, "new # -> (555) 014-3390 ?", 420, doc.y - 18, -3);
  grid(doc, [
    ["Mailing address", "77 Harbor View Blvd, Suite 210, Portland, ME 04101"],
    ["Number of locations", "2"],
    ["Full-time employees", "11"],
    ["Part-time employees", "4"],
    // Deliberately ambiguous answer for the demo.
    ["Annual revenue", "$1.2M - $1.5M (depends if 2nd office counted)"],
    ["Annual payroll", "$780,000"],
  ]);

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f4c5c").text("OPERATIONS", 54);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("black")
    .text(
      "General and pediatric dentistry. 9 operatories across two offices. Digital x-ray on site, nitrous oxide " +
        "sedation only (no general anesthesia). Second office (Westbrook) opened March 2026.",
      54,
      doc.y + 2,
      { width: 504 },
    );

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f4c5c").text("COVERAGE REQUESTED", 54);
  const y = doc.y + 6;
  checkbox(doc, 54, y, true, "General Liability");
  checkbox(doc, 174, y, true, "Workers Comp");
  checkbox(doc, 284, y, true, "Property (equipment & build-out)");
  checkbox(doc, 454, y, false, "Auto");
  doc.y = y + 20;
  grid(doc, [
    ["Requested effective date", "01/15/2027"],
    ["Limits", "$1,000,000 / $3,000,000"],
  ]);

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f4c5c").text("LOSS HISTORY - PAST 5 YEARS", 54);
  doc.font("Helvetica").fontSize(10).fillColor("black").text("No claims in the last 5 years.", 54, doc.y + 2);

  footer(doc, "Brightside Family Dental");
  doc.end();
}

// ---------- 4. Landscaper: printed email thread with a correction on top ----------
// Tricky: revenue corrected in a later email, two possible contacts, a relative
// effective date ("when the current policy ends 3/31"), seasonal part-timers,
// three claims (more rows than most portals show).

function landscaper() {
  const doc = newDoc("greenline-landscaping-email-thread.pdf");

  doc.font("Helvetica").fontSize(7.5).fillColor("#888888").text("Webmail - Printed Fri Oct 2, 2026 9:05 AM", 54, 36, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(14).fillColor("black").text("Re: insurance renewal info - Greenline", 54, 60);
  doc.font("Helvetica").fontSize(8).fillColor("#888888").text("3 messages", 54, doc.y + 2);
  doc.moveDown(1.2);

  emailHeader(doc, [
    ["From", "Mike Whitcomb <mike@greenlinelandscape.example>"],
    ["To", "Jordan Ellis <jordan@pembertonvale.example>"],
    ["Cc", "Dana Whitcomb <dana@greenlinelandscape.example>"],
    ["Date", "Fri, Oct 2, 2026, 7:48 AM"],
  ]);
  para(
    doc,
    "Jordan - one thing in Dana's email. The $1.94M revenue is everything including snow removal. Landscaping alone " +
      "was more like $1.6M if that matters for the quote.\n\nYou can put me down as a contact too, my cell is (555) 016-4471.\n\nMike",
  );
  doc.moveDown(0.6);

  emailHeader(doc, [
    ["From", "Dana Whitcomb <dana@greenlinelandscape.example>"],
    ["To", "Jordan Ellis <jordan@pembertonvale.example>"],
    ["Date", "Thu, Oct 1, 2026, 4:12 PM"],
  ]);
  para(doc, "Hi Jordan, sorry for the delay, fall cleanups have us slammed. Answers to your list:");
  para(
    doc,
    "1. Legal name is Greenline Landscape & Snow Co. but everybody knows us as Greenline Landscaping.\n" +
      "2. We're a general partnership (Mike and his brother Kevin). FEIN 00-3141592.\n" +
      "3. Started in 2014 when we bought the old Hartley Lawn route.\n" +
      "4. 1180 Orchard Lane, Fort Collins, CO 80524. We also rent an equipment yard on Timberline Rd.\n" +
      "5. Residential + commercial lawn maintenance, landscape installs (patios, retaining walls under 4 ft) and " +
      "snow plowing for about 30 commercial lots in winter. No tree work over 20 ft.\n" +
      "6. 9 full-time year round. In summer we add 10-12 seasonal guys, on payroll roughly April to October.\n" +
      "7. Revenue last year was $1,940,000. Payroll $862,000 including the seasonals.\n" +
      "8. We need general liability, workers comp and auto (6 trucks, 4 trailers). Mike also wants a price on a " +
      "$1M umbrella if it's not crazy.\n" +
      "9. GL limits same as now, $1M per occurrence / $2M aggregate.\n" +
      "10. Our current policy ends 3/31 so the new one should start then.",
    { after: 0.8 },
  );
  para(doc, "Claims in the last 5 years (from my notes):", { font: "Helvetica-Bold" });
  para(
    doc,
    "- July 2023: crew member hurt his back lifting pavers. Workers comp paid $9,400.\n" +
      "- Nov 2024: one of our trucks rear-ended a car at a light. Auto claim, paid $3,150.\n" +
      "- June 2025: mower threw a rock through a client's sliding door. GL paid $1,280.",
  );
  para(doc, "Thanks!\nDana Whitcomb\nOffice Manager, Greenline Landscaping\n(555) 016-4400");
  footer(doc, "Greenline Landscaping");

  doc.addPage();
  emailHeader(doc, [
    ["From", "Jordan Ellis <jordan@pembertonvale.example>"],
    ["To", "Dana Whitcomb <dana@greenlinelandscape.example>"],
    ["Date", "Mon, Sep 21, 2026, 10:30 AM"],
  ]);
  para(
    doc,
    "Hi Dana, great talking today. To shop your renewal I need: legal name, entity type and FEIN, how long you've " +
      "been in business, address, what you do, employees (full and part time), revenue and payroll, which " +
      "coverages, limits, when you want it to start, and any claims in the last 5 years.\n\nThanks,\nJordan Ellis\n" +
      "Pemberton & Vale Insurance Agency",
  );
  footer(doc, "Greenline Landscaping");
  doc.end();
}

// ---------- 5. IT firm: typed broker submission summary + call notes ----------
// Tricky: two different limits (E&O vs GL), remote staff across states vs one office,
// a "cyber incident" that is not a paid claim, workers comp excluded (via a PEO).

function itFirm() {
  const doc = newDoc("copperleaf-it-submission-summary.pdf");

  doc.font("Times-Bold").fontSize(16).text("Pemberton & Vale Insurance Agency", 54, 54);
  doc.font("Times-Roman").fontSize(11).fillColor("#555555").text("New Business Submission - Summary Sheet");
  doc.fillColor("black").fontSize(8).text("Prepared by J. Ellis from client call and financials, 09/28/2026. Internal use.");
  doc.moveDown(0.8);

  grid(
    doc,
    [
      ["Named insured", "Copperleaf IT Solutions, Inc."],
      ["DBA", "None"],
      ["Entity", "S corporation"],
      ["FEIN", "00-8675309"],
      ["Established", "2016"],
      ["Class of business", "IT managed services & cybersecurity consulting"],
      ["Contact", "Anjali Mehta-Castillo, Chief Operating Officer"],
      ["Contact email / phone", "anjali@copperleafit.example\n(555) 013-8820"],
      ["Mailing address", "2201 Western Ave, Suite 400\nSeattle, WA 98121"],
      ["Locations", "1 office (see note on remote staff)"],
      ["Full-time employees", "22"],
      ["Part-time employees", "2"],
      ["Revenue (FY2025)", "$5,600,000"],
      ["Payroll (FY2025)", "$2,940,000"],
    ],
    { ink: "#3b3b3b", rule: "#bdbdbd" },
  );

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(9).text("COVERAGE REQUESTED", 54);
  const y = doc.y + 6;
  checkbox(doc, 54, y, true, "General Liability");
  checkbox(doc, 174, y, false, "Workers Comp");
  checkbox(doc, 284, y, false, "Property");
  checkbox(doc, 364, y, true, "Tech E&O / Professional");
  checkbox(doc, 494, y, true, "Cyber");
  doc.y = y + 22;
  grid(
    doc,
    [
      ["Proposed effective date", "01/01/2027"],
      ["Limits", "E&O / Cyber: $2M each claim / $4M agg\nGL: $1M / $2M"],
    ],
    { ink: "#3b3b3b", rule: "#bdbdbd" },
  );
  scribble(doc, "WC is through their PEO - do not quote", 300, doc.y + 8, -2);
  footer(doc, "Copperleaf IT Solutions");

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(12).text("Call notes - 09/24/2026 (Anjali M-C)", 54, 54);
  doc.moveDown(0.8);
  para(
    doc,
    "- ~140 small-business clients, mostly medical and law offices. Managed IT, network admin, M365/cloud migrations, " +
      "security assessments. No software sold as a product.\n" +
      "- Team: office in Seattle, but 9 of the 22 FT staff work remote from OR, ID and CA.\n" +
      "- Revenue split roughly 70% recurring managed services, 30% projects.\n" +
      "- Contracts require them to carry $2M E&O; some clients asking for cyber too.\n" +
      "- Loss history: no claims filed in 5 years. In March 2024 a staff member fell for a phishing email; " +
      "contained same day, no client data lost, no claim made and nothing paid. Anjali wanted it disclosed anyway.\n" +
      "- Current carrier non-renewing E&O (exiting tech class). Wants quotes by mid-November.",
    { size: 10.5 },
  );
  footer(doc, "Copperleaf IT Solutions");
  doc.end();
}

// ---------- 6. Auto repair: faxed, mostly handwritten questionnaire ----------
// Tricky: sole proprietor (legal name is the owner's name, no FEIN), a crossed-out
// revenue figure, "ASAP" as the start date, "whatever is normal" for limits,
// a claim with an unclear second payment.

function autoRepair() {
  const doc = newDoc("tio-rafas-auto-repair-fax.pdf");

  doc.font("Courier").fontSize(7.5).fillColor("#555555").text("OCT-02-2026 09:14   FROM: (555) 012-7300   TO: 15550147700   P.1/2", 54, 30, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(15).fillColor("black").text("Lone Star Main Street Insurance", 54, 54);
  doc.font("Helvetica").fontSize(10).fillColor("#555555").text("Small Business Insurance Questionnaire  -  please print clearly");
  doc.fillColor("black");
  doc.moveDown(0.4);

  sectionTitle(doc, "1. Business");
  qa(doc, "Legal name of business / owner", "Rafael A. Dominguez", { hand: true });
  qa(doc, "Business name customers see (DBA)", "Tio Rafa's Auto Repair", { hand: true });
  qa(doc, "Type of business entity", "just me - sole owner", { hand: true });
  qa(doc, "FEIN", "don't have one, use my SSN", { hand: true });
  qa(doc, "Year business started", "2009", { hand: true });
  qa(doc, "What does the business do?", "general auto repair - brakes, engines, AC, state inspections. NO body/paint. NO towing.", { hand: true });

  sectionTitle(doc, "2. Contact & location");
  qa(doc, "Contact name & title", "Rafa Dominguez - owner", { hand: true });
  qa(doc, "Phone", "(555) 012-7300 shop / (555) 012-7311 cell", { hand: true });
  qa(doc, "Email", "rafa.autorepair@mailbox.example", { hand: true });
  qa(doc, "Street address", "3415 S. Zarzamora St", { hand: true });
  qa(doc, "City / State / ZIP", "San Antonio TX 78207", { hand: true });
  qa(doc, "Number of locations", "1", { hand: true });

  sectionTitle(doc, "3. Employees & money");
  qa(doc, "Full-time employees", "4 mechanics", { hand: true });
  qa(doc, "Part-time employees", "1 (my nephew, Saturdays)", { hand: true });
  qa(doc, "Gross sales last year", "$520K (2025)", { hand: true, was: "$480,000" });
  qa(doc, "Total payroll last year", "$198,000", { hand: true });
  footer(doc, "Tio Rafa's Auto Repair");

  doc.addPage();
  doc.font("Courier").fontSize(7.5).fillColor("#555555").text("OCT-02-2026 09:15   FROM: (555) 012-7300   TO: 15550147700   P.2/2", 54, 30, { lineBreak: false });
  doc.fillColor("black");
  doc.y = 54;
  sectionTitle(doc, "4. Coverage");
  doc.font("Helvetica").fontSize(9).text("Check what you want quoted:", 54, doc.y);
  const y = doc.y + 6;
  checkbox(doc, 60, y, true, "General Liability");
  checkbox(doc, 190, y, false, "Workers Comp");
  checkbox(doc, 310, y, true, "Building / Property");
  checkbox(doc, 450, y, false, "Commercial Auto");
  scribble(doc, "+ garagekeepers!! (customer cars)", 300, y + 22, -1.5);
  doc.y = y + 42;
  qa(doc, "When should coverage start?", "ASAP - old policy cancelled 9/30", { hand: true });
  qa(doc, "Limits wanted", "whatever is normal for a shop", { hand: true });

  sectionTitle(doc, "5. Claims (last 5 years)");
  qa(doc, "Any claims? Describe each.", "Hail storm May 2023 - roof damage. Insurance paid $12,800 on the building. 2 customer cars also hit, I think they paid like $4k on those separate?", { hand: true });

  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(9).text("Signature: ______________________     Date: ____________", 54);
  scribble(doc, "R. Dominguez        10/1/26", 110, doc.y - 18, -1);
  footer(doc, "Tio Rafa's Auto Repair");
  doc.end();
}

// ---------- 7. Daycare: nonprofit application + prior carrier loss run ----------
// Tricky: nonprofit corporation, workers comp handled by the state fund (Ohio),
// an open claim with both "paid" and "reserve" amounts, extra coverages that no
// standard checkbox covers (abuse & molestation, D&O).

function daycare() {
  const doc = newDoc("little-acorns-daycare-application.pdf");

  doc.rect(54, 54, 504, 44).fill("#5b3a1e");
  doc.fillColor("white").font("Helvetica-Bold").fontSize(15).text("Little Acorns Learning Center, Inc.", 66, 64);
  doc.font("Helvetica").fontSize(9).text("Application for Commercial Insurance  |  Child Care Programs", 66, 82);
  doc.fillColor("black");
  doc.y = 112;

  const theme = { ink: "#5b3a1e", rule: "#c9b29b" };
  grid(
    doc,
    [
      ["Applicant", "Little Acorns Learning Center, Inc."],
      ["Organization type", "Ohio nonprofit corporation, 501(c)(3)"],
      ["FEIN", "00-2468013"],
      ["Year founded", "2003"],
      ["Operations", "Licensed child care center, ages 6 weeks - 5 years (96 children). Second site runs a before/after-school program."],
      ["Transportation", "None. Walking field trips only."],
      ["Executive Director", "Gwendolyn Osei"],
      ["Email / phone", "gosei@littleacorns.example\n(555) 015-2207"],
      ["Main address", "640 Linden Ave, Columbus, OH 43211"],
      ["Sites", "2 (Linden Ave; Morse Rd school-age site)"],
      ["Staff - full-time", "18"],
      ["Staff - part-time", "7"],
      ["Annual revenue", "$2,300,000 (tuition $1.9M + grants)"],
      ["Annual payroll", "$1,410,000"],
    ],
    theme,
  );

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#5b3a1e").text("COVERAGE REQUESTED", 54);
  const y = doc.y + 6;
  checkbox(doc, 54, y, true, "General Liability");
  checkbox(doc, 174, y, true, "Property");
  checkbox(doc, 254, y, false, "Workers Comp*");
  checkbox(doc, 354, y, false, "Auto");
  checkbox(doc, 414, y, true, "Abuse & Molestation");
  checkbox(doc, 54, y + 16, true, "Directors & Officers");
  doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#555555").text("*Workers comp is through Ohio BWC (state fund).", 174, y + 17);
  doc.fillColor("black");
  doc.y = y + 38;
  grid(
    doc,
    [
      ["Requested effective date", "12/01/2026"],
      ["Limits", "$1,000,000 each occurrence / $3,000,000 aggregate"],
    ],
    theme,
  );
  footer(doc, "Little Acorns Learning Center");

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(12).text("Attachment: Loss Run - Prior Carrier (valued 09/15/2026)", 54, 54);
  doc.font("Helvetica").fontSize(8.5).fillColor("#555555").text("Policy period 12/01/2021 - 12/01/2026. Amounts in USD.");
  doc.fillColor("black").moveDown(1);
  table(
    doc,
    [54, 120, 190, 380, 440, 500],
    ["Loss date", "Line", "Description", "Paid", "Reserve", "Status"],
    [
      ["02/09/2022", "Property", "Frozen pipe burst in infant room, water damage to floors and drywall.", "$14,950", "$0", "Closed"],
      ["04/18/2025", "Gen. Liability", "Child fell from playground climber, fractured wrist. Parent claim for medical costs.", "$6,200", "$25,000", "Open"],
    ],
    { fill: "#efe4d8", rowH: 40 },
  );
  scribble(doc, "playground surfacing replaced 6/2025 - G.O.", 300, doc.y + 6, -2);
  footer(doc, "Little Acorns Learning Center");
  doc.end();
}

bakery();
contractor();
dental();
landscaper();
itFirm();
autoRepair();
daycare();
console.log(`Wrote 7 sample PDFs to ${OUT_DIR}`);
