const multer = require("multer");
const path = require("path");
const fs = require("fs"); // To check and create directories if they don't exist

// Ensure the 'uploads/expenses' directory exists
const expenseFolder = path.join(__dirname, "../uploads/expenses");
if (!fs.existsSync(expenseFolder)) {
  fs.mkdirSync(expenseFolder, { recursive: true }); // Create the directory recursively if it doesn't exist
}

// Configure multer for image and PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, expenseFolder); // Path to the expense folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// Define allowed file types (images and PDFs)
const allowedTypes = [
  "image/jpeg", "image/png", "image/jpg", // Image types
  "application/pdf", // PDF type
];

// Filter for allowed file types
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log("File MIME Type:", file.mimetype); // Log MIME type for debugging
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, png) and PDFs are allowed.")); // Error if the file type is not allowed
    }
  },
});

module.exports = upload;
