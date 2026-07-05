const dataStore = require("./data-store");

const allowedStockStatus = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "confirm_before_quote"
];

const allowedCondition = [
  "new",
  "used",
  "tokunbo",
  "refurbished",
  "unknown"
];

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSafeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
}

function validateInventoryItem(input) {
  const errors = [];

  const partName = cleanText(input.partName);
  const partCategory = cleanText(input.partCategory);
  const vehicleBrand = cleanText(input.vehicleBrand);
  const vehicleModel = cleanText(input.vehicleModel);
  const vehicleYear = cleanText(input.vehicleYear);
  const stockStatus = cleanText(input.stockStatus || "confirm_before_quote");
  const condition = cleanText(input.condition || "unknown");
  const shopLocation = cleanText(input.shopLocation || input.location);
  const quantity = toSafeNumber(input.quantity, 0);

  if (!partName) errors.push("partName is required.");
  if (!partCategory) errors.push("partCategory is required.");
  if (!vehicleBrand) errors.push("vehicleBrand is required.");
  if (!vehicleModel) errors.push("vehicleModel is required.");
  if (!shopLocation) errors.push("shopLocation is required.");

  if (vehicleYear && !/^\d{4}$/.test(vehicleYear)) {
    errors.push("vehicleYear must be a 4-digit year when provided.");
  }

  if (!allowedStockStatus.includes(stockStatus)) {
    errors.push(`stockStatus is not approved: ${stockStatus}`);
  }

  if (!allowedCondition.includes(condition)) {
    errors.push(`condition is not approved: ${condition}`);
  }

  if (quantity < 0) {
    errors.push("quantity cannot be negative.");
  }

  if (cleanText(input.priceRange).length > 80) errors.push("priceRange is too long.");
  if (cleanText(input.compatibilityNotes).length > 500) errors.push("compatibilityNotes is too long.");

  return errors;
}

function createInventoryItem(input) {
  const stockStatus = cleanText(input.stockStatus || "confirm_before_quote");
  const condition = cleanText(input.condition || "unknown");
  const quantity = toSafeNumber(input.quantity, 0);

  const item = {
    id: dataStore.createId("inv"),
    partName: cleanText(input.partName),
    partCategory: cleanText(input.partCategory),
    vehicleBrand: cleanText(input.vehicleBrand),
    vehicleModel: cleanText(input.vehicleModel),
    vehicleYear: cleanText(input.vehicleYear),
    engineCode: cleanText(input.engineCode),
    condition,
    stockStatus,
    quantity,
    priceRange: cleanText(input.priceRange),
    shopLocation: cleanText(input.shopLocation || input.location),
    supplierName: cleanText(input.supplierName),
    compatibilityNotes: cleanText(input.compatibilityNotes),
    imageStatus: cleanText(input.imageStatus || "not_uploaded"),
    quoteReady: false,
    stockConfirmedForQuote: false,
    compatibilityConfirmed: false,
    manualReviewRequired: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const inventory = dataStore.readCollection("inventory");
  inventory.unshift(item);
  dataStore.writeCollection("inventory", inventory);

  return item;
}

function listInventory() {
  return dataStore.readCollection("inventory");
}

function getInventorySummary() {
  const inventory = listInventory();

  const summary = {
    totalItems: inventory.length,
    inStockItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    confirmBeforeQuoteItems: 0,
    manualReviewRequired: 0,
    quoteReadyItems: 0,
    byCategory: {},
    byBrand: {}
  };

  for (const item of inventory) {
    if (item.stockStatus === "in_stock") summary.inStockItems += 1;
    else if (item.stockStatus === "low_stock") summary.lowStockItems += 1;
    else if (item.stockStatus === "out_of_stock") summary.outOfStockItems += 1;
    else summary.confirmBeforeQuoteItems += 1;

    if (item.manualReviewRequired === true) summary.manualReviewRequired += 1;
    if (item.quoteReady === true) summary.quoteReadyItems += 1;

    const category = item.partCategory || "unknown";
    const brand = item.vehicleBrand || "unknown";

    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    summary.byBrand[brand] = (summary.byBrand[brand] || 0) + 1;
  }

  return summary;
}

module.exports = {
  allowedStockStatus,
  allowedCondition,
  validateInventoryItem,
  createInventoryItem,
  listInventory,
  getInventorySummary
};
