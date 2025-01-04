const express = require("express");
const router = express.Router();
const upload = require("./middleware/expenseImagesMiddleware");
const {
  getRegions,
  getChapters,
  getMembers,
  getAccolades,
  getMemberCategory,
  getCompany,
  getSupplier,
  getInventory,
  getSupplies,
  getEvents,
  getMembershipFee,
  addMembershipFee,
  addRegion,
  addChapter,
  addMember,
  getUniversalLinks,
  getPaymentGateway,
  getOrders,
  getTransactions,
  authTokens,
  getMember,
  getEinvoice,
  getChapter,
  getRegion,
  getUniversalLink,
  updateRegion,
  deleteRegion,
  getUsers,
  getLoginOtps,
  getLoginLogs,
  updateChapter,
  deleteChapter,
  updateMember,
  deleteMember,
  deleteUniversalLink,
  updateUniversalLink,
  deleteAccolade,
  getAccolade,
  updateAccolade,
  addAccolade,
  exportRegionsToExcel,
  exportChaptersToExcel,
  exportMembersToExcel,
  exportOrdersToExcel,
  exportTransactionsToExcel ,
  deleteEvent,
  getEvent,
  updateEvent,
  addEvent,
  getTrainings,
  getTraining,
  updateTraining,
  deleteTraining,
  addTraining,
  getSettledPayments,
  getOrder,
  getMemberId,
  addKittyPayment,
  getKittyPayments,
  deleteKittyBill,
  expenseType,
  allExpenses,
  addExpense,
  addExpenseType,
  getExpenseById,
  updateExpense,
  deleteExpense,
  updateMemberSettings
} = require("./controllers");

router.get("/regions", getRegions);
router.post("/regions", addRegion);
router.get("/chapters", getChapters);
router.post("/chapters", addChapter);
router.get("/members", getMembers);
router.post("/members", addMember);
router.get("/accolades", getAccolades);
router.get("/memberCategory", getMemberCategory);
router.get("/company", getCompany);
router.get("/supplier", getSupplier);
router.get("/inventory", getInventory);
router.get("/supplies", getSupplies);
router.get("/allEvents", getEvents);
router.get("/membershipFee", getMembershipFee);
router.post("/membershipFee", addMembershipFee);
router.get("/universalLinks", getUniversalLinks);
router.get("/paymentGateway", getPaymentGateway);
router.get("/allOrders", getOrders);
router.get("/allTransactions", getTransactions);
router.get("/authTokens", authTokens);
router.get("/getMember/:member_id", getMember);
router.get("/einvoice/:order_id", getEinvoice);
router.get("/getChapter/:chapter_id", getChapter);
router.get("/getRegion/:region_id", getRegion);
router.get("/getUniversalLink/:id", getUniversalLink);
router.put("/updateRegion/:region_id", updateRegion);
router.put("/deleteRegion/:region_id", deleteRegion);
router.get("/getUsers", getUsers);
router.get("/getAccolade/:accolade_id", getAccolade);
router.get("/getLoginOtps", getLoginOtps);
router.get("/getLoginLogs", getLoginLogs);
router.put("/updateChapter/:chapter_id", updateChapter);
router.put("/deleteChapter/:chapter_id", deleteChapter);
router.put("/updateMember/:member_id", updateMember);
router.put("/deleteMember/:member_id", deleteMember);
router.put("/updateUniversalLink/:id", updateUniversalLink);
router.put("/deleteUniversalLink/:id", deleteUniversalLink);
router.put("/updateAccolade/:accolade_id", updateAccolade);
router.put("/deleteAccolade/:accolade_id", deleteAccolade);
router.post("/accolades", addAccolade);
router.get('/exportRegions', exportRegionsToExcel);
router.get('/export-chapters', exportChaptersToExcel);
router.get('/export-members', exportMembersToExcel);
router.get('/export-orders', exportOrdersToExcel);
router.get('/export-transactions', exportTransactionsToExcel );
router.put("/deleteEvent/:event_id", deleteEvent);
router.get("/getEvent/:event_id", getEvent);
router.put("/updateEvent/:event_id", updateEvent);
router.post("/events", addEvent);
router.get("/allTrainings", getTrainings);
router.get("/getTraining/:training_id", getTraining);
router.put("/updateTraining/:training_id", updateTraining);
router.put("/deleteTraining/:training_id", deleteTraining);
router.post("/training", addTraining);
router.get("/allSettledPayments", getSettledPayments);
router.get("/getOrder/:order_id", getOrder);
router.get("/getMemberId/:member_id", getMemberId);
router.post('/addKittyPayment', addKittyPayment);
router.get("/getKittyPayments", getKittyPayments);
router.put("/deleteKittyBill/:payment_id", deleteKittyBill);
router.get("/expenseType", expenseType);
router.post("/expenseType", addExpenseType)
router.get("/allExpenses", allExpenses);
router.get("/expense/:expense_id", getExpenseById);
router.post("/addExpense",upload.single("upload_bill"),addExpense);
router.put("/expense/:expense_id", upload.single("upload_bill"), updateExpense);
router.delete("/expense/:expense_id", deleteExpense);
router.put("/updateMemberSettings", updateMemberSettings);

module.exports = router;
