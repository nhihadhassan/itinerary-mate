import fs from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const sourcePath = new URL("../src/portugalActualTrip.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dataUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { portugalActualTrip } = await import(dataUrl);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const { expenses, visits } = portugalActualTrip;
const cadTotal = roundMoney(expenses.filter((item) => item.currency === "CAD").reduce((sum, item) => sum + item.amount, 0));
const eurTotal = roundMoney(expenses.filter((item) => item.currency === "EUR").reduce((sum, item) => sum + item.amount, 0));
const reconciled = roundMoney(cadTotal + eurTotal * portugalActualTrip.eurToCad);

assert(expenses.length === 103, `Expected 103 expenses, found ${expenses.length}`);
assert(cadTotal === 3610.77, `Expected CAD 3610.77, found ${cadTotal}`);
assert(eurTotal === 587.24, `Expected EUR 587.24, found ${eurTotal}`);
assert(reconciled === 4563.76, `Expected reconciled CAD 4563.76, found ${reconciled}`);
assert(portugalActualTrip.sourceTotalCad === 4563.76, "Source total changed");
assert(new Set(expenses.map((item) => item.id)).size === expenses.length, "Expense IDs must be unique");
assert(new Set(visits.map((item) => item.id)).size === visits.length, "Visit IDs must be unique");

const allowedCategories = new Set(["flight", "lodging", "food", "drinks", "groceries", "activity", "sightseeing", "transport", "shopping", "other"]);
const allowedStatuses = new Set(["visited", "unconfirmed", "skipped"]);
const allowedEvidence = new Set(["expense", "dated-itinerary", "manual"]);
for (const expense of expenses) {
  assert(expense.date >= "2026-06-08" && expense.date <= "2026-06-24", `Expense date outside trip: ${expense.id}`);
  assert(allowedCategories.has(expense.category), `Unknown category: ${expense.category}`);
}
for (const visit of visits) {
  assert(visit.date >= "2026-06-08" && visit.date <= "2026-06-24", `Visit date outside trip: ${visit.id}`);
  assert(allowedStatuses.has(visit.status), `Unknown visit status: ${visit.status}`);
  assert(allowedEvidence.has(visit.evidence), `Unknown visit evidence: ${visit.evidence}`);
}

for (const merchant of ["Air Transat 480", "Air Transat 7463", "Douro Valley Tour", "Tv. da Lomba 34"]) {
  assert(expenses.filter((item) => item.merchant === merchant).length === 1, `Prepaid item duplicated: ${merchant}`);
}

const repoRoot = new URL("..", import.meta.url);
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" }).split("\0").filter(Boolean);
const sensitivePattern = /YPTTO3|AO742L|4537\s+XXXX|HMXT4PHSFQ|312889577786814/;
for (const path of tracked) {
  const value = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert(!sensitivePattern.test(value), `Sensitive booking or account reference found in ${path}`);
}

console.log(`Portugal actual-trip validation passed: ${expenses.length} expenses, ${visits.length} visits, CA$${reconciled.toFixed(2)} reconciled.`);
