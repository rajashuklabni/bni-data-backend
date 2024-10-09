const { Client } = require('pg');
const express = require('express');
const xlsx = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const cors = require('cors');
const { request } = require('http');

const app = express();

const upload = multer({ dest: 'uploads/' });

app.use(express.json());

const allowedOrigins = [
    'https://bni-data-backend.onrender.com', // Your front-end URL
    'http://localhost:5173',
    'http://127.0.0.1:5500/',
    'http://127.0.0.1:5500',
    'https://bni-dashboard-backend.vercel.app/*',
    'https://bni-dashboard-backend.vercel.app',
    '*', // Add more allowed origins as needed
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // Allow the request
        } else {
            callback(new Error('Not allowed by CORS')); // Reject the request
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow credentials (cookies, authorization headers)
    optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};


// Use CORS with options
app.use(cors(corsOptions));

// Replace with your Render database credentials
const con = new Client({
    host: "dpg-cs0d2hi3esus739088bg-a.oregon-postgres.render.com",
    user: "bni_dashboard_backend_database_user",
    port: 5432,
    password: "8UGkmCixOpO5Gb89BSBI8aPPapoAW6fD",
    database: "bni_dashboard_backend_database",
    ssl: {
        rejectUnauthorized: false // Required for secure connections to Render
    }
});

con.connect()
  .then(() => console.log("Connected to Render PostgreSQL"))
  .catch(err => console.error("Connection error", err.stack));

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload.html')); // Serves the HTML form
});

function excelDateToJSDate(excelDate) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
}

function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}

app.post('/import-members', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const membersData = xlsx.utils.sheet_to_json(worksheet);
        
        for (const member of membersData) {
            const memberDateOfBirth = typeof member.member_date_of_birth === 'number' 
                ? excelDateToJSDate(member.member_date_of_birth) 
                : member.member_date_of_birth ? new Date(member.member_date_of_birth) : null;

            const memberInductionDate = typeof member.member_induction_date === 'number' 
                ? excelDateToJSDate(member.member_induction_date) 
                : member.member_induction_date ? new Date(member.member_induction_date) : null;

            const memberRenewalDate = typeof member.member_renewal_date === 'number' 
                ? excelDateToJSDate(member.member_renewal_date) 
                : member.member_renewal_date ? new Date(member.member_renewal_date) : null;

            const memberRenewalDueDate = typeof member.member_renewal_due_date === 'number' 
                ? excelDateToJSDate(member.member_renewal_due_date) 
                : member.member_renewal_due_date ? new Date(member.member_renewal_due_date) : null;

            const memberLastRenewalDate = typeof member.member_last_renewal_date === 'number' 
                ? excelDateToJSDate(member.member_last_renewal_date) 
                : member.member_last_renewal_date ? new Date(member.member_last_renewal_date) : null;

            // Ensure that if the date is null, it won't call toISOString
            const formattedMemberDateOfBirth = memberDateOfBirth && isValidDate(memberDateOfBirth) ? memberDateOfBirth.toISOString().split('T')[0] : null;
            const formattedMemberInductionDate = memberInductionDate && isValidDate(memberInductionDate) ? memberInductionDate.toISOString().split('T')[0] : null;
            const formattedMemberRenewalDate = memberRenewalDate && isValidDate(memberRenewalDate) ? memberRenewalDate.toISOString().split('T')[0] : null;
            const formattedMemberRenewalDueDate = memberRenewalDueDate && isValidDate(memberRenewalDueDate) ? memberRenewalDueDate.toISOString().split('T')[0] : null;
            const formattedMemberLastRenewalDate = memberLastRenewalDate && isValidDate(memberLastRenewalDate) ? memberLastRenewalDate.toISOString().split('T')[0] : null;
        
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
                member.member_first_name, member.member_last_name, formattedMemberDateOfBirth,
                member.member_phone_number, member.member_alternate_mobile_number, member.member_email_address, member.member_address, member.address_pincode,
                member.address_city, member.address_state, member.region_id, member.chapter_id, member.accolades_id, member.category_id, 
                formattedMemberInductionDate, member.member_category, member.member_current_membership,
                formattedMemberRenewalDate, formattedMemberRenewalDueDate, formattedMemberLastRenewalDate,
                member.member_gst_number, member.member_company_name, member.member_company_address, 
                member.member_company_state, member.member_company_city, member.member_photo,
                member.member_website, member.member_company_logo, member.member_status
            ];

            await con.query(query, values);
        }

        fs.unlinkSync(filePath);
        
        res.send('Data imported successfully');

    } catch (error) {
        console.error("Error importing data:", error);
        res.status(500).send("Error importing data");
    }
});

app.use('/api', routes);
app.get('/', (req, res)=>{
    res.send("Server is running.")
})
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
