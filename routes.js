const express = require('express');
const router = express.Router();
const { getRegions, getChapters, getMembers, getAccolades, getMemberCategory } = require('./controllers');

router.get('/regions', getRegions);  // Fetch all regions
router.get('/chapters', getChapters); // Fetch all chapters
router.get('/members', getMembers);  // Fetch all members
router.get('/accolades', getAccolades);  // Fetch all members
router.get('/memberCategory', getMemberCategory);  // Fetch all members

module.exports = router;
