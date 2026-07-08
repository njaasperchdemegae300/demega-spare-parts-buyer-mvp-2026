const healthController = require("../controllers/health.controller");
const projectStatusController = require("../controllers/project.controller");
const storageStatusController = require("../controllers/storage.controller");
const buyerIntakeController = require("../controllers/buyer-intake.controller");
const dashboardController = require("../controllers/dashboard.controller");
const scoringController = require("../controllers/scoring.controller");
const inventoryController = require("../controllers/inventory.controller");
const inventoryMatchingController = require("../controllers/inventory-matching.controller");
const quoteDraftController = require("../controllers/quote-draft.controller");
const buyerPipelineController = require("../controllers/buyer-pipeline.controller");
const followUpController = require("../controllers/followup.controller");
const adminNavigationController = require("../controllers/admin-navigation.controller");
const actionQueueController = require("../controllers/action-queue.controller");
const hotBuyerController = require("../controllers/hot-buyer.controller");
const whatsappManualController = require("../controllers/whatsapp-manual.controller");
const stockConfirmationController = require("../controllers/stock-confirmation.controller");
const compatibilityConfirmationController = require("../controllers/compatibility-confirmation.controller");
const quoteEligibilityController = require("../controllers/quote-eligibility.controller");
const manualQuoteDraftController = require("../controllers/manual-quote-draft.controller");
const manualQuoteCopyController = require("../controllers/manual-quote-copy.controller");
const manualQuoteSentConfirmationController = require("../controllers/manual-quote-sent-confirmation.controller");
const buyerReplyController = require("../controllers/buyer-reply.controller");
const buyerReplyFollowupActionController = require("../controllers/buyer-reply-followup-action.controller");
const manualDealOutcomeController = require("../controllers/manual-deal-outcome.controller");
const manualStockMovementReviewController = require("../controllers/manual-stock-movement-review.controller");
const manualAccountingReviewController = require("../controllers/manual-accounting-review.controller");
const manualFinalBusinessReviewController = require("../controllers/manual-final-business-review.controller");
const projectSourceOfTruthController = require("../controllers/project-source-of-truth.controller");
const assistantSalesAgentTestLabController = require("../controllers/assistant-sales-agent-test-lab.controller");
const internalBuyerGateReadinessGuardianController = require("../controllers/internal-buyer-gate-readiness-guardian.controller");
const controlledBuyerGateTestPlanController = require("../controllers/controlled-buyer-gate-test-plan.controller");
const controlledBuyerGateManualActivationApprovalController = require("../controllers/controlled-buyer-gate-manual-activation-approval.controller");
const controlledBuyerGateActivationExecutionController = require("../controllers/controlled-buyer-gate-activation-execution.controller");
const controlledBuyerGateLeadSlotEnforcementController = require("../controllers/controlled-buyer-gate-lead-slot-enforcement.controller");
const controlledBuyerGateManualLeadReviewController = require("../controllers/controlled-buyer-gate-manual-lead-review.controller");
const controlledBuyerGateManualStockCheckController = require("../controllers/controlled-buyer-gate-manual-stock-check.controller");
const controlledBuyerGateManualCompatibilityCheckController = require("../controllers/controlled-buyer-gate-manual-compatibility-check.controller");
const controlledBuyerGateFinalQuoteEligibilityController = require("../controllers/controlled-buyer-gate-final-quote-eligibility.controller");
const controlledBuyerGateManualQuoteDraftController = require("../controllers/controlled-buyer-gate-manual-quote-draft.controller");
const sendHtml = require("../utils/send-html");

function routeRequest(req, res, sendJson) {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (method === "GET" && url.pathname === "/") {
    return sendJson(res, 200, {
      app: "Demega Spare Parts Buyer MVP 2026",
      status: "running",
      message: "Small Smart Backend Server Foundation is alive.",
      routes: [
        "/",
        "/admin-navigation-hub",
        "/admin-hub",
        "/dashboard",
        "/admin",
        "/inventory",
        "/quotes",
        "/quote-drafts",
        "/pipeline",
        "/buyer-pipeline",
        "/followups",
        "/follow-up-reminders",
        "/action-queue",
        "/buyer-action-queue",
        "/hot-buyers",
        "/hot-buyer-command-center",
        "/whatsapp-manual",
        "/whatsapp-manual-links",
        "/stock-confirmation",
        "/stock-confirmation-gate",
        "/compatibility-confirmation",
        "/compatibility-confirmation-gate",
        "/quote-eligibility",
        "/quote-eligibility-gate",
        "/manual-quote-draft",
        "/manual-quote-drafts",
        "/manual-quote-copy",
        "/manual-quote-copies",
        "/manual-quote-sent-confirmation",
        "/manual-quote-sent-confirmations",
        "/buyer-reply",
        "/buyer-replies",
        "/buyer-reply-followup",
        "/buyer-reply-followups",
        "/manual-deal-outcome",
        "/manual-deal-outcomes",
        "/manual-stock-movement-review",
        "/manual-stock-movement-reviews",
        "/manual-accounting-review",
        "/manual-accounting-reviews",
        "/manual-final-business-review",
        "/manual-final-business-reviews",
        "/assistant-sales-agent-test-lab",
        "/assistant-sales-agent-test-runs",
        "/internal-buyer-gate-readiness",
        "/internal-buyer-gate-readiness-runs",
        "/controlled-buyer-gate-test-plan",
        "/controlled-buyer-gate-test-plans",
        "/controlled-buyer-gate-manual-activation-approval",
        "/controlled-buyer-gate-manual-activation-approvals",
        "/controlled-buyer-gate-activation-execution",
        "/controlled-buyer-gate-activation-executions",
        "/controlled-buyer-gate-lead-slot-enforcement",
        "/controlled-buyer-gate-lead-slots",
        "/controlled-buyer-gate-manual-lead-review",
        "/controlled-buyer-gate-manual-lead-reviews",
        "/controlled-buyer-gate-manual-stock-check",
        "/controlled-buyer-gate-manual-stock-checks",
        "/controlled-buyer-gate-manual-compatibility-check",
        "/controlled-buyer-gate-manual-compatibility-checks",
        "/controlled-buyer-gate-final-quote-eligibility",
        "/controlled-buyer-gate-final-quote-eligibilities",
        "/api/admin-navigation/summary",
        "/api/admin-navigation/dashboard-metrics",
        "/api/whatsapp-manual/preview",
        "/api/whatsapp-manual/links",
        "/api/whatsapp-manual/summary",
        "/api/stock-confirmation/preview",
        "/api/stock-confirmations",
        "/api/stock-confirmation/summary",
        "/api/compatibility-confirmation/preview",
        "/api/compatibility-confirmations",
        "/api/compatibility-confirmation/summary",
        "/api/quote-eligibility/preview",
        "/api/quote-eligibilities",
        "/api/quote-eligibility/summary",
        "/api/manual-quote-draft/preview",
        "/api/manual-quote-drafts",
        "/api/manual-quote-draft/summary",
        "/api/manual-quote-copy/preview",
        "/api/manual-quote-copies",
        "/api/manual-quote-copy/summary",
        "/api/manual-quote-sent-confirmation/preview",
        "/api/manual-quote-sent-confirmations",
        "/api/manual-quote-sent-confirmation/summary",
        "/api/buyer-reply/preview",
        "/api/buyer-replies",
        "/api/buyer-reply/summary",
        "/api/buyer-reply-followup/preview",
        "/api/buyer-reply-followups",
        "/api/buyer-reply-followup/summary",
        "/api/manual-deal-outcome/preview",
        "/api/manual-deal-outcomes",
        "/api/manual-deal-outcome/summary",
        "/api/manual-stock-movement-review/preview",
        "/api/manual-stock-movement-reviews",
        "/api/manual-stock-movement-review/summary",
        "/api/manual-accounting-review/preview",
        "/api/manual-accounting-reviews",
        "/api/manual-accounting-review/summary",
        "/api/manual-final-business-review/preview",
        "/api/manual-final-business-reviews",
        "/api/manual-final-business-review/summary",
        "/api/project-source-of-truth/preview",
        "/api/project-source-of-truth/files",
        "/api/project-source-of-truth/summary",
        "/api/assistant-sales-agent-test-lab/preview",
        "/api/assistant-sales-agent-test-lab/runs",
        "/api/assistant-sales-agent-test-lab/summary",
        "/api/internal-buyer-gate-readiness/preview",
        "/api/internal-buyer-gate-readiness/runs",
        "/api/internal-buyer-gate-readiness/summary",
        "/api/hot-buyers/preview",
        "/api/hot-buyers",
        "/api/hot-buyers/summary",
        "/api/action-queue/preview",
        "/api/action-queue",
        "/api/action-queue/summary",
        "/api/health",
        "/api/project-status",
        "/api/storage/status",
        "/api/dashboard/summary",
        "/api/scoring/preview",
        "/api/scoring/summary",
        "/api/inventory",
        "/api/inventory/summary",
        "/api/inventory/match-preview",
        "/api/quotes",
        "/api/quotes/summary",
        "/api/quotes/preview",
        "/api/pipeline/preview",
        "/api/pipeline/summary",
        "/api/pipeline/events",
        "/api/followups/preview",
        "/api/followups",
        "/api/followups/summary",
        "POST /api/buyer-intake",
        "POST /api/inventory",
        "POST /api/inventory/match",
        "POST /api/quotes/draft",
        "POST /api/pipeline/move",
        "POST /api/followups/create",
        "POST /api/action-queue/create",
        "POST /api/whatsapp-manual/open-link",
        "POST /api/stock-confirmation/confirm",
        "POST /api/compatibility-confirmation/confirm",
        "POST /api/quote-eligibility/check",
        "POST /api/manual-quote-draft/build",
        "POST /api/manual-quote-copy/prepare",
        "POST /api/manual-quote-sent-confirmation/confirm",
        "POST /api/buyer-reply/record",
        "POST /api/buyer-reply-followup/plan",
        "POST /api/manual-deal-outcome/record",
        "POST /api/manual-stock-movement-review/record",
        "POST /api/manual-accounting-review/record",
        "POST /api/manual-final-business-review/record",
        "POST /api/assistant-sales-agent-test-lab/run",
        "POST /api/internal-buyer-gate-readiness/run",
        "GET /api/leads"
      ]
    });
  }

  if (method === "GET" && (url.pathname === "/admin-navigation-hub" || url.pathname === "/admin-hub")) {
    return adminNavigationController.adminNavigationHubController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/admin-navigation/summary") {
    return adminNavigationController.adminNavigationSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/admin-navigation/dashboard-metrics") {
    return adminNavigationController.adminNavigationDashboardMetricsController(req, res, sendJson);
  }

  if (method === "GET" && (url.pathname === "/whatsapp-manual" || url.pathname === "/whatsapp-manual-links")) {
    return whatsappManualController.whatsappManualDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/stock-confirmation" || url.pathname === "/stock-confirmation-gate")) {
    return stockConfirmationController.stockConfirmationDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/compatibility-confirmation" || url.pathname === "/compatibility-confirmation-gate")) {
    return compatibilityConfirmationController.compatibilityConfirmationDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/quote-eligibility" || url.pathname === "/quote-eligibility-gate")) {
    return quoteEligibilityController.quoteEligibilityDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-quote-draft" || url.pathname === "/manual-quote-drafts")) {
    return manualQuoteDraftController.manualQuoteDraftDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-quote-copy" || url.pathname === "/manual-quote-copies")) {
    return manualQuoteCopyController.manualQuoteCopyDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-quote-sent-confirmation" || url.pathname === "/manual-quote-sent-confirmations")) {
    return manualQuoteSentConfirmationController.manualQuoteSentConfirmationDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/buyer-reply" || url.pathname === "/buyer-replies")) {
    return buyerReplyController.buyerReplyDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/buyer-reply-followup" || url.pathname === "/buyer-reply-followups")) {
    return buyerReplyFollowupActionController.buyerReplyFollowupActionDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-deal-outcome" || url.pathname === "/manual-deal-outcomes")) {
    return manualDealOutcomeController.manualDealOutcomeDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-stock-movement-review" || url.pathname === "/manual-stock-movement-reviews")) {
    return manualStockMovementReviewController.manualStockMovementReviewDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-accounting-review" || url.pathname === "/manual-accounting-reviews")) {
    return manualAccountingReviewController.manualAccountingReviewDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/manual-final-business-review" || url.pathname === "/manual-final-business-reviews")) {
    return manualFinalBusinessReviewController.manualFinalBusinessReviewDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/assistant-sales-agent-test-lab" || url.pathname === "/assistant-sales-agent-test-runs")) {
    return assistantSalesAgentTestLabController.assistantSalesAgentTestLabDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/internal-buyer-gate-readiness" || url.pathname === "/internal-buyer-gate-readiness-runs")) {
    return internalBuyerGateReadinessGuardianController.internalBuyerGateReadinessDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-test-plan" || url.pathname === "/controlled-buyer-gate-test-plans")) {
    return controlledBuyerGateTestPlanController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-activation-approval" || url.pathname === "/controlled-buyer-gate-manual-activation-approvals")) {
    return controlledBuyerGateManualActivationApprovalController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-activation-execution" || url.pathname === "/controlled-buyer-gate-activation-executions")) {
    return controlledBuyerGateActivationExecutionController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-lead-slot-enforcement" || url.pathname === "/controlled-buyer-gate-lead-slots")) {
    return controlledBuyerGateLeadSlotEnforcementController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-lead-review" || url.pathname === "/controlled-buyer-gate-manual-lead-reviews")) {
    return controlledBuyerGateManualLeadReviewController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-stock-check" || url.pathname === "/controlled-buyer-gate-manual-stock-checks")) {
    return controlledBuyerGateManualStockCheckController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-compatibility-check" || url.pathname === "/controlled-buyer-gate-manual-compatibility-checks")) {
    return controlledBuyerGateManualCompatibilityCheckController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-final-quote-eligibility" || url.pathname === "/controlled-buyer-gate-final-quote-eligibilities")) {
    return controlledBuyerGateFinalQuoteEligibilityController.dashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/preview") {
    return controlledBuyerGateManualQuoteDraftController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/create") {
    return controlledBuyerGateManualQuoteDraftController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-drafts") {
    return controlledBuyerGateManualQuoteDraftController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/summary") {
    return controlledBuyerGateManualQuoteDraftController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-quote-eligibility/preview") {
    return controlledBuyerGateFinalQuoteEligibilityController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-final-quote-eligibility/create") {
    return controlledBuyerGateFinalQuoteEligibilityController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-quote-eligibilities") {
    return controlledBuyerGateFinalQuoteEligibilityController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-quote-eligibility/summary") {
    return controlledBuyerGateFinalQuoteEligibilityController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-compatibility-check/preview") {
    return controlledBuyerGateManualCompatibilityCheckController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-compatibility-check/create") {
    return controlledBuyerGateManualCompatibilityCheckController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-compatibility-checks") {
    return controlledBuyerGateManualCompatibilityCheckController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-compatibility-check/summary") {
    return controlledBuyerGateManualCompatibilityCheckController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-stock-check/preview") {
    return controlledBuyerGateManualStockCheckController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-stock-check/create") {
    return controlledBuyerGateManualStockCheckController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-stock-checks") {
    return controlledBuyerGateManualStockCheckController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-stock-check/summary") {
    return controlledBuyerGateManualStockCheckController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/preview") {
    return controlledBuyerGateManualLeadReviewController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/create") {
    return controlledBuyerGateManualLeadReviewController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-reviews") {
    return controlledBuyerGateManualLeadReviewController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/summary") {
    return controlledBuyerGateManualLeadReviewController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slot-enforcement/preview") {
    return controlledBuyerGateLeadSlotEnforcementController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-lead-slot/create") {
    return controlledBuyerGateLeadSlotEnforcementController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slots") {
    return controlledBuyerGateLeadSlotEnforcementController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slot-enforcement/summary") {
    return controlledBuyerGateLeadSlotEnforcementController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-execution/preview") {
    return controlledBuyerGateActivationExecutionController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-activation-execution/create") {
    return controlledBuyerGateActivationExecutionController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-executions") {
    return controlledBuyerGateActivationExecutionController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-execution/summary") {
    return controlledBuyerGateActivationExecutionController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-activation-approval/preview") {
    return controlledBuyerGateManualActivationApprovalController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-activation-approval/create") {
    return controlledBuyerGateManualActivationApprovalController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-activation-approvals") {
    return controlledBuyerGateManualActivationApprovalController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-activation-approval/summary") {
    return controlledBuyerGateManualActivationApprovalController.summaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plan/preview") {
    return controlledBuyerGateTestPlanController.previewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plans") {
    return controlledBuyerGateTestPlanController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plan/summary") {
    return controlledBuyerGateTestPlanController.summaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-test-plan/create") {
    return controlledBuyerGateTestPlanController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/preview") {
    return internalBuyerGateReadinessGuardianController.internalBuyerGateReadinessPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/runs") {
    return internalBuyerGateReadinessGuardianController.listInternalBuyerGateReadinessRunsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/summary") {
    return internalBuyerGateReadinessGuardianController.internalBuyerGateReadinessSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/internal-buyer-gate-readiness/run") {
    return internalBuyerGateReadinessGuardianController.runInternalBuyerGateReadinessController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/preview") {
    return assistantSalesAgentTestLabController.assistantSalesAgentTestLabPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/runs") {
    return assistantSalesAgentTestLabController.listAssistantSalesAgentTestRunsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/summary") {
    return assistantSalesAgentTestLabController.assistantSalesAgentTestLabSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/assistant-sales-agent-test-lab/run") {
    return assistantSalesAgentTestLabController.runAssistantSalesAgentTestLabController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-source-of-truth/preview") {
    return projectSourceOfTruthController.projectSourceOfTruthPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-source-of-truth/files") {
    return projectSourceOfTruthController.projectSourceOfTruthFilesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-source-of-truth/summary") {
    return projectSourceOfTruthController.projectSourceOfTruthSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-final-business-review/preview") {
    return manualFinalBusinessReviewController.manualFinalBusinessReviewPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-final-business-reviews") {
    return manualFinalBusinessReviewController.listManualFinalBusinessReviewsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-final-business-review/summary") {
    return manualFinalBusinessReviewController.manualFinalBusinessReviewSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-final-business-review/record") {
    return manualFinalBusinessReviewController.recordManualFinalBusinessReviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-accounting-review/preview") {
    return manualAccountingReviewController.manualAccountingReviewPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-accounting-reviews") {
    return manualAccountingReviewController.listManualAccountingReviewsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-accounting-review/summary") {
    return manualAccountingReviewController.manualAccountingReviewSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-accounting-review/record") {
    return manualAccountingReviewController.recordManualAccountingReviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-stock-movement-review/preview") {
    return manualStockMovementReviewController.manualStockMovementReviewPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-stock-movement-reviews") {
    return manualStockMovementReviewController.listManualStockMovementReviewsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-stock-movement-review/summary") {
    return manualStockMovementReviewController.manualStockMovementReviewSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-stock-movement-review/record") {
    return manualStockMovementReviewController.recordManualStockMovementReviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-deal-outcome/preview") {
    return manualDealOutcomeController.manualDealOutcomePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-deal-outcomes") {
    return manualDealOutcomeController.listManualDealOutcomesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-deal-outcome/summary") {
    return manualDealOutcomeController.manualDealOutcomeSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-deal-outcome/record") {
    return manualDealOutcomeController.recordManualDealOutcomeController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply-followup/preview") {
    return buyerReplyFollowupActionController.buyerReplyFollowupActionPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply-followups") {
    return buyerReplyFollowupActionController.listBuyerReplyFollowupActionsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply-followup/summary") {
    return buyerReplyFollowupActionController.buyerReplyFollowupActionSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/buyer-reply-followup/plan") {
    return buyerReplyFollowupActionController.planBuyerReplyFollowupActionController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply/preview") {
    return buyerReplyController.buyerReplyPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-replies") {
    return buyerReplyController.listBuyerRepliesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply/summary") {
    return buyerReplyController.buyerReplySummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/buyer-reply/record") {
    return buyerReplyController.recordBuyerReplyController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmation/preview") {
    return manualQuoteSentConfirmationController.manualQuoteSentConfirmationPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmations") {
    return manualQuoteSentConfirmationController.listManualQuoteSentConfirmationsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmation/summary") {
    return manualQuoteSentConfirmationController.manualQuoteSentConfirmationSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-quote-sent-confirmation/confirm") {
    return manualQuoteSentConfirmationController.confirmManualQuoteSentController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-copy/preview") {
    return manualQuoteCopyController.manualQuoteCopyPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-copies") {
    return manualQuoteCopyController.listManualQuoteCopyActionsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-copy/summary") {
    return manualQuoteCopyController.manualQuoteCopySummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-quote-copy/prepare") {
    return manualQuoteCopyController.prepareManualQuoteCopyController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-draft/preview") {
    return manualQuoteDraftController.manualQuoteDraftPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-drafts") {
    return manualQuoteDraftController.listManualQuoteDraftsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-draft/summary") {
    return manualQuoteDraftController.manualQuoteDraftSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-quote-draft/build") {
    return manualQuoteDraftController.createManualQuoteDraftController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quote-eligibility/preview") {
    return quoteEligibilityController.quoteEligibilityPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quote-eligibilities") {
    return quoteEligibilityController.listQuoteEligibilitiesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quote-eligibility/summary") {
    return quoteEligibilityController.quoteEligibilitySummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/quote-eligibility/check") {
    return quoteEligibilityController.createQuoteEligibilityCheckController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/compatibility-confirmation/preview") {
    return compatibilityConfirmationController.compatibilityConfirmationPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/compatibility-confirmations") {
    return compatibilityConfirmationController.listCompatibilityConfirmationsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/compatibility-confirmation/summary") {
    return compatibilityConfirmationController.compatibilityConfirmationSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/compatibility-confirmation/confirm") {
    return compatibilityConfirmationController.createCompatibilityConfirmationController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/stock-confirmation/preview") {
    return stockConfirmationController.stockConfirmationPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/stock-confirmations") {
    return stockConfirmationController.listStockConfirmationsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/stock-confirmation/summary") {
    return stockConfirmationController.stockConfirmationSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/stock-confirmation/confirm") {
    return stockConfirmationController.createStockConfirmationController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/whatsapp-manual/preview") {
    return whatsappManualController.whatsappManualPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/whatsapp-manual/links") {
    return whatsappManualController.listWhatsappManualLinksController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/whatsapp-manual/summary") {
    return whatsappManualController.whatsappManualSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/whatsapp-manual/open-link") {
    return whatsappManualController.createWhatsappManualLinkController(req, res, sendJson);
  }

  if (method === "GET" && (url.pathname === "/hot-buyers" || url.pathname === "/hot-buyer-command-center")) {
    return hotBuyerController.hotBuyerDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/hot-buyers/preview") {
    return hotBuyerController.hotBuyerPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/hot-buyers") {
    return hotBuyerController.listHotBuyersController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/hot-buyers/summary") {
    return hotBuyerController.hotBuyerSummaryController(req, res, sendJson);
  }

  if (method === "GET" && (url.pathname === "/action-queue" || url.pathname === "/buyer-action-queue")) {
    return actionQueueController.actionQueueDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/action-queue/preview") {
    return actionQueueController.actionQueuePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/action-queue") {
    return actionQueueController.listActionsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/action-queue/summary") {
    return actionQueueController.actionQueueSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/action-queue/create") {
    return actionQueueController.createActionController(req, res, sendJson);
  }

  if (method === "GET" && (url.pathname === "/dashboard" || url.pathname === "/admin")) {
    return dashboardController.adminDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/inventory") {
    return inventoryController.inventoryPageController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/quotes" || url.pathname === "/quote-drafts")) {
    return quoteDraftController.quoteDraftDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/pipeline" || url.pathname === "/buyer-pipeline")) {
    return buyerPipelineController.buyerPipelineDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/followups" || url.pathname === "/follow-up-reminders")) {
    return followUpController.followUpDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/dashboard/summary") {
    return dashboardController.dashboardSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/scoring/preview") {
    return scoringController.scoringPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/scoring/summary") {
    return scoringController.scoringSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/inventory") {
    return inventoryController.listInventoryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/inventory") {
    return inventoryController.createInventoryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/inventory/summary") {
    return inventoryController.inventorySummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/inventory/match-preview") {
    return inventoryMatchingController.matchingPreviewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/inventory/match") {
    return inventoryMatchingController.matchInventoryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/quotes/draft") {
    return quoteDraftController.createQuoteDraftController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quotes") {
    return quoteDraftController.listQuoteDraftsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quotes/summary") {
    return quoteDraftController.quoteSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quotes/preview") {
    return quoteDraftController.quotePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/pipeline/preview") {
    return buyerPipelineController.pipelinePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/pipeline/summary") {
    return buyerPipelineController.pipelineSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/pipeline/events") {
    return buyerPipelineController.pipelineEventsController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/pipeline/move") {
    return buyerPipelineController.moveLeadStageController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/followups/preview") {
    return followUpController.followUpPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/followups") {
    return followUpController.listFollowUpsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/followups/summary") {
    return followUpController.followUpSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/followups/create") {
    return followUpController.createFollowUpController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/health") {
    return healthController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-status") {
    return projectStatusController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/storage/status") {
    return storageStatusController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/buyer-intake") {
    return buyerIntakeController.createBuyerLeadController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/leads") {
    return buyerIntakeController.listBuyerLeadsController(req, res, sendJson);
  }

  return sendJson(res, 404, {
    error: "Route not found",
    method,
    path: url.pathname
  });
}

module.exports = routeRequest;
