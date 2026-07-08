const fs = require("fs");

const file = "tools/version34b-controlled-buyer-gate-final-quote-eligibility-dashboard-smoke-test.js";

if (!fs.existsSync(file)) {
  throw new Error("VERSION 34B-FIX1 BLOCKED: Version 34B smoke test file is missing.");
}

let src = fs.readFileSync(file, "utf8");

const slot1Block = `    const slot1 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(1))
    });

    const slot4 = await request("/api/controlled-buyer-gate-lead-slot/create", {`;

const fixedSlotBlock = `    const slot1 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(1))
    });

    const slot2 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(2))
    });

    const slot3 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(3))
    });

    const slot4 = await request("/api/controlled-buyer-gate-lead-slot/create", {`;

if (src.includes("const slot2 = await request(\"/api/controlled-buyer-gate-lead-slot/create\"")) {
  console.log("Version 34B-FIX1 slot prerequisite patch already present.");
} else if (src.includes(slot1Block)) {
  src = src.replace(slot1Block, fixedSlotBlock);
} else {
  throw new Error("VERSION 34B-FIX1 BLOCKED: Could not find slot1/slot4 block to patch.");
}

const oldSlotsOk = `    const slotsOk =
      slot1.status === 201 &&
      slot4.status === 201 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;`;

const newSlotsOk = `    const slotsOk =
      slot1.status === 201 &&
      slot2.status === 201 &&
      slot3.status === 201 &&
      slot4.status === 201 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;`;

if (src.includes(oldSlotsOk)) {
  src = src.replace(oldSlotsOk, newSlotsOk);
} else if (src.includes("slot2.status === 201") && src.includes("slot3.status === 201")) {
  console.log("Version 34B-FIX1 slotsOk patch already present.");
} else {
  throw new Error("VERSION 34B-FIX1 BLOCKED: Could not find slotsOk block to patch.");
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 34B-FIX1 prerequisite slot repair applied.");
