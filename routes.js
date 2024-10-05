const express = require('express');
const router = express.Router();
const { getRegions, getChapters, getMembers, getAccolades, getMemberCategory } = require('./controllers');

router.get('/regions', getRegions);
router.get('/chapters', getChapters); 
router.get('/members', getMembers); 
router.get('/accolades', getAccolades); 
router.get('/memberCategory', getMemberCategory); 

module.exports = router;
