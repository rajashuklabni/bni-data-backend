const express = require('express');
const router = express.Router();
const { getRegions, getChapters, getMembers, getAccolades, getMemberCategory, getCompany, getSupplier, getInventory, getSupplies, getEvents, getMembershipFee, addMembershipFee, addRegion, addChapter, addMember, getUniversalLinks, getPaymentGateway, getOrders } = require('./controllers');

router.get('/regions', getRegions);
router.post('/regions', addRegion);
router.get('/chapters', getChapters); 
router.post('/chapters', addChapter);
router.get('/members', getMembers); 
router.post('/members', addMember);
router.get('/accolades', getAccolades); 
router.get('/memberCategory', getMemberCategory); 
router.get('/company', getCompany); 
router.get('/supplier', getSupplier); 
router.get('/inventory', getInventory); 
router.get('/supplies', getSupplies); 
router.get('/allEvents', getEvents); 
router.get('/membershipFee', getMembershipFee); 
router.post('/membershipFee', addMembershipFee);
router.get('/universalLinks', getUniversalLinks);
router.get('/paymentGateway', getPaymentGateway);
router.get('/allOrders', getOrders);


module.exports = router;
