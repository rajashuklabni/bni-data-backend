const express = require('express');
const router = express.Router();
const { getRegions, getChapters, getMembers, getAccolades, getMemberCategory, getCompany, getSupplier } = require('./controllers');

router.get('/regions', getRegions);
router.get('/chapters', getChapters); 
router.get('/members', getMembers); 
router.get('/accolades', getAccolades); 
router.get('/memberCategory', getMemberCategory); 
router.get('/company', getCompany); 
router.get('/company', getSupplier); 

module.exports = router;
