const express = require("express");
const router = express.Router();
const upload = require("./middleware/expenseImagesMiddleware");
const dotEnv = require("dotenv");
dotEnv.config();
const { Client } = require("pg");
const {
  addInvoiceManually,
  getCurrentDate,
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
  getInterviewSheetQuestions,
  getInterviewSheetAnswers,
  addInterviewSheetAnswers,
  addMemberWriteOff,
  getAllMemberWriteOff,
  getAllVisitors,
  createInvoice,
  getZones,
  addZone,
  getZone,
  updateZone,
  getHotels,
  addHotel,
  deleteHotel,
  updateHotel,
  getCancelIrn,
  addHotelToRegion,
  getEoiForms,
  addEoiForm,
  exportMembersExcel,
  exportMembersCSV,
  getCommitmentSheet,
  insertCommitmentSheet,
  renderEmailPage,
  sendEmail,
  getInclusionSheet,
  addInclusionSheet,
  getMembershipPending,
  importMembersCSV,
  memberApplicationFormNewMember,
  addMemberApplication,
  markTrainingCompleted,
  updateMemberApplicationDocs,
  updateOnboardingCall,
  exportMemberWiseAccolades,
  getRequestedMemberRequisition,
  addMemberRequisition,
  getRequestedChapterRequisition,
  addChapterRequisition,
  updateChapterRequisition,
  updateMemberRequisition,
  updateVisitor,
  sendVPEmail,
  sendVisitorEmail,
  sendTrainingMails,
  updateVisitorAndEoi,
  updateInterviewSheetAnswers,
  updateCommitmentSheet,
  updateInclusionSheet,
  addVisitorPayment,
  addKittyPaymentManually,
  exportAccoladesToExcel,
  importMemberAccolades,
  getAllMemberAccolades,
  sendInterviewSheetEmail,
  sendFormSubmissionEmail
} = require("./controllers");

const path = require("path");
const multer = require("multer");
const fs = require("fs");

const memberDocsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        
        switch (file.fieldname) {
            case 'member_photo':
                uploadDir = './uploads/memberLogos';
                break;
            case 'member_aadhar':
                uploadDir = './uploads/aadharCards';
                break;
            case 'member_pan':
                uploadDir = './uploads/panCards';
                break;
            case 'member_gst_cert':
                uploadDir = './uploads/gstCertificates';
                break;
            
            case 'aadhar_card_img':
                uploadDir = './uploads/aadharCards';
                break;
            case 'pan_card_img':
                uploadDir = './uploads/panCards';
                break;
            case 'gst_certificate':
                uploadDir = './uploads/gstCertificates';
                break;
            default:
                uploadDir = './uploads/others';
        }

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✨ Created new directory:', uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📝 Generated filename:', filename);
        cb(null, filename);
    }
});

const uploadMemberDocs = multer({
    storage: memberDocsStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('🔍 Validating document:', {
            fieldname: file.fieldname,
            originalName: file.originalname,
            mimetype: file.mimetype,
            isValid: extname && mimetype
        });

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg, .jpeg and .pdf format allowed!'));
        }
    }
});


// Helper function for determining content type
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
}


const con = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Required for secure connections to Render
  },
});

con.connect().then(() => console.log("Connected to new BNI server PostgreSQL"));

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

// Configure multer storage for member files
const memberStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.fieldname === 'member_photo') {
            uploadDir = './uploads/memberLogos';
        } else if (file.fieldname === 'member_company_logo') {
            uploadDir = './uploads/memberCompanyLogos';
        }
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use the original file name
        cb(null, file.originalname);
    }
});


const memberUpload = multer({
    storage: memberStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Configure multer storage for member photos
const memberPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/memberLogos';
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

// Configure multer storage for main chapter logos
const mainChapterLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/chapterLogos';
        console.log('📁 Creating upload directory:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✨ Created new directory');
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'chapter-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📝 Generated filename:', filename);
        cb(null, filename);
    }
});

const uploadMainChapterLogo = multer({
    storage: mainChapterLogoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('🔍 Validating file:', {
            originalName: file.originalname,
            mimetype: file.mimetype,
            isValid: extname && mimetype
        });

        if (extname && mimetype) {
            cb(null, true);
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

// Configure multer storage for main member logos
const mainMemberLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/memberLogos';
        console.log('📁 Creating member logo directory:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✨ Created new member logo directory');
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'member-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📝 Generated member logo filename:', filename);
        cb(null, filename);
    }
});

// Configure multer storage for main member company logos
const mainMemberCompanyLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/memberCompanyLogos';
        console.log('📁 Creating company logo directory:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✨ Created new company logo directory');
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'company-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📝 Generated company logo filename:', filename);
        cb(null, filename);
    }
});

// Set up multer for main member logo uploads
const uploadMainMemberLogo = multer({
    storage: mainMemberLogoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('🔍 Validating member logo:', {
            originalName: file.originalname,
            mimetype: file.mimetype,
            isValid: extname && mimetype
        });

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Set up multer for main member company logo uploads
const uploadMainMemberCompanyLogo = multer({
    storage: mainMemberCompanyLogoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('🔍 Validating company logo:', {
            originalName: file.originalname,
            mimetype: file.mimetype,
            isValid: extname && mimetype
        });

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// First, set up the multer fields configuration for multiple files
const memberUploadFields = [
    { name: 'member_photo', maxCount: 1 },
    { name: 'member_company_logo', maxCount: 1 }
];

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
router.post("/chapters", uploadMainChapterLogo.single('chapter_logo'), addChapter);
router.get("/members", getMembers);
router.get("/members/:email", getMemberByEmail);
router.post("/members", memberUpload.fields([
    { name: 'member_photo', maxCount: 1 },
    { name: 'member_company_logo', maxCount: 1 }
]), addMember);
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
router.put("/updateChapter/:chapter_id", uploadMainChapterLogo.single('chapter_logo'), updateChapter);
router.put("/deleteChapter/:chapter_id", deleteChapter);
router.put("/updateMember/:member_id", 
    memberUpload.fields([
        { name: 'member_photo', maxCount: 1 },
        { name: 'member_company_logo', maxCount: 1 }
    ]),
    updateMember
);
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
router.put("/updateMemberSettings", 
    uploadMemberDocs.fields([
        { name: 'member_photo', maxCount: 1 },
        { name: 'member_aadhar', maxCount: 1 },
        { name: 'member_pan', maxCount: 1 },
        { name: 'member_gst_cert', maxCount: 1 }
    ]), 
    updateMemberSettings
);
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
router.get("/getCancelIrn", getCancelIrn);
router.get("/memberPendingKittyOpeningBalance", memberPendingKittyOpeningBalance);
router.get('/exportMemberWiseAccolades', exportMemberWiseAccolades);

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
    uploadMainChapterLogo.single('chapter_logo'), 
    updateChapterSettings
);
router.get('/getInterviewSheetQuestions',getInterviewSheetQuestions);
router.get('/getInterviewSheetAnswers',getInterviewSheetAnswers);
router.post('/addInterviewSheetAnswers', addInterviewSheetAnswers)
router.get("/getAllVisitors", getAllVisitors);
router.get("/getRequestedMemberRequisition", getRequestedMemberRequisition);
router.post("/add-invoice", createInvoice);
router.get("/getBankOrder", getBankOrder);
router.post("/getSpecificBankOrder", getSpecificBankOrder);
router.get("/getCurrentDate", getCurrentDate);
router.get("/getZones", getZones);
router.get("/getHotels", getHotels);
router.get("/getEoiForms", getEoiForms);
router.get("/getCommitmentSheet", getCommitmentSheet);
router.post("/addCommitmentSheet",insertCommitmentSheet);
router.get("/getInclusionSheet",getInclusionSheet);
router.post("/addInclusionSheet",addInclusionSheet);
router.post("/addEoiform",addEoiForm);
router.post("/member-requisition", addMemberRequisition);
router.get("/getRequestedChapterRequisition", getRequestedChapterRequisition);
router.post("/chapter-requisition", addChapterRequisition);


// Route to serve the uploaded files
router.get('/uploads/expenses/:filename', (req, res) => {
    console.log('🖼️ Requesting file:', req.params.filename);
    
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

// Route to serve chapter logos
router.get('/uploads/chapterLogos/:filename', (req, res) => {
    console.log('🖼️ Requesting chapter logo:', req.params.filename);
    
    const filePath = path.join(__dirname, 'uploads', 'chapterLogos', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ Logo file not found:', filePath);
        return res.status(404).json({ 
            message: 'Logo not found',
            requestedFile: req.params.filename
        });
    }
    
    console.log('✅ Serving logo file:', req.params.filename);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

// Routes to serve the images
router.get('/uploads/memberLogos/:filename', (req, res) => {
    console.log('🖼️ Requesting member logo:', req.params.filename);
    
    const filePath = path.join(__dirname, 'uploads', 'memberLogos', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ Member logo not found:', filePath);
        return res.status(404).json({ 
            message: 'Logo not found',
            requestedFile: req.params.filename
        });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

router.get('/uploads/memberCompanyLogos/:filename', (req, res) => {
    console.log('🖼️ Requesting company logo:', req.params.filename);
    
    const filePath = path.join(__dirname, 'uploads', 'memberCompanyLogos', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ Company logo not found:', filePath);
        return res.status(404).json({ 
            message: 'Logo not found',
            requestedFile: req.params.filename
        });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

// Add this with other multer configurations
const zoneLogoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/ZonesLogos';
        console.log('📁 Creating zone logo directory:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✨ Created new zone logo directory');
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'zone-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📝 Generated zone logo filename:', filename);
        cb(null, filename);
    }
});

const uploadZoneLogo = multer({
    storage: zoneLogoStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('🔍 Validating zone logo:', {
            originalName: file.originalname,
            mimetype: file.mimetype,
            isValid: extname && mimetype
        });

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Add this route with other routes
router.post("/addZone", uploadZoneLogo.single('zone_logo'), addZone);
router.post("/addHotel", addHotel);
router.put("/deleteHotel/:hotel_id", deleteHotel);
router.put("/updateHotel/:hotel_id", updateHotel);

// Add these routes with your other routes
router.get("/getZone/:zone_id", getZone);
router.put("/updateZone/:zone_id", uploadZoneLogo.single('zone_logo'), updateZone);
router.post("/addHotelToRegion", addHotelToRegion);
router.get('/export-members-excel', exportMembersExcel);
router.get('/export-members-csv', exportMembersCSV);
router.get("/memberApplicationFormNewMember", memberApplicationFormNewMember);

router.post("/addMemberApplication",addMemberApplication);

// Configure multer storage
const storagee = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads/bulk-upload')); // Ensure 'uploads/' directory exists
    },
    filename: (req, file, cb) => {
      cb(null, `members-${Date.now()}${path.extname(file.originalname)}`);
    }
  });
  
  const uploadd = multer({ storage: storagee });
  
  // CSV Import Route
  router.post('/import-members', uploadd.single('bulkUploadFile'), importMembersCSV);

// Route to render the email page
router.get("/send-mail", renderEmailPage);

// Route to send email
router.post("/send-mail", sendEmail);
router.get("/getMembershipPending", getMembershipPending);

// / Routes for serving the documents
router.get('/uploads/aadharCards/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'aadharCards', req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            message: 'Aadhar card not found',
            requestedFile: req.params.filename
        });
    }
    res.setHeader('Content-Type', getContentType(filePath));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

router.get('/uploads/panCards/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'panCards', req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            message: 'PAN card not found',
            requestedFile: req.params.filename
        });
    }
    res.setHeader('Content-Type', getContentType(filePath));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

router.get('/uploads/gstCertificates/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'gstCertificates', req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            message: 'GST certificate not found',
            requestedFile: req.params.filename
        });
    }
    res.setHeader('Content-Type', getContentType(filePath));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

router.put("/markTrainingCompleted",markTrainingCompleted);

// Add this with your other routes
router.put("/updateMemberApplicationDocs/:application_id", 
    uploadMemberDocs.fields([
        { name: 'aadhar_card_img', maxCount: 1 },
        { name: 'pan_card_img', maxCount: 1 },
        { name: 'gst_certificate', maxCount: 1 }
    ]), 
    updateMemberApplicationDocs
);


// Multer configuration for onboarding calls
const onboardingCallStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/onboardingCalls';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✨ Created new directory:', uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'onboarding-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📝 Generated filename:', filename);
        cb(null, filename);
    }
});

const uploadOnboardingCall = multer({
    storage: onboardingCallStorage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('🔍 Validating file:', {
            originalName: file.originalname,
            mimetype: file.mimetype,
            isValid: extname && mimetype
        });

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Add the route
router.put(
    '/updateOnboardingCall/:visitor_id',
    uploadOnboardingCall.single('onboarding_call_img'),
    updateOnboardingCall
);

// Route to serve onboarding call images
router.get('/uploads/onboardingCalls/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'onboardingCalls', req.params.filename);
    res.sendFile(filePath);
});

router.put("/updateChapterRequisition", updateChapterRequisition);
router.put("/updateMemberRequisition", updateMemberRequisition);

router.post("/send-visitor-email", sendVisitorEmail);
router.post("/send-vp-email", sendVPEmail);
router.put('/update-visitor', updateVisitor);
router.post("/sendTrainingMails", sendTrainingMails);

router.put("/updateVisitorAndEoi/:visitor_id", updateVisitorAndEoi);
router.put("/updateInterviewSheetAnswers/:visitor_id", updateInterviewSheetAnswers);
// New route for updating commitment sheet
router.put("/updateCommitmentSheet/:visitor_id", updateCommitmentSheet);
router.put("/updateInclusionSheet/:visitor_id", updateInclusionSheet);
router.post("/addVisitorPayment", addVisitorPayment);
router.post("/addKittyPaymentManually", addKittyPaymentManually);
router.get('/export-accolades', exportAccoladesToExcel);
router.post('/import-member-accolades', upload.single('file'), importMemberAccolades);
router.get("/getAllMemberAccolades", getAllMemberAccolades);
router.post("/sendInterviewSheetEmail", sendInterviewSheetEmail)
router.post("/sendFormSubmissionEmail", sendFormSubmissionEmail);



module.exports = router;