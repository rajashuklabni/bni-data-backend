const express = require("express");
const router = express.Router();
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
router.get("/getLoginOtps", getLoginOtps);
router.get("/getLoginLogs", getLoginLogs);
router.put("/updateChapter/:chapter_id", updateChapter);
router.put("/deleteChapter/:chapter_id", deleteChapter);
router.put("/updateMember/:member_id", updateMember);
router.put("/deleteMember/:member_id", deleteMember);
router.put("/deleteUniversalLink/:id", deleteUniversalLink);



module.exports = router;
