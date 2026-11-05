import { readFileSync } from "fs";
import mongoose from "mongoose";

const envLines = readFileSync(".env", "utf8").split("\n");
const env = {};
for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}
const URI = env.MONGODB_URI;
if (!URI) { console.error("No MONGODB_URI"); process.exit(1); }

const Schema = mongoose.Schema;
const regSchema = new Schema({}, { strict: false, collection: "championship_registrations" });
const sessionSchema = new Schema({}, { strict: false, collection: "championship_exam_sessions" });
const Reg = mongoose.model("Reg", regSchema);
const Sess = mongoose.model("Sess", sessionSchema);

console.log("\n Connecting to MongoDB...\n");
try {
    await mongoose.connect('mongodb://hussainmanirul9_db_user:AsDVHjQ76on2wmXy@atlas-sql-6a4d2d184e6d459dda37963f-gckgw3.a.query.mongodb.net/maa_park?ssl=true&authSource=admin', { serverSelectionTimeoutMS: 15000 });
    console.log(" Connected!\n");
} catch(e) { console.error(" Failed:", e.message); process.exit(1); }

const allRegs = await Reg.find({}).lean();
const allSess = await Sess.find({}).lean();

console.log("Total Registrations : " + allRegs.length);
console.log("Total Sessions      : " + allSess.length + "\n");

const regMap = {};
for (const r of allRegs) {
    if (r.rollNumber) regMap[r.rollNumber.toUpperCase()] = r;
}

const results = [];
for (const s of allSess) {
    const roll = (s.rollNumber || "").toUpperCase();
    const reg = regMap[roll] || {};
    const totalAns = s.answers ? Object.keys(s.answers).length : 0;
    const correct = s.correctCount ?? 0;
    const incorrect = s.incorrectCount ?? (totalAns - correct);
    const unattempted = 60 - totalAns;
    const score = s.score ?? Number(Math.max(0, (correct - incorrect * 0.25)).toFixed(2));
    const tabSw = s.tabSwitchCount ?? 0;
    const disq = tabSw >= 3;
    const tSec = typeof s.timeSpent === "number" ? s.timeSpent : 0;
    const timeStr = tSec ? (Math.floor(tSec/60) + "m " + (tSec%60) + "s") : "--";
    const subTime = s.submittedAt ? new Date(s.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : (s.updatedAt ? new Date(s.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "--");
    results.push({ roll, name: reg.name || "Unknown", college: (reg.college || "").slice(0,30), state: reg.state || "--", score, correct, incorrect, unattempted, tabSw, disq, auto: s.autoSubmitted ? "AUTO" : "MANUAL", timeStr, subTime });
}

results.sort((a, b) => b.score - a.score);
let rank = 1;
for (const r of results) { r.rank = r.disq ? "DQ" : rank++; }

const LINE = "=".repeat(120);
console.log(LINE);
console.log("  CHAMPIONSHIP 2026 — EXAM RESULTS");
console.log(LINE);
const valid = results.filter(r => !r.disq);
const dq = results.filter(r => r.disq);
const subRolls = new Set(results.map(r => r.roll));
const absentPaid = allRegs.filter(r => r.rollNumber && r.status === "paid" && !subRolls.has(r.rollNumber.toUpperCase()));
console.log("  Valid     : " + valid.length);
console.log("  Disq      : " + dq.length);
console.log("  Submitted : " + results.length);
console.log("  Absent    : " + absentPaid.length + " (paid but no exam session)");
console.log(LINE);
console.log("RANK  ROLL_NUMBER            NAME                         SCORE   OK  WR  NA  TAB  STATUS          MODE    TIME");
console.log("-".repeat(120));
for (const r of results) {
    const st = r.disq ? "DISQUALIFIED" : "VALID";
    console.log(
        String(r.rank).padEnd(6) +
        r.roll.padEnd(23) +
        r.name.slice(0,28).padEnd(29) +
        String(r.score).padEnd(8) +
        String(r.correct).padEnd(4) +
        String(r.incorrect).padEnd(4) +
        String(r.unattempted).padEnd(4) +
        String(r.tabSw).padEnd(5) +
        st.padEnd(16) +
        r.auto.padEnd(8) +
        r.timeStr
    );
}
console.log("-".repeat(120));

if (absentPaid.length > 0) {
    console.log("\n  ABSENT CANDIDATES (Paid but did not appear):");
    for (const r of absentPaid) {
        console.log("  " + (r.rollNumber||"").padEnd(22) + " " + (r.name||"").padEnd(30) + " " + (r.whatsapp||""));
    }
}

await mongoose.disconnect();
console.log("\n Done.\n");

