const { Client } = require("pg");
const express = require("express");
const xlsx = require("xlsx");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const routes = require("./routes");
const cors = require("cors");
const { request } = require("http");
const dotEnv = require("dotenv");
const jwt = require("jsonwebtoken");
dotEnv.config();

const app = express();
const ccavService = require("./ccavenueService.js");

// Enable CORS
app.use(cors());

// Body parser middleware - must be before multer
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.raw({ type: "application/json" }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Basic multer configuration for temporary use
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

const allowedOrigins = [
  "https://bni-data-backend.onrender.com", // Your front-end URL
  "http://localhost:5173",
  "http://localhost:5173/",
  "http://localhost:3000/",
  "http://localhost:3000",
  "https://bninewdelhi.com/",
  "https://bninewdelhi.com",
  "http://bninewdelhi.com/",
  "https://www.bninewdelhi.com/",
  "https://www.bninewdelhi.com",
  "http://www.bninewdelhi.com/",
  "http://dashboard.bninewdelhi.com",
  "http://dashboard.bninewdelhi.com/",
  "https://dashboard.bninewdelhi.com",
  "https://dashboard.bninewdelhi.com/",
  "https://54.39.51.161:3000",
  "http://54.39.51.161:3000",
  "backend.bninewdelhi.com/",
  "https://backend.bninewdelhi.com",
  "http://backend.bninewdelhi.com/",
  "https://backend.bninewdelhi.com",
  "http://localhost:5000"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error("Not allowed by CORS")); // Reject the request
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow credentials (cookies, authorization headers)
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};

// Use CORS with options
app.use(cors(corsOptions));

// Replace with your Render database credentials
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

con
  .connect()
  .then(() => console.log("Connected to new BNI server PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "upload.html")); // Serves the HTML form
});

app.get("/uploadMemberAccolades", (req, res) => {
  res.sendFile(path.join(__dirname, "uploadAccolades.html")); // Serves the HTML form
});

const elvoiceRoutes = require("./allRoutes/eInvoiceRoutes");
app.use("/einvoice", elvoiceRoutes);

function excelDateToJSDate(excelDate) {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}

app.post("/import-members", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const membersData = xlsx.utils.sheet_to_json(worksheet);

    for (const member of membersData) {
      const memberDateOfBirth =
        typeof member.member_date_of_birth === "number"
          ? excelDateToJSDate(member.member_date_of_birth)
          : member.member_date_of_birth
          ? new Date(member.member_date_of_birth)
          : null;

      const memberInductionDate =
        typeof member.member_induction_date === "number"
          ? excelDateToJSDate(member.member_induction_date)
          : member.member_induction_date
          ? new Date(member.member_induction_date)
          : null;

      const memberRenewalDate =
        typeof member.member_renewal_date === "number"
          ? excelDateToJSDate(member.member_renewal_date)
          : member.member_renewal_date
          ? new Date(member.member_renewal_date)
          : null;

      const memberRenewalDueDate =
        typeof member.member_renewal_due_date === "number"
          ? excelDateToJSDate(member.member_renewal_due_date)
          : member.member_renewal_due_date
          ? new Date(member.member_renewal_due_date)
          : null;

      const memberLastRenewalDate =
        typeof member.member_last_renewal_date === "number"
          ? excelDateToJSDate(member.member_last_renewal_date)
          : member.member_last_renewal_date
          ? new Date(member.member_last_renewal_date)
          : null;

      // Ensure that if the date is null, it won't call toISOString
      const formattedMemberDateOfBirth =
        memberDateOfBirth && isValidDate(memberDateOfBirth)
          ? memberDateOfBirth.toISOString().split("T")[0]
          : null;
      const formattedMemberInductionDate =
        memberInductionDate && isValidDate(memberInductionDate)
          ? memberInductionDate.toISOString().split("T")[0]
          : null;
      const formattedMemberRenewalDate =
        memberRenewalDate && isValidDate(memberRenewalDate)
          ? memberRenewalDate.toISOString().split("T")[0]
          : null;
      const formattedMemberRenewalDueDate =
        memberRenewalDueDate && isValidDate(memberRenewalDueDate)
          ? memberRenewalDueDate.toISOString().split("T")[0]
          : null;
      const formattedMemberLastRenewalDate =
        memberLastRenewalDate && isValidDate(memberLastRenewalDate)
          ? memberLastRenewalDate.toISOString().split("T")[0]
          : null;

      const query = `
                INSERT INTO member (
                    member_first_name, member_last_name, member_date_of_birth,
                    member_phone_number, member_alternate_mobile_number, member_email_address, member_address, address_pincode,
                    address_city, address_state, region_id, chapter_id, accolades_id, category_id, member_induction_date,
                    member_category, member_current_membership, member_renewal_date, member_renewal_due_date, member_last_renewal_date,
                    member_gst_number, member_company_name, member_company_address, member_company_state, member_company_city, member_photo,
                    member_website, member_company_logo, member_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
            `;

      const values = [
        member.member_first_name,
        member.member_last_name,
        formattedMemberDateOfBirth,
        member.member_phone_number,
        member.member_alternate_mobile_number,
        member.member_email_address,
        member.member_address,
        member.address_pincode,
        member.address_city,
        member.address_state,
        member.region_id,
        member.chapter_id,
        member.accolades_id,
        member.category_id,
        formattedMemberInductionDate,
        member.member_category,
        member.member_current_membership,
        formattedMemberRenewalDate,
        formattedMemberRenewalDueDate,
        formattedMemberLastRenewalDate,
        member.member_gst_number,
        member.member_company_name,
        member.member_company_address,
        member.member_company_state,
        member.member_company_city,
        member.member_photo,
        member.member_website,
        member.member_company_logo,
        member.member_status,
      ];

      await con.query(query, values);
    }

    fs.unlinkSync(filePath);

    res.send("Data imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
    res.status(500).send("Error importing data");
  }
});

const paymentRoutes = require("./allRoutes/paymentRoute");
app.use("/api", paymentRoutes);

// Routes for Auth and Payment
const authRoutes = require("./allRoutes/authRoutes/authRoutes");
app.use("/api", authRoutes);
app.use("/api", routes);
app.get("/", (req, res) => {
  res.send("Server is running.");
});
app.post("/generate-cashfree-session", async (req, res) => {
  const headers = {
    "x-client-id": process.env.x_client_id, // Replace with your client ID
    "x-client-secret": process.env.x_client_secret, // Replace with your client secret
    "x-api-version": process.env.x_api_version,
    // Include the headers for form data
  };

  const data = req.body;
  try {
    console.log(data);
    const res = await axios.post(
      "https://production.cashfree.com/pg/orders",
      data,
      { headers }
    );
    console.log(res.data);
    res.status(201).json(res.data); // Handle the response data
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }

  res.send("Server is running.");
});

// Middleware for token verification
const verifyToken = (req, res, next) => {
  // Get token from Authorization header (Bearer token)
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    // Verify token using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// Public routes (no token needed)
app.use("/api", authRoutes); // Login and OTP verification routes

// Protected routes (token required)
app.use("/api", verifyToken, paymentRoutes);
app.use("/api", verifyToken, routes);

// Add this with other route imports
const ccavenueRoutes = require("./allRoutes/ccavenueRoute");

// Add this with other route uses
app.use("/api", ccavenueRoutes);

// --------------------------------------------------------------------------------
// app.use(express.static('public'));
// app.set('views', __dirname + '/public');
// app.engine('html', require('ejs').renderFile);

// app.get('/about', function (req, res) {
//   res.sendFile(path.join(__dirname, 'public', 'dataFrom.html'));
// });

// app.post('/ccavRequestHandler', function (request, response){
//   console.log("cc avenue trigger");
// ccavReqHandler.postReq(request, response);
// });


// app.post('/ccavResponseHandler', function (request, response){
//     ccavResHandler.postRes(request, response);
// });

app.get("/api/encrypt", (req, res) => {
  console.log("runnnnn......");
  const { payload } = req.query;
  const data = JSON.parse(payload); // Parse the payload to get the order details

  const encryptedData = ccavService.encrypt(data);
  if (encryptedData) {
    res.status(200).json({
      data: encryptedData,
      status: "SUCCESS",
    });
  } else {
    res.status(400).json({
      data: null,
      status: "FAILURE",
    });
  }
});

app.post("/api/handle-response", (req, res) => {
  const { encResp } = req.body;
  const paymentStatus = ccavService.decrypt(encResp).responceCode;

  if (paymentStatus === "Success") {
    res.redirect("/api/payment-success");
  } else {
    res.redirect("/api/payment-failure");
  }
});
app.get("/api/payment-success", (req, res) => {
  res.send("YAY!! Payment Successful...");
});

app.get("/api/payment-failure", (req, res) => {
  res.send("OOPS! Payment Failed...");
});

// Update the protected routes section
// Protected routes (token required)
app.use("/api", verifyToken, paymentRoutes);
app.use("/api", verifyToken, ccavenueRoutes);
app.use("/api", verifyToken, routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      code: err.code,
      field: err.field
    });
  }
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
