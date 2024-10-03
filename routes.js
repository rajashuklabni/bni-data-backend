const express = require('express');
const router = express.Router();
const { getRegions, getChapters, getMembers } = require('./controllers');

router.get('/regions', getRegions);  // Fetch all regions
router.get('/chapters', getChapters); // Fetch all chapters
router.get('/members', getMembers);  // Fetch all members

module.exports = router;
