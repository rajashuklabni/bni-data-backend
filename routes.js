const express = require("express");
const router = express.Router();
const upload = require("./middleware/expenseImagesMiddleware");
const { Client } = require("pg");
const {
  addInvoiceManually,
  getBankOrder,
  getSpecificBankOrder,
  addPendingAmount,
  getPendingAmount,
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
  exportTransactionsToExcel,
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
  updateMemberSettings,
  updateUserSettings,
  updateLogo,
  updateGstTypeValues,
  updateUserPassword,
  getMemberByEmail,
  getDisplayLogo,
  getGstType,
  getGstTypeValues,
  sendQrCodeByEmail,
  markAttendence,
  verifyQrCode,
  allCheckins,
  getAllKittyPayments,
  memberPendingKittyOpeningBalance,
  updatePaymentGatewayStatus,
  updateChapterSettings,
  getAllMemberCredit,
  addMemberCredit,
  getInterviewSheet,
  getCommitmentSheet,
  addMemberWriteOff,
  getAllMemberWriteOff,
  getAllVisitors,
} = require("./controllers");

const path = require("path");
const multer = require("multer");
const fs = require("fs");
const con = new Client({
  host: "dpg-cs0d2hi3esus739088bg-a.oregon-postgres.render.com",
  user: "bni_dashboard_backend_database_user",
  port: 5432,
  password: "8UGkmCixOpO5Gb89BSBI8aPPapoAW6fD",
  database: "bni_dashboard_backend_database",
  ssl: {
    rejectUnauthorized: false, // Required for secure connections to Render
  },
});

con.connect().then(() => console.log("Connected to the database"));

// Configure multer storage for logo uploads
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/dynamicLogo';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadLogo = multer({
    storage: logoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Add this middleware before multer to parse the form data
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads', 'expenses');
        console.log('📁 Upload Directory:', uploadDir);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('📁 Created directory:', uploadDir);
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Get expense_id from the controller after DB insert
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${uniqueSuffix}${path.extname(file.originalname)}`;
        console.log('📄 Generated filename:', filename);
        cb(null, filename);
    }
});

// Add fields configuration to multer
const expenseUpload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            console.log('✅ File validation passed');
            cb(null, true);
        } else {
            console.error('❌ Invalid file type');
            cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed'));
        }
    }
});

// Configure multer storage for member photos
const memberPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/memberPhotos';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use the original filename without any modifications
    cb(null, file.originalname);
  }
});

const uploadMemberPhoto = multer({
  storage: memberPhotoStorage,
  fileFilter: function (req, file, cb) {
    // Check file type
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Configure multer storage for chapter logos
const chapterLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/chapterPhotos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chapter-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadChapterLogo = multer({
    storage: chapterLogoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Configure multer storage for region logos
const regionLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/regionLogos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'region-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadRegionLogo = multer({
    storage: regionLogoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Route to handle logo upload
router.post("/uploadLogo", (req, res) => {
  uploadLogo.single("logo")(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.log("Multer error uploading logo:", err);
      return res.status(400).json({ message: err.message });
    } else if (err) {
      console.log("Error uploading logo:", err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      console.log("File uploaded successfully:", req.file.filename);

      // First deactivate all existing logos
      await con.query(
        "UPDATE display_logo SET display_status = 'inactive' WHERE display_status = 'active'"
      );
      console.log("Deactivated existing logos");

      // Insert new logo record
      const result = await con.query(
        `INSERT INTO display_logo 
         (display_image_name, display_status, added_by) 
         VALUES ($1, 'active', 'Admin') 
         RETURNING *`,
        [req.file.filename]
      );
      console.log("Inserted new logo record:", result.rows[0]);

      res.json({
        message: "Logo uploaded successfully",
        imageName: req.file.filename,
      });
    } catch (error) {
      console.error("Error saving logo to database:", error);
      res.status(500).json({ message: "Error saving logo information" });
    }
  });
});

router.get("/regions", getRegions);
router.post("/regions", uploadRegionLogo.single('region_logo'), addRegion);
router.get("/chapters", getChapters);
router.post("/chapters", addChapter);
router.get("/members", getMembers);
router.get("/members/:email", getMemberByEmail);
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
router.put("/updateRegion/:region_id", uploadRegionLogo.single('region_logo'), updateRegion);
router.put("/deleteRegion/:region_id", deleteRegion);
router.get("/getUsers", getUsers);
router.get("/getAccolade/:accolade_id", getAccolade);
router.get("/getLoginOtps", getLoginOtps);
router.get("/getLoginLogs", getLoginLogs);
router.put("/updateChapter/:chapter_id", updateChapter);
router.put("/deleteChapter/:chapter_id", deleteChapter);
router.put("/updateMember/:member_id", uploadMemberPhoto.single('member_photo'), updateMember);
router.put("/deleteMember/:member_id", deleteMember);
router.put("/updateUniversalLink/:id", updateUniversalLink);
router.put("/deleteUniversalLink/:id", deleteUniversalLink);
router.put("/updateAccolade/:accolade_id", updateAccolade);
router.put("/deleteAccolade/:accolade_id", deleteAccolade);
router.post("/accolades", addAccolade);
router.get("/exportRegions", exportRegionsToExcel);
router.get("/export-chapters", exportChaptersToExcel);
router.get("/export-members", exportMembersToExcel);
router.get("/export-orders", exportOrdersToExcel);
router.get("/export-transactions", exportTransactionsToExcel);
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
router.post("/addKittyPayment", addKittyPayment);
router.get("/getKittyPayments", getKittyPayments);
router.put("/deleteKittyBill/:payment_id", deleteKittyBill);
router.get("/expenseType", expenseType);
router.post("/expenseType", addExpenseType);
router.get("/allExpenses", allExpenses);
router.get("/expense/:expense_id", getExpenseById);
router.post("/addExpense", (req, res, next) => {
    console.log('📝 Incoming Request Body:', req.body);
    next();
}, expenseUpload.single("upload_bill"), addExpense);
router.put("/expense/:expense_id", expenseUpload.single("upload_bill"), updateExpense);
router.delete("/expense/:expense_id", deleteExpense);
router.put("/updateMemberSettings", uploadMemberPhoto.single('member_photo'), updateMemberSettings);
router.put("/updateUserSettings", updateUserSettings);
router.put("/updateLogo", updateLogo);
router.put("/updateGstTypeValues", updateGstTypeValues);
router.put("/updateUserPassword", updateUserPassword);
router.get("/getDisplayLogo", getDisplayLogo);
router.get("/getGstType", getGstType);
router.get("/getGstTypeValues", getGstTypeValues);
router.post("/send-qr-code", sendQrCodeByEmail);
router.post("/markAttendence", markAttendence);
router.post("/verify-qr-code", verifyQrCode);
router.get("/allCheckins", allCheckins);
router.get("/getAllKittyPayments", getAllKittyPayments);
router.get("/memberPendingKittyOpeningBalance", memberPendingKittyOpeningBalance);

// added by vasusri
router.post('/addPendingAmount',addPendingAmount);
router.get('/getPendingAmount',getPendingAmount);
// router.post('/ccavResponseHandler',ccavResponseHandler)
router.post('/addInvoiceManually',addInvoiceManually)

router.put("/payment-gateway/:gateway_id/status", updatePaymentGatewayStatus);
router.get("/getAllMemberCredit", getAllMemberCredit);
router.post("/addMemberCredit", addMemberCredit);
router.post("/addMemberWriteOff", addMemberWriteOff);
router.get("/getAllMemberWriteOff", getAllMemberWriteOff);

router.put("/updateChapterSettings", 
    uploadChapterLogo.single('chapter_logo'), 
    updateChapterSettings
);
router.get('/getInterviewSheet',getInterviewSheet);
router.get('/getCommitmentSheet',getCommitmentSheet);
router.get("/getAllVisitors", getAllVisitors);
router.get("/getBankOrder", getBankOrder);
router.get("/getSpecificBankOrder", getSpecificBankOrder);

// Route to serve the uploaded files
router.get('/uploads/expenses/:filename', (req, res) => {
    console.log('🔍 Requesting file:', req.params.filename);
    
    const projectRoot = path.resolve(__dirname);
    const filePath = path.join(projectRoot, 'uploads', 'expenses', req.params.filename);
    console.log('📂 Full file path:', filePath);
    
    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        return res.status(404).json({ 
            message: 'File not found',
            requestedFile: req.params.filename,
            searchPath: filePath
        });
    }
    
    // Set proper headers based on file type
    const ext = path.extname(req.params.filename).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('✅ Serving file:', req.params.filename);
    res.sendFile(filePath);
});

// Add a debug route to check directory structure
router.get('/check-upload-dir', (req, res) => {
    const uploadDir = path.join(__dirname, './uploads/expenses');
    
    try {
        const exists = fs.existsSync(uploadDir);
        const files = exists ? fs.readdirSync(uploadDir) : [];
        
        res.json({
            uploadDir,
            exists,
            files,
            currentDir: __dirname
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            uploadDir
        });
    }
});

// Add route to serve region logos
router.get('/uploads/regionLogos/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'regionLogos', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            message: 'Logo not found',
            requestedFile: req.params.filename
        });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

module.exports = router;
