const { Client } = require("pg");
const xlsx = require("xlsx");
// const fetch = require('node-fetch'); 
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer"); // Ensure you have nodemailer installed
const QRCode = require("qrcode"); // Import the qrcode library
const PDFDocument = require("pdfkit");
const { QueryTypes } = require("sequelize"); // If using Sequelize
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const dotEnv = require("dotenv");
const multer = require('multer');
const csv = require('csv-parser');
const format = require('pg-format'); // Import pg-format for PostgreSQL queries
const puppeteer = require('puppeteer');
dotEnv.config();

const axios = require('axios');




// Instead of this:
// const fetch = require('node-fetch');

// Use this:
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

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

con.connect().then(() => console.log("Connected to new BNI server PostgreSQL"));


const transporter = nodemailer.createTransport({
  host: "server.bninewdelhi.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@bninewdelhi.in",
    pass: "PzfE8JH93pV1RUx",
  },
});

// Render the email page
const renderEmailPage = (req, res) => {
  res.send(`
    <h2>Send Email</h2>
    <form action="/api/send-mail" method="POST">
      <input type="email" name="email" placeholder="Enter email" required />
      <button type="submit">Send Mail</button>
    </form>
  `);
};

// Handle sending the email
const sendEmail = (req, res) => {
  const { email } = req.body;

  const mailOptions = {
    from: "info@bninewdelhi.in",
    to: email,
    subject: "Test Email",
    text: "This is a test email from our application.",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.send(`Error sending email: ${error.message}`);
    }
    res.send(`Email sent successfully to ${email}`);
  });
};

// Backend: Adjusted to filter based on query parameter
const getRegions = async (req, res) => {
  try {
    const { filter } = req.query; // Get filter from query string (e.g., filter=deleted)

    let query = "SELECT * FROM region WHERE delete_status = 0"; // Default query (non-deleted regions)
    if (filter === "deleted") {
      query = "SELECT * FROM region WHERE delete_status = 1"; // Query for deleted regions
    } else if (filter === "inactive") {
      query =
        "SELECT * FROM region WHERE region_status = 'inactive' AND delete_status = 0";
    } else if (filter === "active") {
      query =
        "SELECT * FROM region WHERE region_status = 'active' AND delete_status = 0";
    }

    const result = await con.query(query); // Execute the query
    res.json(result.rows); // Return filtered data
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).send("Error fetching regions");
  }
};

const getMember = async (req, res) => {
  const { member_id } = req.params;
  console.log('🔍 Fetching member with ID:', member_id);

  try {
      const result = await con.query(
          "SELECT * FROM member WHERE member_id = $1",
          [member_id]
      );

      if (result.rows.length === 0) {
          console.log('❌ Member not found for ID:', member_id);
          return res.status(404).json({ message: "Member not found" });
      }

      // Get the member data
      const member = result.rows[0];
      console.log('📄 Raw member data:', member);

      // Transform the member data and add image URLs
      const transformedMember = {
          ...member,
          // Add image URLs if images exist
          member_photo_url: member.member_photo 
              ? `http://localhost:5000/api/uploads/memberLogos/${member.member_photo}`
              : null,
          member_company_logo_url: member.member_company_logo 
              ? `http://localhost:5000/api/uploads/memberCompanyLogos/${member.member_company_logo}`
              : null,
          // Parse arrays that might be stored as strings
          accolades_id: Array.isArray(member.accolades_id)
              ? member.accolades_id
              : typeof member.accolades_id === 'string'
                  ? member.accolades_id.replace(/[{}]/g, '').split(',').map(id => parseInt(id.trim()))
                  : []
      };

      console.log('✅ Processed member data:', {
          id: transformedMember.member_id,
          name: `${transformedMember.member_first_name} ${transformedMember.member_last_name}`,
          photo: transformedMember.member_photo_url,
          companyLogo: transformedMember.member_company_logo_url,
          accolades: transformedMember.accolades_id
      });

      res.json(transformedMember);

  } catch (error) {
      console.error('❌ Error fetching member:', error);
      res.status(500).json({
          message: "Error fetching member",
          error: error.message
      });
  }
};

const getChapter = async (req, res) => {
    const { chapter_id } = req.params;
    console.log('🔍 Fetching chapter:', chapter_id);

    try {
        const result = await con.query(
            "SELECT * FROM chapter WHERE chapter_id = $1",
            [chapter_id]
        );

        if (result.rows.length === 0) {
            console.log('⚠️ Chapter not found:', chapter_id);
            return res.status(404).json({ message: "Chapter not found" });
        }

        // Add image URL to response
        const chapterData = result.rows[0];
        if (chapterData.chapter_logo) {
            chapterData.chapter_logo_url = `http://localhost:5000/api/uploads/chapterLogos/${chapterData.chapter_logo}`;
            console.log('🖼️ Added logo URL:', chapterData.chapter_logo_url);
        }

        console.log('✅ Found chapter:', chapterData);
        res.json(chapterData);

    } catch (error) {
        console.error('❌ Error fetching chapter:', error);
        res.status(500).json({
            message: "Error fetching chapter",
            error: error.message
        });
    }
};

const getUniversalLink = async (req, res) => {
  const { id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM universal_link WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Universal Link not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Universal Link:", error);
    res.status(500).send("Error fetching Universal Link");
  }
};

const getRegion = async (req, res) => {
    const { region_id } = req.params;
    console.log('🔍 Fetching region with ID:', region_id);

    try {
        const result = await con.query(
            "SELECT * FROM region WHERE region_id = $1",
            [region_id]
        );

        if (result.rows.length === 0) {
            console.log('❌ Region not found for ID:', region_id);
            return res.status(404).json({ message: "Region not found" });
        }

        // Get the region data
        const region = result.rows[0];
        console.log('📄 Raw region data:', region);

        // Transform the logo data
        let logoUrl = null;
        if (region.region_logo && region.region_logo !== '{}' && region.region_logo !== 'null') {
            logoUrl = `http://localhost:5000/api/uploads/regionLogos/${region.region_logo}`;
            console.log('🖼️ Constructed logo URL:', logoUrl);
        }

        // Prepare the response
       // ... existing code ...
const response = {
  ...region,
  region_logo_url: logoUrl,
  // Parse the arrays and objects that are stored as strings
  chapter_status: Array.isArray(region.chapter_status) 
      ? region.chapter_status 
      : typeof region.chapter_status === 'string'
          ? region.chapter_status.replace(/[{}]/g, '').split(',').map(s => s.trim())
          : [],
  chapter_type: Array.isArray(region.chapter_type) 
      ? region.chapter_type 
      : typeof region.chapter_type === 'string'
          ? JSON.parse(region.chapter_type)
          : [],
  days_of_chapter: Array.isArray(region.days_of_chapter) 
      ? region.days_of_chapter 
      : typeof region.days_of_chapter === 'string'
          ? JSON.parse(region.days_of_chapter)
          : [],
  accolades_config: Array.isArray(region.accolades_config) 
      ? region.accolades_config 
      : typeof region.accolades_config === 'string'
          ? JSON.parse(region.accolades_config)
          : []
};
// ... existing code ...

        console.log('✅ Processed region data:', response);
        res.json(response);

    } catch (error) {
        console.error("❌ Error fetching Region:", error);
        res.status(500).json({
            message: "Error fetching Region",
            error: error.message
        });
    }
};

const getAccolade = async (req, res) => {
  const { accolade_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM accolades WHERE accolade_id = $1",
      [accolade_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Accolade not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Accolade:", error);
    res.status(500).send("Error fetching Accolade");
  }
};

const getEinvoice = async (req, res) => {
  const { order_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM einvoice WHERE order_id = $1",
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "E-Invoice not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching E-Invoice:", error);
    res.status(500).send("Error fetching E-Invoice");
  }
};

// ... existing code ...

const addRegion = async (req, res) => {
  try {
    console.log('📝 Starting region addition process...');
    console.log('📦 Received request body:', req.body);
    console.log('🖼️ Received file:', req.file);

    const {
      region_name,
      contact_person,
      contact_number,
      email_id,
      chapterDays,
      chapterStatus,
      chapterType,
      accolades_config,
      hotels_config,  // Add this line to destructure hotels_config
      region_status,
      mission,
      vision,
      one_time_registration_fee,
      one_year_fee,
      two_year_fee,
      five_year_fee,
      late_fees,
      country,
      state,
      city,
      street_address_line_1,
      street_address_line_2,
      social_facebook,
      social_instagram,
      social_linkedin,
      social_youtube,
      website_link,
      region_launched_by,
      date_of_publishing,
      postal_code,
    } = req.body;

    // Handle the logo file
    const region_logo = req.file ? req.file.filename : null;
    console.log('🎨 Region logo filename:', region_logo);

    // Parse arrays if they're strings
    const parseArray = (value) => {
      if (Array.isArray(value)) return value;
      try {
        return typeof value === 'string' ? JSON.parse(value) : [];
      } catch {
        console.log('⚠️ Error parsing array:', value);
        return [];
      }
    };

    const chapterDaysArray = parseArray(chapterDays);
    const chapterStatusArray = parseArray(chapterStatus);
    const chapterTypeArray = parseArray(chapterType);
    const accoladesArray = parseArray(accolades_config);
    const hotelsArray = parseArray(hotels_config);  // Parse hotels array

    console.log('📅 Processed arrays:', {
      days: chapterDaysArray,
      status: chapterStatusArray,
      type: chapterTypeArray,
      accolades: accoladesArray,
      hotels: hotelsArray  || null // Log hotels array
    });

    const result = await con.query(
      `INSERT INTO region (
          region_name, contact_person, contact_number, email_id, days_of_chapter, region_status,
          accolades_config, chapter_status, chapter_type, mission, vision, region_logo, 
          one_time_registration_fee, one_year_fee, two_year_fee, five_year_fee, late_fees, 
          country, state, city, street_address_line_1, street_address_line_2, social_facebook, 
          social_instagram, social_linkedin, social_youtube, website_link, region_launched_by, 
          date_of_publishing, postal_code, hotel_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        ) RETURNING *`,
      [
        region_name,
        contact_person,
        contact_number,
        email_id,
        `{${chapterDaysArray.join(",")}}`,
        region_status,
        `{${accoladesArray.join(",")}}`,
        `{${chapterStatusArray.join(",")}}`,
        `{${chapterTypeArray.join(",")}}`,
        mission,
        vision,
        region_logo,
        one_time_registration_fee,
        one_year_fee,
        two_year_fee,
        five_year_fee,
        late_fees,
        country,
        state,
        city,
        street_address_line_1,
        street_address_line_2,
        social_facebook,
        social_instagram,
        social_linkedin,
        social_youtube,
        website_link,
        region_launched_by,
        date_of_publishing,
        postal_code,
        `{${hotelsArray.join(",")}}`,  // Add hotels array to the query
      ]
    );

    console.log('✅ Region added successfully to database');
    console.log('📄 Database result:', result.rows[0]);
    console.log('🏨 Saved hotel IDs:', result.rows[0].hotel_id);

    res.status(201).json({ 
      message: "Region added successfully!", 
      data: {
        ...result.rows[0],
        region_logo_url: region_logo ? `http://localhost:5000/uploads/regionLogos/${region_logo}` : null
      }
    });
  } catch (error) {
    console.error("❌ Error adding region:", error);
    console.error("Error details:", error.message);
    res.status(500).json({
      message: "Error adding region",
      error: error.message
    });
  }
};

const addChapter = async (req, res) => {
  console.log('\n🏢 Starting Chapter Addition Process');
  console.log('==================================');
  
  const {
      region_id,
      chapter_name,
      chapter_status,
      chapter_membership_fee,
      chapter_kitty_fees,
      chapter_visitor_fees,
      chapter_meeting_day,
      one_time_registration_fee,
      chapter_type,
      eoi_link,
      member_app_link,
      chapter_membership_fee_two_year,
      chapter_membership_fee_five_year,
      contact_number,
      contact_person,
      chapter_mission,
      chapter_vision,
      email_id,
      country,
      state,
      city,
      street_address_line,
      postal_code,
      chapter_facebook,
      chapter_instagram,
      chapter_linkedin,
      chapter_youtube,
      chapter_website,
      date_of_publishing,
      chapter_launched_by,
      chapter_location_note,
      chapter_late_fees,
      chapter_available_fund,
      billing_frequency,
      hotel_id,
      president_email,
      vice_president_email,
      treasurer_email
  } = req.body;

  // Convert hotel_id to number if it's an array
  let processedHotelId = Array.isArray(hotel_id) ? parseInt(hotel_id[0]) : parseInt(hotel_id);
  processedHotelId = isNaN(processedHotelId) ? null : processedHotelId;
  console.log('\n🏨 Hotel ID Processing:');
  console.log('---------------------');
  console.log('Original Hotel ID:', hotel_id);
  console.log('Processed Hotel ID:', processedHotelId);
  console.log('Final Hotel ID Type:', typeof processedHotelId);

  // Rest of your existing code...
  const logoFilename = req.file ? req.file.filename : null;

  try {
      const checkDuplicate = await con.query(
          `SELECT * FROM chapter WHERE chapter_name = $1`,
          [chapter_name]
      );

      if (checkDuplicate.rows.length > 0) {
          console.log('⚠️ Duplicate chapter name found');
          return res.status(409).json({
              message: "Chapter name already exists",
          });
      }

      const result = await con.query(
          `INSERT INTO chapter (
              region_id, chapter_name, chapter_logo, chapter_status, chapter_membership_fee,
              chapter_kitty_fees, chapter_visitor_fees, chapter_meeting_day, one_time_registration_fee,
              chapter_type, eoi_link, member_app_link,
              chapter_membership_fee_two_year, chapter_membership_fee_five_year, contact_number,
              contact_person, chapter_mission, chapter_vision, email_id, country, state, city,
              street_address_line, postal_code, chapter_facebook, chapter_instagram,
              chapter_linkedin, chapter_youtube, chapter_website, date_of_publishing,
              chapter_launched_by, chapter_location_note, chapter_late_fees, available_fund, kitty_billing_frequency,
              hotel_id, vice_president_mail, president_mail, treasurer_mail
          ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15, $16,
              $17, $18, $19, $20, $21, $22, $23,
              $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37, $38, $39
          ) RETURNING *`,
          [
              region_id,
              chapter_name,
              logoFilename,
              chapter_status,
              chapter_membership_fee,
              chapter_kitty_fees,
              chapter_visitor_fees,
              chapter_meeting_day,
              one_time_registration_fee,
              chapter_type,
              eoi_link,
              member_app_link,
              chapter_membership_fee_two_year,
              chapter_membership_fee_five_year,
              contact_number,
              contact_person,
              chapter_mission,
              chapter_vision,
              email_id,
              country,
              state,
              city,
              street_address_line,
              postal_code,
              chapter_facebook,
              chapter_instagram,
              chapter_linkedin,
              chapter_youtube,
              chapter_website,
              date_of_publishing,
              chapter_launched_by,
              chapter_location_note,
              chapter_late_fees,
              chapter_available_fund,
              billing_frequency,
              processedHotelId,
              vice_president_email,
              president_email,
              treasurer_email

          ]
      );

      // Rest of your code remains the same...
      const chapterData = result.rows[0];
      if (chapterData.chapter_logo) {
          chapterData.chapter_logo_url = `http://localhost:5000/api/uploads/chapterLogos/${chapterData.chapter_logo}`;
      }

      console.log('\n✅ Chapter Creation Success:');
      console.log('-------------------------');
      console.log('Chapter ID:', chapterData.chapter_id);
      console.log('Chapter Name:', chapterData.chapter_name);
      console.log('Final Hotel ID:', chapterData.hotel_id);

      res.status(201).json({ 
          message: "Chapter added successfully!", 
          data: chapterData 
      });

  } catch (error) {
      console.error('\n❌ Error Adding Chapter:');
      console.error('---------------------');
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      res.status(500).json({
          message: "Error adding chapter",
          error: error.message
      });
  }
};


const addMember = async (req, res) => {
  console.log('📥 Starting add member process');
  console.log('📦 Request body:', req.body);
  console.log('📸 Files received:', req.files);
  
  try {
      // Validate required integer fields
      const requiredIntegerFields = {
          'region_id': req.body.region_id,
          'chapter_id': req.body.chapter_id,
      };

      // Check for empty or invalid integer values
      for (const [field, value] of Object.entries(requiredIntegerFields)) {
          if (!value || value === '') {
              return res.status(400).json({
                  message: `${field} is required and must be a valid integer`,
                  field: field
              });
          }
      }

       // Validate category_name is present
       if (!req.body.category_name) {
        return res.status(400).json({
            message: "category_name is required",
            field: "category_name"
        });
    }

      // Parse accolades_id and convert to PostgreSQL array format
      let parsedAccolades;
      try {
          const accoladesArray = JSON.parse(req.body.accolades_id);
          console.log('🏆 Parsed accolades:', accoladesArray);
          parsedAccolades = `{${accoladesArray.join(',')}}`;
      } catch (error) {
          console.error('❌ Error parsing accolades:', error);
          parsedAccolades = '{}';
      }

      // Get filenames from uploaded files
      const memberPhotoFilename = req.files?.['member_photo']?.[0]?.filename || null;
      const companyLogoFilename = req.files?.['member_company_logo']?.[0]?.filename || null;

      const result = await con.query(
          `INSERT INTO member (
              member_first_name, member_last_name, member_date_of_birth, member_phone_number,
              member_alternate_mobile_number, member_email_address, address_pincode,
              address_city, address_state, region_id, chapter_id, accolades_id, category_name,
              member_induction_date, member_current_membership, member_renewal_date, member_gst_number,
              member_company_name, member_company_address, member_company_state, member_company_city,
              member_photo, member_website, member_company_logo,
              member_facebook, member_instagram, member_linkedin, member_youtube, country,
              street_address_line_1, street_address_line_2, gender, notification_consent,
              date_of_publishing, member_sponsored_by, member_status, meeting_opening_balance,
              member_company_pincode
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                   $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 
            $33, $34, $35, $36, $37, $38
        )
          RETURNING *`,
          [
              req.body.member_first_name,
              req.body.member_last_name,
              req.body.member_date_of_birth,
              req.body.member_phone_number,
              req.body.member_alternate_mobile_number,
              req.body.member_email_address,
              req.body.address_pincode,
              req.body.address_city,
              req.body.address_state,
            parseInt(req.body.region_id) || null,
            parseInt(req.body.chapter_id) || null,
              parsedAccolades,
            req.body.category_name,
              req.body.member_induction_date,
              req.body.member_current_membership,
              req.body.member_renewal_date,
              req.body.member_gst_number,
              req.body.member_company_name,
              req.body.member_company_address,
              req.body.member_company_state,
              req.body.member_company_city,
              memberPhotoFilename,
              req.body.member_website,
              companyLogoFilename,
              req.body.member_facebook,
              req.body.member_instagram,
              req.body.member_linkedin,
              req.body.member_youtube,
              req.body.country,
              req.body.street_address_line_1,
              req.body.street_address_line_2,
              req.body.gender,
              req.body.notification_consent,
              req.body.date_of_publishing,
              req.body.member_sponsored_by,
              req.body.member_status,
              parseFloat(req.body.meeting_opening_balance) || 0,
              req.body.member_company_pincode
          ]
      );

    // ✅ Member inserted
      const newMember = result.rows[0];
      const member_id = newMember.member_id;

    // ✅ Declare meeting_opening_balance properly
      const meeting_opening_balance = parseFloat(req.body.meeting_opening_balance) || 0;
    
    // 1. Fetch Kitty Bills
    const chapterId = parseInt(req.body.chapter_id);
    const dateOfPublishing = new Date(req.body.date_of_publishing);
    
    const kittyBillsResponse = await axios.get('http://localhost:5000/api/getAllKittyPayments');
    const allKittyBills = kittyBillsResponse.data;
    
    const chapterKittyBills = allKittyBills.filter(bill => bill.chapter_id === chapterId && bill.delete_status === 0);
    
    // 2. Fetch chapter meeting day
    const chaptersResponse = await axios.get('http://localhost:5000/api/chapters');
    const chapterInfo = chaptersResponse.data.find(ch => ch.chapter_id === chapterId);
    
    if (!chapterInfo) {
        throw new Error('Chapter not found for meeting day');
    }
    const chapterMeetingDay = chapterInfo.chapter_meeting_day;
    const chapterMeetingFees = chapterInfo.chapter_kitty_fees;
    
    // 🔥 Helper Function to calculate Meeting Dates
    function getMeetingDatesInRange(startDate, endDate, meetingDay) {
        const daysOfWeek = {
            Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
            Thursday: 4, Friday: 5, Saturday: 6
        };
        const meetingDates = [];
        const meetingDayNum = daysOfWeek[meetingDay];
    
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
    
        while (current.getDay() !== meetingDayNum) {
            current.setDate(current.getDate() + 1);
        }
    
        while (current <= endDate) {
            meetingDates.push(new Date(current));
            current.setDate(current.getDate() + 7);
        }
        return meetingDates;
    }
    
    // 3. Calculate Kitty Amount
    let totalKittyAmount = 0;
    let kittyDueDate = null;
    let kittyPenalty = null;
    
    for (const bill of chapterKittyBills) {
        const billStartDate = bill.raised_on ? new Date(bill.raised_on) : new Date(bill.payment_date);
        const billEndDate = new Date(bill.kitty_due_date);
    
        if (dateOfPublishing > billEndDate) {
            continue; // Ignore past bills
        }
    
        // Capture kittyDueDate and kittyPenalty from the first eligible bill
        if (!kittyDueDate && bill.kitty_due_date) {
            kittyDueDate = bill.kitty_due_date;
            kittyPenalty = bill.penalty_fee || 0;
        }
    
        if (['weekly', 'monthly', 'quartely'].includes(bill.bill_type)) {
            const meetingDates = getMeetingDatesInRange(
                dateOfPublishing > billStartDate ? dateOfPublishing : billStartDate,
                billEndDate,
                chapterMeetingDay
            );
            totalKittyAmount += meetingDates.length * parseFloat(chapterMeetingFees);
        }
    }
    
    // If somehow not found, fallback
    if (!kittyDueDate) kittyDueDate = new Date(); // default to now
    if (kittyPenalty === null || kittyPenalty === undefined) kittyPenalty = 0;
    
    // 4. Update bankorder amount_to_pay
    const finalAmountToPay = meeting_opening_balance + totalKittyAmount;
      
      await con.query(
        `INSERT INTO bankorder (amount_to_pay, member_id, chapter_id, kitty_due_date, kitty_penalty)
         VALUES ($1, $2, $3, $4, $5)`,
        [finalAmountToPay, member_id, chapterId, kittyDueDate, kittyPenalty]
    );
    
    console.log('✅ Updated bankorder with Kitty Amount:', finalAmountToPay);
    




      console.log('✅ Member added successfully:', newMember);

      res.status(201).json({
          message: "Member added successfully!",
          data: {
              ...newMember,
              member_photo_url: memberPhotoFilename ? `/uploads/memberPhotos/${memberPhotoFilename}` : null,
              member_company_logo_url: companyLogoFilename ? `/uploads/memberCompanyLogos/${companyLogoFilename}` : null
          }
      });

  } catch (error) {
      console.error('❌ Error adding member:', error);
      res.status(500).json({ 
          message: "Error adding member", 
          error: error.message 
      });
  }
};

const getBankOrder = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM bankorder");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching bank order:", error);
    res.status(500).send("Error fetching bank order");
  }
};

const getChapters = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM chapter WHERE delete_status = 0 ORDER BY chapter_name ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).send("Error fetching chapters");
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM users where is_active = 'true' "
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching users");
  }
};

const getLoginOtps = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM otp_verification ");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching otp code:", error);
    res.status(500).send("Error fetching otp code");
  }
};

const getLoginLogs = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM login_logs ");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching login logs:", error);
    res.status(500).send("Error fetching login logs");
  }
};

// Fetch all active members
const getMembers = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM member WHERE delete_status = 0"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).send("Error fetching members");
  }
};

// Fetch all active members
const getAccolades = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM accolades WHERE delete_status = 0"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching accolades:", error);
    res.status(500).send("Error fetching accolades");
  }
};

// Fetch all active members
const getMemberCategory = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM category");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching members category:", error);
    res.status(500).send("Error fetching members category");
  }
};

// Fetch all active universal links
const getUniversalLinks = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM universal_link WHERE status = $1 AND delete_status = $2",
      ["active", 0]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching universal links:", error);
    res.status(500).send("Error fetching universal links");
  }
};

// Fetch all active members
const getCompany = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM company");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).send("Error fetching company");
  }
};

// Fetch all active members
const getSupplier = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM supplier");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).send("Error fetching supplier");
  }
};

// Fetch all active members
const getInventory = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM inventory");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).send("Error fetching inventory");
  }
};

// Fetch all active members
const getSupplies = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM supplies");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching supplies:", error);
    res.status(500).send("Error fetching supplies");
  }
};

// Fetch all active members
const getEvents = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM events WHERE delete_status = 0"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send("Error fetching events");
  }
};

// Fetch all active members
const getMembershipFee = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM membership_fees");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching membership fees:", error);
    res.status(500).send("Error fetching membership fees");
  }
};

// Add a new membership fee
const addMembershipFee = async (req, res) => {
  const { years, fee } = req.body; // Assuming you're sending 'years' and 'fee' in the request body
  try {
    const result = await con.query(
      "INSERT INTO membership_fees (years, fee) VALUES ($1, $2) RETURNING *",
      [years, fee]
    );
    res.status(201).json(result.rows[0]); // Return the newly created fee
  } catch (error) {
    console.error("Error adding membership fee:", error);
    res.status(500).send("Error adding membership fee");
  }
};

// Fetch all active members
const getPaymentGateway = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM paymentgateways");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching payment gateway:", error);
    res.status(500).send("Error fetching payment gateway");
  }
};

// Fetch all active members
const getOrders = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM orders");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Error fetching orders");
  }
};

// Fetch all active members
const getTransactions = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM transactions");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).send("Error fetching transactions");
  }
};

// Fetch all active members
const authTokens = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM authTokens");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching Auth Tokens:", error);
    res.status(500).send("Error fetching Auth Tokens");
  }
};

const updateRegion = async (req, res) => {
  console.log('🔄 Starting region update process...');
  const { region_id } = req.params;
  console.log('🎯 Updating region with ID:', region_id);
  console.log('📦 Received update data:', req.body);
  console.log('🖼️ Received file:', req.file);

  try {
      // Parse arrays from JSON strings if they're strings
      const daysOfChapter = Array.isArray(req.body.days_of_chapter) 
          ? req.body.days_of_chapter 
          : JSON.parse(req.body.days_of_chapter);

      const chapterStatus = Array.isArray(req.body.chapter_status) 
          ? req.body.chapter_status 
          : JSON.parse(req.body.chapter_status);

      const chapterType = Array.isArray(req.body.chapter_type) 
          ? req.body.chapter_type 
          : JSON.parse(req.body.chapter_type);

      const accoladesConfig = Array.isArray(req.body.accolades_config) 
          ? req.body.accolades_config 
          : JSON.parse(req.body.accolades_config);

      const hotelId = Array.isArray(req.body.hotels_config)
          ? req.body.hotels_config
          : JSON.parse(req.body.hotels_config);

      // Convert arrays to PostgreSQL array format
      const formattedDays = `{${daysOfChapter.map(day => `"${day}"`).join(',')}}`;
      const formattedStatus = `{${chapterStatus.map(status => `"${status}"`).join(',')}}`;
      const formattedType = `{${chapterType.map(type => `"${type}"`).join(',')}}`;
      const formattedAccolades = `{${accoladesConfig.join(',')}}`;
      const formattedHotels = `{${hotelId.join(',')}}`;

      console.log('📊 Formatted arrays:', {
          days: formattedDays,
          status: formattedStatus,
          type: formattedType,
          accolades: formattedAccolades,
          hotels: formattedHotels
      });

      // Start building the query
      let query = `
          UPDATE region 
          SET region_name = $1,
              contact_person = $2,
              contact_number = $3,
              email_id = $4,
              mission = $5,
              vision = $6,
              region_status = $7,
              one_time_registration_fee = $8,
              one_year_fee = $9,
              two_year_fee = $10,
              five_year_fee = $11,
              late_fees = $12,
              country = $13,
              state = $14,
              city = $15,
              street_address_line_1 = $16,
              street_address_line_2 = $17,
              postal_code = $18,
              social_facebook = $19,
              social_instagram = $20,
              social_linkedin = $21,
              social_youtube = $22,
              website_link = $23,
              date_of_publishing = $24,
              region_launched_by = $25,
              days_of_chapter = $26,
              chapter_status = $27,
              chapter_type = $28,
              accolades_config = $29,
              hotel_id = $30
      `;

      // Add region_logo update if a new file was uploaded
      if (req.file) {
          query += `, region_logo = $31`;
      }

      query += ` WHERE region_id = $${req.file ? '32' : '31'} RETURNING *`;

      // Prepare values array
      const values = [
          req.body.region_name,
          req.body.contact_person,
          req.body.contact_number,
          req.body.email_id,
          req.body.mission,
          req.body.vision,
          req.body.region_status,
          req.body.one_time_registration_fee,
          req.body.one_year_fee,
          req.body.two_year_fee,
          req.body.five_year_fee,
          req.body.late_fees,
          req.body.country,
          req.body.state,
          req.body.city,
          req.body.street_address_line_1,
          req.body.street_address_line_2,
          req.body.postal_code,
          req.body.social_facebook,
          req.body.social_instagram,
          req.body.social_linkedin,
          req.body.social_youtube,
          req.body.website_link,
          req.body.date_of_publishing,
          req.body.region_launched_by,
          formattedDays,        // Using formatted array string
          formattedStatus,      // Using formatted array string
          formattedType,        // Using formatted array string
          formattedAccolades,   // Using formatted array string
          formattedHotels       // Using formatted hotels array
      ];

      // Add file name and region_id to values array
      if (req.file) {
          values.push(req.file.filename);
      }
      values.push(region_id);

      console.log('📝 Executing query with values:', values);
      console.log('🏨 Hotels being updated:', formattedHotels);

      const result = await con.query(query, values);

      if (result.rowCount === 0) {
          console.log('❌ No region found with ID:', region_id);
          return res.status(404).json({
              message: "Region not found"
          });
      }

      console.log('✅ Region updated successfully');
      res.json({
          message: "Region updated successfully",
          data: result.rows[0]
      });

  } catch (error) {
      console.error('❌ Error updating region:', error);
      res.status(500).json({
          message: "Error updating region",
          error: error.message
      });
  }
};

const updateChapter = async (req, res) => {
  console.log('\n🏢 Starting Chapter Update Process');
  console.log('==================================');
  
  const { chapter_id } = req.params;
  const {
      region_id,
      chapter_name,
      chapter_status,
      chapter_membership_fee,
      chapter_kitty_fees,
      chapter_visitor_fees,
      chapter_meeting_day,
      one_time_registration_fee,
      chapter_type,
      eoi_link,
      member_app_link,
      chapter_membership_fee_two_year,
      chapter_membership_fee_five_year,
      contact_number,
      contact_person,
      chapter_mission,
      chapter_vision,
      email_id,
      country,
      state,
      city,
      street_address_line,
      postal_code,
      chapter_facebook,
      chapter_instagram,
      chapter_linkedin,
      chapter_youtube,
      chapter_website,
      date_of_publishing,
      chapter_launched_by,
      chapter_location_note,
      chapter_late_fees,
      chapter_available_fund,
      billing_frequency,
      hotel_id,
      president_email,
      vice_president_email,
      treasurer_email
  } = req.body;

  let processedHotelId = Array.isArray(hotel_id) ? parseInt(hotel_id[0]) : parseInt(hotel_id);
    processedHotelId = isNaN(processedHotelId) ? null : processedHotelId;

  console.log('\n🏨 Hotel ID Processing in Update:');
  console.log('---------------------');
  console.log('Original Hotel ID:', hotel_id);
  console.log('Processed Hotel ID:', processedHotelId);
  console.log('Final Hotel ID Type:', typeof processedHotelId);

  try {
      const currentChapter = await con.query(
          'SELECT chapter_logo, email_id FROM chapter WHERE chapter_id = $1',
          [chapter_id]
      );
      
      const currentEmail = currentChapter.rows[0]?.email_id;
      const logoFilename = req.file ? req.file.filename : currentChapter.rows[0]?.chapter_logo;

      const query = `
          UPDATE chapter 
          SET 
              region_id = $1,
              chapter_name = $2,
              chapter_logo = $3,
              chapter_status = $4,
              chapter_membership_fee = $5,
              chapter_kitty_fees = $6,
              chapter_visitor_fees = $7,
              chapter_meeting_day = $8,
              one_time_registration_fee = $9,
              chapter_type = $10,
              eoi_link = $11,
              member_app_link = $12,
              chapter_membership_fee_two_year = $13,
              chapter_membership_fee_five_year = $14,
              contact_number = $15,
              contact_person = $16,
              chapter_mission = $17,
              chapter_vision = $18,
              email_id = $19,
              country = $20,
              state = $21,
              city = $22,
              street_address_line = $23,
              postal_code = $24,
              chapter_facebook = $25,
              chapter_instagram = $26,
              chapter_linkedin = $27,
              chapter_youtube = $28,
              chapter_website = $29,
              date_of_publishing = $30,
              chapter_launched_by = $31,
              chapter_location_note = $32,
              chapter_late_fees = $33,
              available_fund = $34,
              kitty_billing_frequency = $35,
              hotel_id = $36,
              vice_president_mail = $37,
              president_mail = $38,
              treasurer_mail = $39
          WHERE chapter_id = $40
          RETURNING *
      `;

      const values = [
          region_id,
          chapter_name,
          logoFilename,
          chapter_status,
          chapter_membership_fee,
          chapter_kitty_fees,
          chapter_visitor_fees,
          chapter_meeting_day,
          one_time_registration_fee,
          chapter_type,
          eoi_link,
          member_app_link,
          chapter_membership_fee_two_year,
          chapter_membership_fee_five_year,
          contact_number,
          contact_person,
          chapter_mission,
          chapter_vision,
          email_id,
          country,
          state,
          city,
          street_address_line,
          postal_code,
          chapter_facebook,
          chapter_instagram,
          chapter_linkedin,
          chapter_youtube,
          chapter_website,
          date_of_publishing,
          chapter_launched_by,
          chapter_location_note,
          chapter_late_fees,
          chapter_available_fund,
          billing_frequency,
          processedHotelId,
          vice_president_email,
          president_email,
          treasurer_email,
          chapter_id
      ];

      const result = await con.query(query, values);

      if (result.rows.length === 0) {
          return res.status(404).json({ message: "Chapter not found" });
      }

      if (req.file && currentEmail) {
          await con.query(
              `UPDATE chapter SET chapter_logo = $1 WHERE email_id = $2`,
              [logoFilename, currentEmail]
          );
      }

      const updatedChapter = result.rows[0];
      if (updatedChapter.chapter_logo) {
          updatedChapter.chapter_logo_url = `http://localhost:5000/api/uploads/chapterLogos/${updatedChapter.chapter_logo}`;
      }

      console.log('\n✅ Chapter Update Success:');
      console.log('-------------------------');
      console.log('Chapter ID:', updatedChapter.chapter_id);
      console.log('Chapter Name:', updatedChapter.chapter_name);
      console.log('Updated Hotel ID:', updatedChapter.hotel_id);

      res.json(updatedChapter);

  } catch (error) {
      console.error('\n❌ Error Updating Chapter:');
      console.error('---------------------');
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      res.status(500).json({
          message: "Error updating chapter",
          error: error.message
      });
  }
};


const updateMember = async (req, res) => {
  console.log('📝 Starting member update process');
  console.log('📦 Request body:', req.body);
  console.log('📸 Files received:', req.files);

  try {
      const { member_id } = req.params;

      // First get the existing member data
      const existingMember = await con.query(
          "SELECT * FROM member WHERE member_id = $1",
          [member_id]
      );

      if (existingMember.rows.length === 0) {
          return res.status(404).json({
              message: "Member not found"
          });
      }

      // Handle accolades_id - keep existing if not provided in request
      let parsedAccolades;
      if (req.body.accolades_id) {
        try {
            // Split the comma-separated string and convert to array of numbers
            const accoladesArray = req.body.accolades_id
                .split(',')
                .map(id => parseInt(id.trim()))
                .filter(id => !isNaN(id)); // Remove any invalid numbers
            
            console.log('🏆 New accolades array:', accoladesArray);
            // Format for PostgreSQL array
            parsedAccolades = `{${accoladesArray.join(',')}}`;
            console.log('🏆 Formatted accolades for PostgreSQL:', parsedAccolades);
        } catch (error) {
            console.error('❌ Error parsing accolades:', error);
            parsedAccolades = existingMember.rows[0].accolades_id;
        }
    } else {
        // Important: Keep existing accolades if not provided in request
        console.log('🏆 Keeping existing accolades:', existingMember.rows[0].accolades_id);
        parsedAccolades = existingMember.rows[0].accolades_id;
    }

      // Get filenames from uploaded files
      const memberPhotoFilename = req.files?.['member_photo']?.[0]?.filename;
      const companyLogoFilename = req.files?.['member_company_logo']?.[0]?.filename;

      // Build the SET clause dynamically
      const updates = [];
      const values = [];
      let valueCounter = 1;

      // Add all fields from request body except files and accolades
      Object.keys(req.body).forEach(key => {
        if (key !== 'accolades_id' && 
            key !== 'member_photo' && 
            key !== 'member_company_logo') {
            
            // Handle category_name specifically
            if (key === 'category_name') {
                updates.push(`category_name = $${valueCounter}`);
                values.push(req.body.category_name);
                valueCounter++;
            } else {
                updates.push(`${key} = $${valueCounter}`);
                values.push(req.body[key]);
                valueCounter++;
            }
        }
    });


      // Always include accolades in the update with the preserved value
      updates.push(`accolades_id = $${valueCounter}`);
      values.push(parsedAccolades);
      valueCounter++;

      // Add photo if present, otherwise keep existing
      if (memberPhotoFilename) {
          updates.push(`member_photo = $${valueCounter}`);
          values.push(memberPhotoFilename);
          valueCounter++;
      }

      // Add company logo if present, otherwise keep existing
      if (companyLogoFilename) {
          updates.push(`member_company_logo = $${valueCounter}`);
          values.push(companyLogoFilename);
          valueCounter++;
      }

      // Add member_id to values array
      values.push(member_id);

      const query = `
          UPDATE member 
          SET ${updates.join(', ')}
          WHERE member_id = $${valueCounter}
          RETURNING *
      `;

      console.log('🔍 Executing query:', query);
      console.log('📊 With values:', values);

      const result = await con.query(query, values);
      const updatedMember = result.rows[0];
      console.log('✅ Member updated successfully:', updatedMember);

      res.json({
          message: "Member updated successfully",
          data: {
              ...updatedMember,
              member_photo_url: updatedMember.member_photo ? `/uploads/memberPhotos/${updatedMember.member_photo}` : null,
              member_company_logo_url: updatedMember.member_company_logo ? `/uploads/memberCompanyLogos/${updatedMember.member_company_logo}` : null
          }
      });

  } catch (error) {
      console.error('❌ Error updating member:', error);
      res.status(500).json({
          message: "Error updating member",
          error: error.message
      });
  }
};

const updateUniversalLink = async (req, res) => {
  const { id } = req.params; // Get id from URL parameter
  const linkData = req.body; // Get the updated data from the request body

  console.log("Updating Universal with ID:", id);
  console.log("Received data:", linkData);

  try {
    // Construct the SQL query for updating the universal link
    const query = `
      UPDATE universal_link
      SET
        universal_link_name = $1,
        ulid = $2,
        link_slug = $3,
        status = $4,
        payment_gateway = $5
      WHERE id = $6
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      linkData.link_name,
      linkData.link_ulid,
      linkData.link_slug,
      linkData.link_status,
      linkData.link_payment_gateway,
      id, // Ensure the id is used for the WHERE clause
    ];

    // Execute the query with the provided universal link data
    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Universal Link not found:", id);
      return res.status(404).json({ message: "Universal Link not found" });
    }

    // Return the updated universal data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating Universal Link:", error);
    res.status(500).json({ message: "Error updating Universal Link" });
  }
};

const deleteRegion = async (req, res) => {
  const { region_id } = req.params;
  
  if (!region_id) {
      return res.status(400).json({ message: "Region ID is required" });
  }

  try {
      // First check if region exists and isn't already deleted
      const checkRegion = await con.query(
          `SELECT * FROM region WHERE region_id = $1 AND delete_status = 0`,
          [region_id]
      );

      if (checkRegion.rowCount === 0) {
          return res.status(404).json({ 
              message: "Region not found or already deleted" 
          });
      }

      // Proceed with deletion
      const result = await con.query(
          `UPDATE region SET delete_status = 1 WHERE region_id = $1 RETURNING *`,
          [region_id]
      );

      if (result.rowCount > 0) {
          res.status(200).json({ 
              message: "Region marked as deleted successfully",
              data: result.rows[0]
          });
      } else {
          res.status(500).json({ 
              message: "Failed to delete region" 
          });
      }
  } catch (error) {
      console.error("Error deleting region:", error);
      res.status(500).json({ 
          message: "Error deleting region",
          error: error.message 
      });
  }
};

const deleteChapter = async (req, res) => {
  const { chapter_id } = req.params;
  try {
    const result = await con.query(
      `UPDATE chapter SET delete_status = 1 WHERE chapter_id = $1 RETURNING *`,
      [chapter_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Chapter marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Chapter not found" });
    }
  } catch (error) {
    console.error("Error deleting Chapter:", error);
    res.status(500).json({ message: "Error deleting Chapter" });
  }
};

const deleteMember = async (req, res) => {
  const { member_id } = req.params;
  try {
    const result = await con.query(
      `UPDATE member SET delete_status = 1 WHERE member_id = $1 RETURNING *`,
      [member_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Member marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (error) {
    console.error("Error deleting Member:", error);
    res.status(500).json({ message: "Error deleting Member" });
  }
};

const deleteUniversalLink = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await con.query(
      `UPDATE universal_link SET delete_status = 1 WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Universal Link marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Universal Link not found" });
    }
  } catch (error) {
    console.error("Error deleting Universal Link", error);
    res.status(500).json({ message: "Error deleting Universal Link" });
  }
};

const deleteAccolade = async (req, res) => {
  const { accolade_id } = req.params;
  console.log("Accolade ID:", accolade_id);

  try {
    const result = await con.query(
      `UPDATE accolades SET delete_status = 1 WHERE accolade_id = $1 RETURNING *`,
      [accolade_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Accolade marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Accolade not found" });
    }
  } catch (error) {
    console.error("Error deleting Accolade", error);
    res.status(500).json({ message: "Error deleting Accolade" });
  }
};


const updateAccolade = async (req, res) => {
  const { accolade_id } = req.params; // Get id from URL parameter
  const linkData = req.body; // Get the updated data from the request body

  console.log("Updating accolade with ID:", accolade_id);
  console.log("Received data:", linkData);

  try {
    // Construct the SQL query for updating the universal link
    const query = `
      UPDATE accolades
      SET
        accolade_name = $1,
        accolade_published_by = $2,
        accolade_publish_date = $3,
        accolade_availability = $4,
        accolade_status = $5,
        stock_available = $6,
        item_type = $7,
        accolade_type = $8,
        eligibility_and_condition = $9,
        accolade_price = $10
      WHERE accolade_id = $11
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      linkData.accolade_name,
      linkData.accolade_publish_by,
      linkData.stock_in_date,
      linkData.stock_availability,
      linkData.stock_status,
      linkData.stock_available,
      linkData.item_type,
      linkData.accolade_type,
      linkData.eligibility_and_condition,
      linkData.accolade_price, // Added accolade_price
      accolade_id, // Ensure the id is used for the WHERE clause
    ];

    // Execute the query with the provided universal link data
    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Accolade not found:", id);
      return res.status(404).json({ message: "Accolade not found" });
    }

    // Return the updated universal data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating accolade:", error);
    res.status(500).json({ message: "Error updating accolade" });
  }
};


const addAccolade = async (req, res) => {
  const {
    accolade_name,
    accolade_published_by,
    accolade_publish_date,
    accolade_availability,
    accolade_price,
    accolade_status,
    stock_available,
    item_type,
    accolade_type,
    eligibilty_and_condition
  } = req.body;

  console.log(req.body);

  // Validate accolade_name
  if (!accolade_name) {
    return res.status(400).json({ message: "Accolade name is required" });
  }

  try {
    // Extract single value from item_type and accolade_type
    const selectedItemType =
      typeof item_type === "object" && item_type.length > 0
        ? item_type[0]
        : item_type;
    const selectedAccoladeType =
      typeof accolade_type === "object" && accolade_type.length > 0
        ? accolade_type[0]
        : accolade_type;

    // Check if accolade_name already exists
    const checkDuplicate = await con.query(
      `SELECT * FROM accolades WHERE accolade_name = $1`,
      [accolade_name]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Accolade name already exists",
      });
    }

    // Insert new accolade
    const result = await con.query(
      `INSERT INTO accolades (
          accolade_name, accolade_published_by, accolade_publish_date, accolade_availability, accolade_price, accolade_status, stock_available, item_type, accolade_type, eligibility_and_condition
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *`,
      [
        accolade_name,
        accolade_published_by,
        accolade_publish_date,
        accolade_availability,
        accolade_price,
        accolade_status,
        stock_available,
        selectedItemType, // Store single value
        selectedAccoladeType, // Store single value
        eligibilty_and_condition
      ]
    );

    res
      .status(201)
      .json({ message: "Accolade added successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Error adding Accolade:", error);
    res.status(500).json({ message: "Error adding Accolade" });
  }
};

// Controller to export regions to Excel
const exportRegionsToExcel = async (req, res) => {
  try {
    // Fetch all regions from the database
    const result = await con.query(`
      SELECT 
        region_name, contact_person, contact_number, email_id, 
        days_of_chapter, region_status, accolades_config, chapter_status, 
        chapter_type, mission, vision, region_logo, one_time_registration_fee, 
        one_year_fee, two_year_fee, five_year_fee, late_fees, 
        country, state, city, street_address_line_1, street_address_line_2, 
        social_facebook, social_instagram, social_linkedin, social_youtube, 
        website_link, region_launched_by, date_of_publishing, delete_status
      FROM region
    `);

    // Prepare data for Excel file
    const regions = result.rows.map((region) => ({
      region_name: region.region_name,
      contact_person: region.contact_person,
      contact_number: region.contact_number,
      email_id: region.email_id,
      chapter_days: region.days_of_chapter,
      region_status: region.region_status,
      accolades_config: Array.isArray(region.accolades_config)
        ? region.accolades_config.join(", ")
        : region.accolades_config,
      chapter_status: Array.isArray(region.chapter_status)
        ? region.chapter_status.join(", ")
        : region.chapter_status,
      chapter_type: Array.isArray(region.chapter_type)
        ? region.chapter_type.join(", ")
        : region.chapter_type,
      mission: region.mission,
      vision: region.vision,
      region_logo: region.region_logo,
      one_time_registration_fee: region.one_time_registration_fee,
      one_year_fee: region.one_year_fee,
      two_year_fee: region.two_year_fee,
      five_year_fee: region.five_year_fee,
      late_fees: region.late_fees,
      country: region.country,
      state: region.state,
      city: region.city,
      street_address_line_1: region.street_address_line_1,
      street_address_line_2: region.street_address_line_2,
      social_facebook: region.social_facebook,
      social_instagram: region.social_instagram,
      social_linkedin: region.social_linkedin,
      social_youtube: region.social_youtube,
      website_link: region.website_link,
      region_launched_by: region.region_launched_by,
      date_of_publishing: region.date_of_publishing,
      delete_status: region.delete_status,
    }));

    // Create a new workbook and add a sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(regions);

    // Append the sheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, "Regions");

    // Set the file name for the Excel download
    const filename = "regions.xlsx";

    // Set headers to prompt the download of the file
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Write the Excel file to the response
    const fileBuffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
    res.end(fileBuffer);
  } catch (error) {
    console.error("Error exporting regions:", error);
    res.status(500).send("Error exporting regions");
  }
};

// Corrected Controller to export chapters to Excel
const exportChaptersToExcel = async (req, res) => {
  try {
    // Fetch all chapters from the database
    const result = await con.query(`
      SELECT 
        region_id, chapter_name, chapter_logo, chapter_status, chapter_membership_fee,
        chapter_kitty_fees, chapter_visitor_fees, chapter_meeting_day, one_time_registration_fee,
        chapter_type, eoi_link, member_app_link, meeting_hotel_name, 
        chapter_membership_fee_two_year, chapter_membership_fee_five_year, contact_number,
        contact_person, chapter_mission, chapter_vision, email_id, country, state, city,
        street_address_line, postal_code, chapter_facebook, chapter_instagram,
        chapter_linkedin, chapter_youtube, chapter_website, date_of_publishing,
        chapter_launched_by, chapter_location_note, chapter_late_fees, delete_status
      FROM chapter
    `);

    // Prepare data for Excel file
    const chapters = result.rows.map((chapter) => ({
      region_id: chapter.region_id,
      chapter_name: chapter.chapter_name,
      chapter_logo: chapter.chapter_logo,
      chapter_status: chapter.chapter_status,
      chapter_membership_fee: chapter.chapter_membership_fee,
      chapter_kitty_fees: chapter.chapter_kitty_fees,
      chapter_visitor_fees: chapter.chapter_visitor_fees,
      chapter_meeting_day: chapter.chapter_meeting_day,
      one_time_registration_fee: chapter.one_time_registration_fee,
      chapter_type: chapter.chapter_type,
      eoi_link: chapter.eoi_link,
      member_app_link: chapter.member_app_link,
      meeting_hotel_name: chapter.meeting_hotel_name,
      chapter_membership_fee_two_year: chapter.chapter_membership_fee_two_year,
      chapter_membership_fee_five_year:
        chapter.chapter_membership_fee_five_year,
      contact_number: chapter.contact_number,
      contact_person: chapter.contact_person,
      chapter_mission: chapter.chapter_mission,
      chapter_vision: chapter.chapter_vision,
      email_id: chapter.email_id,
      country: chapter.country,
      state: chapter.state,
      city: chapter.city,
      street_address_line: chapter.street_address_line,
      postal_code: chapter.postal_code,
      chapter_facebook: chapter.chapter_facebook,
      chapter_instagram: chapter.chapter_instagram,
      chapter_linkedin: chapter.chapter_linkedin,
      chapter_youtube: chapter.chapter_youtube,
      chapter_website: chapter.chapter_website,
      date_of_publishing: chapter.date_of_publishing,
      chapter_launched_by: chapter.chapter_launched_by,
      chapter_location_note: chapter.chapter_location_note,
      chapter_late_fees: chapter.chapter_late_fees,
      delete_status: chapter.delete_status,
    }));

    // Create a new workbook and add a sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(chapters);

    // Append the sheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, "Chapters");

    // Set the file name for the Excel download
    const filename = "chapters.xlsx";

    // Set headers to prompt the download of the file
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Write the Excel file to the response buffer
    const fileBuffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });

    // Send the file buffer in the response
    res.end(fileBuffer);
  } catch (error) {
    console.error("Error exporting chapters:", error);
    res.status(500).send("Error exporting chapters");
  }
};

const exportMembersToExcel = async (req, res) => {
  try {
    // Fetch all members from the database
    const result = await con.query(`
      SELECT 
        member_first_name, 
        member_last_name, 
        member_date_of_birth, 
        member_phone_number, 
        member_alternate_mobile_number, 
        member_email_address, 
        address_pincode, 
        address_city, 
        address_state, 
        region_id, 
        chapter_id, 
        accolades_id, 
        category_id, 
        member_induction_date, 
        member_current_membership, 
        member_renewal_date, 
        member_gst_number, 
        member_company_name, 
        member_company_address, 
        member_company_state, 
        member_company_city, 
        member_photo, 
        member_website, 
        member_company_logo, 
        member_facebook, 
        member_instagram, 
        member_linkedin, 
        member_youtube, 
        country, 
        street_address_line_1, 
        street_address_line_2, 
        gender, 
        notification_consent, 
        date_of_publishing, 
        member_sponsored_by, 
        member_status,
        delete_status
      FROM member
    `);

    // Prepare data for the Excel file
    const members = result.rows.map((member) => ({
      member_first_name: member.member_first_name,
      member_last_name: member.member_last_name,
      member_date_of_birth: member.member_date_of_birth,
      member_phone_number: member.member_phone_number,
      member_alternate_mobile_number: member.member_alternate_mobile_number,
      member_email_address: member.member_email_address,
      address_pincode: member.address_pincode,
      address_city: member.address_city,
      address_state: member.address_state,
      region_id: member.region_id,
      chapter_id: member.chapter_id,
      accolades_id: member.accolades_id ? member.accolades_id.join(", ") : "",
      category_id: member.category_id,
      member_induction_date: member.member_induction_date,
      member_current_membership: member.member_current_membership,
      member_renewal_date: member.member_renewal_date,
      member_gst_number: member.member_gst_number,
      member_company_name: member.member_company_name,
      member_company_address: member.member_company_address,
      member_company_state: member.member_company_state,
      member_company_city: member.member_company_city,
      member_photo: member.member_photo,
      member_website: member.member_website,
      member_company_logo: member.member_company_logo,
      member_facebook: member.member_facebook,
      member_instagram: member.member_instagram,
      member_linkedin: member.member_linkedin,
      member_youtube: member.member_youtube,
      country: member.country,
      street_address_line_1: member.street_address_line_1,
      street_address_line_2: member.street_address_line_2,
      gender: member.gender,
      notification_consent: member.notification_consent,
      date_of_publishing: member.date_of_publishing,
      member_sponsored_by: member.member_sponsored_by,
      member_status: member.member_status,
      delete_status: member.delete_status,
    }));

    // Create a new workbook and add a sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(members);

    // Append the sheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, "Members");

    // Set the file name for the Excel download
    const filename = "members.xlsx";

    // Set headers to prompt the download of the file
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Write the Excel file to the response
    const buffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting members:", error);
    res.status(500).send("Error exporting members");
  }
};

const exportOrdersToExcel = async (req, res) => {
  try {
    // Fetch all orders from the database
    const result = await con.query("SELECT * FROM Orders");

    // Prepare data for Excel
    const orders = result.rows.map((order) => ({
      order_id: order.order_id,
      order_amount: order.order_amount,
      order_currency: order.order_currency,
      payment_gateway_id: order.payment_gateway_id,
      customer_id: order.customer_id,
      chapter_id: order.chapter_id,
      region_id: order.region_id,
      universal_link_id: order.universal_link_id,
      ulid: order.ulid,
      order_status: order.order_status,
      payment_session_id: order.payment_session_id,
      one_time_registration_fee: order.one_time_registration_fee,
      membership_fee: order.membership_fee,
      tax: order.tax,
      member_name: order.member_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      gstin: order.gstin,
      company: order.company,
      mobile_number: order.mobile_number,
      renewal_year: order.renewal_year,
      payment_note: order.payment_note,
      created_at: order.created_at, // Assuming you have timestamp fields
      updated_at: order.updated_at,
    }));

    // Create an Excel workbook and sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(orders);

    // Append the sheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, "Orders");

    // Set the file name
    const filename = "orders.xlsx";

    // Set headers for the file download
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Write the Excel file to the response
    const buffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting orders:", error);
    res.status(500).send("Error exporting orders");
  }
};

const exportTransactionsToExcel = async (req, res) => {
  try {
    // Fetch all transactions from the database
    const result = await con.query(`
      SELECT 
        cf_payment_id, order_id, payment_gateway_id, payment_amount, payment_currency, payment_status, 
        payment_message, payment_time, payment_completion_time, bank_reference, auth_id, payment_method, 
        error_details, gateway_order_id, gateway_payment_id, payment_group
      FROM Transactions
    `);

    // Prepare data for Excel file
    const transactions = result.rows.map((transaction) => {
      const parseJSONSafely = (value) => {
        try {
          // If the value is a valid JSON string, parse it, otherwise return the value as is
          if (typeof value === "string" && value.startsWith("{")) {
            return JSON.parse(value);
          }
          return value;
        } catch (error) {
          return value; // Return the value as is if JSON parsing fails
        }
      };

      return {
        cf_payment_id: transaction.cf_payment_id,
        order_id: transaction.order_id,
        payment_gateway_id: transaction.payment_gateway_id,
        payment_amount: transaction.payment_amount,
        payment_currency: transaction.payment_currency,
        payment_status: transaction.payment_status,
        payment_message: transaction.payment_message,
        payment_time: transaction.payment_time,
        payment_completion_time: transaction.payment_completion_time,
        bank_reference: transaction.bank_reference,
        auth_id: transaction.auth_id,
        payment_method: parseJSONSafely(transaction.payment_method), // Safely parse JSON
        error_details: parseJSONSafely(transaction.error_details), // Safely parse JSON
        gateway_order_id: transaction.gateway_order_id,
        gateway_payment_id: transaction.gateway_payment_id,
        payment_group: transaction.payment_group,
      };
    });

    // Create a new workbook and add a sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(transactions);

    // Append the sheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, "Transactions");

    // Set the file name for the Excel download
    const filename = "transactions.xlsx";

    // Set headers to prompt the download of the file
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Write the Excel file to the response
    const excelFile = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
    res.end(excelFile);
  } catch (error) {
    console.error("Error exporting transactions:", error);
    res.status(500).send("Error exporting transactions");
  }
};

const deleteEvent = async (req, res) => {
  const { event_id } = req.params;
  try {
    const result = await con.query(
      `UPDATE events SET delete_status = 1 WHERE event_id = $1 RETURNING *`,
      [event_id]
    );
    if (result.rowCount > 0) {
      res.status(200).json({ message: "Event marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    console.error("Error deleting Event:", error);
    res.status(500).json({ message: "Error deleting event" });
  }
};

const getEvent = async (req, res) => {
  const { event_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query("SELECT * FROM events WHERE event_id = $1", [
      event_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Event:", error);
    res.status(500).send("Error fetching Event");
  }
};

const updateEvent = async (req, res) => {
  const { event_id } = req.params; // Get id from URL parameter
  const linkData = req.body; // Get the updated data from the request body

  console.log("Updating event with ID:", event_id);
  console.log("Received data:", linkData);

  try {
    // Construct the SQL query for updating the events
    const query = `
      UPDATE events
      SET
        event_name = $1,
        event_venue = $2,
        event_price = $3,
        event_date = $4,
        event_status = $5
      WHERE event_id = $6
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      linkData.event_name,
      linkData.event_venue,
      linkData.event_price,
      linkData.event_date,
      linkData.event_status,
      event_id, // Ensure the id is used for the WHERE clause
    ];

    // Execute the query with the provided universal link data
    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Event not found:", id);
      return res.status(404).json({ message: "Event not found" });
    }

    // Return the updated universal data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Error updating event" });
  }
};

const addEvent = async (req, res) => {
  const {
    event_name,
    billing_company,
    event_venue,
    event_ticket_price,
    event_date,
    event_status,
  } = req.body;

  // Validate accolade_name
  if (!event_name) {
    return res.status(400).json({ message: "Event name is required" });
  }

  try {
    // Check if accolade_name already exists
    const checkDuplicate = await con.query(
      `SELECT * FROM events WHERE event_name = $1`,
      [event_name]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Event name already exists",
      });
    }

    // Insert new accolade
    const result = await con.query(
      `INSERT INTO events (
        event_name, billing_company, event_venue, event_price, event_date, event_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING *`,
      [
        event_name,
        billing_company,
        event_venue,
        event_ticket_price,
        event_date,
        event_status,
      ]
    );

    res
      .status(201)
      .json({ message: "Event added successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Error adding Event:", error);
    res.status(500).json({ message: "Error adding Event" });
  }
};

// Fetch all active members
const getTrainings = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM training WHERE delete_status = 0"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching trainings:", error);
    res.status(500).send("Error fetching trainings");
  }
};

const getTraining = async (req, res) => {
  const { training_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM training WHERE training_id = $1",
      [training_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Training not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Training:", error);
    res.status(500).send("Error fetching Training");
  }
};

const updateTraining = async (req, res) => {
  const { training_id } = req.params;
  const linkData = req.body;

  console.log("Updating training with ID:", training_id);
  console.log("Received data:", linkData);

  try {
    // Ensure training_venue is converted to an integer
    const venue_id = parseInt(linkData.training_venue);
    if (isNaN(venue_id)) {
      return res.status(400).json({
        message: "Invalid venue ID. Must be a number.",
      });
    }
    // Construct the SQL query for updating the events
    const query = `
      UPDATE training
      SET
       training_name = $1,
       training_status = $2,
       training_venue = $3,
       training_price = $4,
       training_date = $5,
       training_note = $6,
       training_published_by = $7,
       training_time = $8
      WHERE training_id = $9
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      linkData.training_name,
      linkData.training_status,
      venue_id,
      linkData.training_price,
      linkData.training_date,
      linkData.training_note,
      linkData.training_published_by,
      linkData.training_time,
      training_id, // Ensure the id is used for the WHERE clause
    ];

    // Execute the query with the provided universal link data
    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Training not found:", id);
      return res.status(404).json({ message: "Training not found" });
    }

    // Return the updated universal data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating training:", error);
    res.status(500).json({ message: "Error updating training" });
  }
};

const deleteTraining = async (req, res) => {
  const { training_id } = req.params;
  console.log("Training ID:", training_id);

  try {
    const result = await con.query(
      `UPDATE training SET delete_status = 1 WHERE training_id = $1 RETURNING *`,
      [training_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Training marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Training not found" });
    }
  } catch (error) {
    console.error("Error deleting Training", error);
    res.status(500).json({ message: "Error deleting Training" });
  }
};

const addTraining = async (req, res) => {
  const {
    training_name,
    billing_company,
    training_status,
    training_venue,
    training_ticket_price,
    training_date,
    training_note,
    training_published_by,
    training_time,
  } = req.body;

  console.log("Received training data:", req.body);

  // Validate required fields
  if (!training_name) {
    return res.status(400).json({ message: "Training name is required" });
  }

  // Ensure billing_company is a number
  const billing_company_id = parseInt(billing_company);
  if (isNaN(billing_company_id)) {
    return res.status(400).json({
      message: "Invalid billing company ID. Must be a number.",
    });
  }
  // Ensure training_venue is a number
  const venue_id = parseInt(training_venue);
  if (isNaN(venue_id)) {
    return res.status(400).json({
      message: "Invalid venue ID. Must be a number.",
    });
  }

  try {
    // Check if training with same name and date already exists
    const checkDuplicate = await con.query(
      `SELECT * FROM training 
       WHERE training_name = $1 
       AND training_date = $2 
       AND delete_status = 0`,
      [training_name, training_date]
    );

    console.log("Duplicate check result:", checkDuplicate.rows);

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Training with this name and date already exists",
      });
    }

    // Insert new training with validated billing_company_id
    const result = await con.query(
      `INSERT INTO training (
        training_name, 
        billing_company, 
        training_status, 
        training_venue, 
        training_price, 
        training_date, 
        training_note, 
        training_published_by,
        training_time
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *`,
      [
        training_name,
        billing_company_id, // Using the parsed integer value
        training_status,
        venue_id,
        training_ticket_price,
        training_date,
        training_note,
        training_published_by,
        training_time
      ]
    );

    console.log("Successfully added training:", result.rows[0]);

    res.status(201).json({
      message: "Training added successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding Training:", error);
    res.status(500).json({
      message: "Error adding Training",
      error: error.message,
    });
  }
};

// Fetch all active members
const getSettledPayments = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM settlementstatus");
    res.json(result.rows);
  } catch (error) {
    // console.error("Error fetching settlement transactions:", error);
    // res.status(500).send("Error fetching settlement transactions");
  }
};

const getOrder = async (req, res) => {
  const { order_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query("SELECT * FROM orders WHERE order_id = $1", [
      order_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Order:", error);
    res.status(500).send("Error fetching Order");
  }
};

const getMemberId = async (req, res) => {
  try {
    // Extract member ID from route params
    const { member_id: memberId } = req.params;
    console.log("Member ID from params:", memberId);

    if (!memberId) {
      return res.status(400).json({ message: "Member ID is required" });
    }

    // Query the database to fetch the member
    const member = await con.query(
      "SELECT * FROM member WHERE member_id = $1",
      [memberId]
    );

    if (member.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.status(200).json(member.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
const getCurrentDate = (req, res) => {
  const currentDate = new Date();
  res.status(200).json({ currentDate: currentDate.toISOString() });
};


const getSpecificBankOrder = async (req, res) => {
  console.log("getSpecificBankOrder",req.body);
  const { member_id, chapter_id } = req.body;
  // const result = await con.query("SELECT * FROM bankorder WHERE chapter_id = $1 AND member_id = $2", [chapter_id, member_id]);
  // res.json(result.rows);
  try {
        // Query the database to find matching entries
        const query = `
            SELECT * 
            FROM bankorder 
            WHERE chapter_id = $1 AND member_id = $2
        `;
        
        const result = await con.query(query, [chapter_id, member_id]);

        // If no rows are found, send a 404 response
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No matching orders found' });
        }

        // Send back the matching orders as the response
        res.status(200).json(result.rows);
    } catch (error) {
        // Handle any database errors
        console.error(error);
        res.status(500).json({ message: 'Server error, please try again later' });
    }
}

const addKittyPayment = async (req, res) => {
  try {
    const {
      chapter_id,
      date,
      bill_type,
      description,
      total_weeks,
      total_bill_amount,
      due_date,
      penalty_amount,
    } = req.body;

    // Check if all required fields are provided
    if (
      !chapter_id ||
      !date ||
      !bill_type ||
      !description ||
      !total_weeks ||
      !total_bill_amount ||
      !due_date
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if a payment has already been raised for this chapter_id with delete_status = 0
    const checkQuery =
      "SELECT * FROM kittyPaymentChapter WHERE chapter_id = $1 AND delete_status = 0";
    const checkResult = await con.query(checkQuery, [chapter_id]);

    if (checkResult.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "A bill has already been raised for this chapter." });
    }
    const raisedOnDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    // If no active payment exists for this chapter_id, proceed to insert the new record raised_on payment_date
    const query = `
          INSERT INTO kittyPaymentChapter 
          (chapter_id, payment_date, raised_on, bill_type, description, total_weeks, total_bill_amount ,kitty_due_date, penalty_fee) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

    await con.query(query, [
      chapter_id,
      raisedOnDate,
      date,
      bill_type,
      description,
      total_weeks,
      total_bill_amount,
      due_date,
      penalty_amount,
    ]);

    // Update the meeting_payable_amount field in the member table for the same chapter_id
    const updateMemberQuery = `
          UPDATE member
          SET meeting_payable_amount = $1
          WHERE chapter_id = $2 AND writeoff_status = FALSE;
      `;

      

    await con.query(updateMemberQuery, [total_bill_amount, chapter_id]);
    console.log(updateMemberQuery);

        // Fetch updated members to email them
        const fetchMembersQuery = `
        SELECT member_id, member_first_name, member_email_address, meeting_payable_amount 
        FROM member 
        WHERE chapter_id = $1 AND writeoff_status = FALSE AND member_email_address IS NOT NULL
      `;
      const membersResult = await con.query(fetchMembersQuery, [chapter_id]);
      const membersToEmail = membersResult.rows;
      // Fetch chapters to get chapter_name from chapter_id
const chapterResponse = await fetch('http://localhost:5000/api/chapters');
const chapterData = await chapterResponse.json();
const chapter = chapterData.find(c => c.chapter_id === Number(chapter_id));
const chapterName = chapter ? chapter.chapter_name : `Chapter #${chapter_id}`; // fallback if not found

  
      for (const member of membersToEmail) {
        const mailOptions = {
          from: '"BNI New Delhi" <info@bninewdelhi.in>',
          to: member.member_email_address,
          subject: "New Bill Raised - Payment Reminder",
          html: `
            <p>Dear ${member.member_first_name},</p>
            <p>A new bill has been raised under your chapter <b>${chapterName}</b>.</p>
            <p><strong>Bill Type:</strong> ${bill_type}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Total Amount:</strong> ₹${total_bill_amount}</p>
            <p><strong>Due Date:</strong> ${due_date}</p>
            <p>We request you to pay the bill amount before due date, as penalty fee of <b>₹${penalty_amount}</b> will be applied.</b>.</p>
            <br/>
            <p>Thank you,<br/><b>BNI NEW Delhi</b></p>
            <a href="https://bninewdelhi.com/meeting-payment/4/2d4efe39-b134-4187-a5c0-4530125f5248/1" style="text-decoration: none; color: white; background-color: red; padding: 10px 20px; border-radius: 5px;"><button>Pay Now</button></a>

            
          `,
        };
  
        try {
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${member.member_email_address}`);
        } catch (mailErr) {
          console.error(`Error sending email to ${member.member_email_address}:`, mailErr);
        }
      }
  
    

    const response = await fetch('http://localhost:5000/api/getbankOrder');
    const bankOrders = await response.json();

    // Filter the bank orders based on chapter_id
    // const filteredBankOrders = bankOrders.filter(order => order.chapter_id === chapter_id);
    console.log("bankOrders",bankOrders);
    console.log("chapter_id",chapter_id);
    const filteredBankOrders = bankOrders.filter(order => {
      console.log("Order Chapter ID:", order.chapter_id);
      console.log("Chapter ID:", chapter_id);
      return order.chapter_id === Number(chapter_id);
    });
    // const fiterdata = bankOrders.filter(order => order.chapter_id === chapter_id);
    console.log('Filtered Bank Orders:', filteredBankOrders);

    if (filteredBankOrders.length > 0) {
      // const totalAmountToPay = filteredBankOrders.reduce((acc, order) => acc + order.amount_to_pay, 0);
      
    
      for (const order of filteredBankOrders) {
        let currentAmountToPay = order.amount_to_pay;
        let noOfLatePayment = order.no_of_late_payment;
        
        if (currentAmountToPay > 0) {
          // Code to handle positive amount_to_pay
          console.log(`Processing payment for order ID: ${order.id} with amount: ${currentAmountToPay}`);
          let currentDate = new Date();
          let dueDate = order.kitty_due_date ? new Date(order.kitty_due_date) : null;
          if (dueDate === null) {
            // Code to handle the case where dueDate is null
            console.log(`Order ID: ${order.id} has due date === null.`);
          }
          else if (currentDate > dueDate) {
            // Code to handle the case where the current date is greater than the due date
            currentAmountToPay = parseFloat(currentAmountToPay) + parseFloat(order.kitty_penalty);
            noOfLatePayment = parseFloat(noOfLatePayment) + 1;
            console.log(`Order ID: ${order.id} is overdue. Processing overdue actions. added penalty ${order.kitty_penalty} and no of late payment ${noOfLatePayment}`);
          } else {
            // Code to handle the case where the current date is less than or equal to the due date
            console.log(`Order ID: ${order.id} is not overdue. No action needed to add penalty.`);
          }
          currentAmountToPay = parseFloat(currentAmountToPay) + parseFloat(total_bill_amount);
        } else {
          // Code to handle zero or negative amount_to_pay
          console.log(`for order ID: ${order.id}. Amount to pay is ${order.amount_to_pay}`);
          currentAmountToPay = parseFloat(currentAmountToPay) + parseFloat(total_bill_amount);
        }
        
        // const currentPenalty = parseFloat(penalty_amount);

        const updateQuery = `
          UPDATE bankorder 
          SET 
            amount_to_pay = $1, 
            kitty_due_date = $2, 
            no_of_late_payment = $3, 
            kitty_penalty = $4 
          WHERE member_id = $5
        `;
        
        const values = [
          currentAmountToPay, 
          due_date, 
          noOfLatePayment, 
          penalty_amount, 
          order.member_id
        ];
        
        try {
          await con.query(updateQuery, values);
          console.log(`Updated bank order for member ID: ${order.member_id}`);
        } catch (dbError) {
          console.error(`Error updating bank order for member ID: ${order.member_id}`, dbError);
        }
      }
    
    
    } else {
      console.log(`No member found for chapter in bank orders ${chapter_id}.`);
    }

    res.status(201).json({ message: "Kitty payment added successfully." });
  } catch (error) {
    console.error("Error adding kitty payment:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Fetch all active members
const getKittyPayments = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM kittypaymentchapter where delete_status = 0"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching kitty payments:", error);
    res.status(500).send("Error fetching kitty payments");
  }
};

const deleteKittyBill = async (req, res) => {
  const { payment_id } = req.params;
  console.log("payment id", payment_id);
  try {
    const result = await con.query(
      `UPDATE kittypaymentchapter SET delete_status = 1 WHERE kitty_bill_id = $1 RETURNING *`,
      [payment_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Kitty Bill marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Kitty Bill not found" });
    }
  } catch (error) {
    console.error("Error deleting Kitty bill:", error);
    res.status(500).json({ message: "Error deleting kitty bill" });
  }
};

const expenseType = async (req, res) => {
  try {
    const query = "SELECT * FROM expense_type WHERE delete_status = 0"; // Default query (non-deleted regions)
    const result = await con.query(query); // Execute the query
    res.json(result.rows); // Return filtered data
  } catch (error) {
    console.error("Error fetching expense types:", error);
    res.status(500).send("Error fetching expense types");
  }
};

const getAllVendors = async (req, res) => {
  try {
    const query = "SELECT * FROM vendors"; // Default query (non-deleted regions)
    const result = await con.query(query); // Execute the query
    res.json(result.rows); // Return filtered data
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).send("Error fetching vendors");
  }
};

const getAllDocNumbers = async (req, res) => {
  try {
    const query = "SELECT * FROM documentnumbers"; // Default query (non-deleted regions)
    const result = await con.query(query); // Execute the query
    res.json(result.rows); // Return filtered data
  } catch (error) {
    console.error("Error fetching documentnumbers:", error);
    res.status(500).send("Error fetching documentnumbers");
  }
};


// Fetch all active members
const allExpenses = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM expenses WHERE delete_status = 0"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).send("Error fetching expenses");
  }
};

const addExpenseType = async (req, res) => {
  const { expense_name, expense_status } = req.body;
  console.log("Expense Type:", expense_name, expense_status);
  // Validate required fields
  if (!expense_name || !expense_status) {
    return res.status(400).json({
      message: "Both expense_name and expense_status are required.",
    });
  }

  // Validate expense_status
  const validStatuses = ["active", "inactive"];
  if (!validStatuses.includes(expense_status.toLowerCase())) {
    return res.status(400).json({
      message:
        'Invalid expense_status. Allowed values are "active" or "inactive".',
    });
  }

  try {
    // Insert the expense type into the database
    const query = `
      INSERT INTO expense_type (expense_name, expense_status)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [expense_name, expense_status.toLowerCase()];
    const result = await con.query(query, values);

    // Return success response
    return res.status(201).json({
      message: "Expense Type added successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding expense type:", error);
    return res.status(500).json({
      message: "An error occurred while adding the expense type.",
      error: error.message,
    });
  }
};

const addExpense = async (req, res) => {
  try {
      console.log('\n🚀 Starting Add Expense Process');
      console.log('📝 Request Body:', req.body);
      console.log('📎 Files:', req.files);

      // Check if both files exist
      if (!req.files || !req.files.upload_bill || !req.files.upload_receipt) {
          console.error('❌ Required files are missing');
          return res.status(400).json({ message: "Both bill and receipt files are required" });
      }

      const billFile = req.files.upload_bill[0];
      const receiptFile = req.files.upload_receipt[0];

      // Parse numeric values
      const amount = parseFloat(req.body.amount);
      const gstPercentage = req.body.withGST === 'true' ? parseFloat(req.body.gstPercentage) : null;
      const gstAmount = req.body.withGST === 'true' ? parseFloat(req.body.gstAmount) : null;
      const totalAmount = req.body.withGST === 'true' ? parseFloat(req.body.totalAmount) : amount;
      
      // Insert expense record
      const result = await con.query(
          `INSERT INTO expenses (
              expense_type, submitted_by, description, amount, 
            payment_status, bill_date, upload_bill, upload_receipt,
            transaction_no, bill_no, chapter_id, hotel_id, vendor_id,
            mode_of_payment, gst_percentage, gst_amount, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
          RETURNING *`,
          [
              req.body.expense_type,
              req.body.submitted_by,
              req.body.description,
            amount,
              req.body.payment_status,
              req.body.bill_date,
            billFile.filename,
            receiptFile.filename,
              req.body.transaction_no,
              req.body.bill_no,
              req.body.chapter_id,
            req.body.hotel_id || null,
            req.body.vendor_id || null,
            req.body.payment_mode,
            gstPercentage,
            gstAmount,
            totalAmount
          ]
      );

      // Get the expense_id from the inserted record
      const expense_id = result.rows[0].expense_id;

      // Rename both files to include expense_id
      const renameBillFile = () => {
          const fileExt = path.extname(billFile.filename);
          const newFilename = `expense_bill_${expense_id}${fileExt}`;
          const oldPath = path.join(__dirname, 'uploads', 'expenses', billFile.filename);
      const newPath = path.join(__dirname, 'uploads', 'expenses', newFilename);
          fs.renameSync(oldPath, newPath);
          return newFilename;
      };

      const renameReceiptFile = () => {
          const fileExt = path.extname(receiptFile.filename);
          const newFilename = `expense_receipt_${expense_id}${fileExt}`;
          const oldPath = path.join(__dirname, 'uploads', 'expenses', receiptFile.filename);
          const newPath = path.join(__dirname, 'uploads', 'expenses', newFilename);
      fs.renameSync(oldPath, newPath);
          return newFilename;
      };

      const newBillFilename = renameBillFile();
      const newReceiptFilename = renameReceiptFile();

      // Update both filenames in database
      await con.query(
          'UPDATE expenses SET upload_bill = $1, upload_receipt = $2 WHERE expense_id = $3',
          [newBillFilename, newReceiptFilename, expense_id]
      );

      console.log('✅ Expense added successfully:', {
          id: expense_id,
          billFile: newBillFilename,
          receiptFile: newReceiptFilename,
          is_gst: result.rows[0].is_gst
      });

      res.status(201).json({
          message: "Expense added successfully!",
          data: {
              ...result.rows[0], 
              upload_bill: newBillFilename,
              upload_receipt: newReceiptFilename
          }
      });

  } catch (error) {
      console.error('❌ Error adding expense:', error);
      res.status(500).json({ 
          message: "Error adding expense",
          error: error.message 
      });
  }
};

const getExpenseById = async (req, res) => {
  const { expense_id } = req.params; // Extract expense_id from URL parameters

  try {
    // Query the database for the expense with the given expense_id
    const result = await con.query(
      "SELECT * FROM expenses WHERE expense_id = $1",
      [expense_id]
    );

    if (result.rows.length === 0) {
      // If no expense found, return a 404
      return res.status(404).json({ message: "Expense not found" });
    }

    // If expense is found, return the data
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    // Log any error and return a 500 response
    console.error("Error fetching expense:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// ... existing code ...

// ... existing code ...

const updateExpense = async (req, res) => {
  const {
    expense_type,
    submitted_by,
    description,
    chapter,
    vendor,
    amount,
    payment_status,
    payment_mode,
    bill_date,
    bill_no,
    transaction_no,
    gst_percentage,
    gst_amount,
    total_amount,
    vendor_id,
    vendor_name,
    vendor_company_name,
    vendor_company_address,
    vendor_company_gst,
    vendor_account,
    vendor_bank_name,
    vendor_ifsc_code,
    vendor_account_type,
    phone_number,
    email_id,
  } = req.body;

  const { expense_id } = req.params;

  try {
    console.log("🔄 Updating Expense ID:", expense_id);
    console.log("📝 Request Body:", req.body);
    console.log("📎 Uploaded Files:", req.file);

    if (!expense_id) {
      return res.status(400).json({ message: "Expense ID is required" });
    }

    // Handle file renaming logic like in addExpense
    let newBillFilename = null;
    let newReceiptFilename = null;

    if (req.files && req.files.upload_bill && req.files.upload_bill[0]) {
      const billFile = req.files.upload_bill[0];
      const billExt = path.extname(billFile.filename);
      newBillFilename = `expense_bill_${expense_id}${billExt}`;
      const oldBillPath = path.join(__dirname, "uploads", "expenses", billFile.filename);
      const newBillPath = path.join(__dirname, "uploads", "expenses", newBillFilename);
      fs.renameSync(oldBillPath, newBillPath);
    }

    if (req.files && req.files.upload_receipt && req.files.upload_receipt[0]) {
      const receiptFile = req.files.upload_receipt[0];
      const receiptExt = path.extname(receiptFile.filename);
      newReceiptFilename = `expense_receipt_${expense_id}${receiptExt}`;
      const oldReceiptPath = path.join(__dirname, "uploads", "expenses", receiptFile.filename);
      const newReceiptPath = path.join(__dirname, "uploads", "expenses", newReceiptFilename);
      fs.renameSync(oldReceiptPath, newReceiptPath);
    }

    // Build dynamic update query
    const query = [];
    const values = [];
    let index = 1;

    if (expense_type) query.push(`expense_type = $${index++}`), values.push(expense_type);
    if (submitted_by) query.push(`submitted_by = $${index++}`), values.push(submitted_by);
    if (description) query.push(`description = $${index++}`), values.push(description);
    if (chapter) query.push(`chapter_id = $${index++}`), values.push(chapter);
    if (vendor) query.push(`vendor_id = $${index++}`), values.push(vendor);
    if (amount) query.push(`amount = $${index++}`), values.push(amount);
    if (payment_status) query.push(`payment_status = $${index++}`), values.push(payment_status);
    if (payment_mode) query.push(`mode_of_payment = $${index++}`), values.push(payment_mode);
    if (bill_date) query.push(`bill_date = $${index++}`), values.push(bill_date);
    if (bill_no) query.push(`bill_no = $${index++}`), values.push(bill_no);
    if (transaction_no) query.push(`transaction_no = $${index++}`), values.push(transaction_no);
    if (gst_percentage) query.push(`gst_percentage = $${index++}`), values.push(gst_percentage);
    if (gst_amount) query.push(`gst_amount = $${index++}`), values.push(gst_amount);
    if (total_amount) query.push(`total_amount = $${index++}`), values.push(total_amount);
    if (newBillFilename) query.push(`upload_bill = $${index++}`), values.push(newBillFilename);
    if (newReceiptFilename) query.push(`upload_receipt = $${index++}`), values.push(newReceiptFilename);

    // Add expense_id for WHERE clause
    values.push(expense_id);

    const updateQuery = `
      UPDATE expenses
      SET ${query.join(", ")}
      WHERE expense_id = $${index}
      RETURNING *;
    `;

    const result = await con.query(updateQuery, values);

    // Update vendor details if vendor_id and fields are present
    if (vendor_id) {
      const vendorFields = {
        vendor_name,
        vendor_company_name,
        vendor_company_address,
        vendor_company_gst,
        vendor_account,
        vendor_bank_name,
        vendor_ifsc_code,
        vendor_account_type,
        phone_number,
        email_id,
      };
      const setParts = [];
      const vendorValues = [];
      let idx = 1;
      for (const [key, value] of Object.entries(vendorFields)) {
        if (value !== undefined && value !== null && value !== "") {
          setParts.push(`${key} = $${idx++}`);
          vendorValues.push(value);
        }
      }
      if (setParts.length > 0) {
        vendorValues.push(vendor_id);
        const vendorUpdateQuery = `
          UPDATE vendors
          SET ${setParts.join(", ")}
          WHERE vendor_id = $${idx};
        `;
        await con.query(vendorUpdateQuery, vendorValues);
      }
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({
      message: "Expense updated successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error updating Expense:", error);
    res.status(500).json({
      message: "Error updating Expense",
      error: error.message,
    });
  }
};


// ... existing code ...

// ... existing code ...
const deleteExpense = async (req, res) => {
  const { expense_id } = req.params; // Get expense_id from URL params

  try {
    // Validate expense_id
    if (!expense_id) {
      return res.status(400).json({ message: "Expense ID is required" });
    }

    // Check if the expense exists
    const fetchQuery = `SELECT * FROM expenses WHERE expense_id = $1 AND delete_status = 0;`;
    const fetchResult = await con.query(fetchQuery, [expense_id]);

    if (fetchResult.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Expense not found or already deleted" });
    }

    // Update delete_status to 1 (soft delete)
    const deleteQuery = `
      UPDATE expenses
      SET delete_status = 1
      WHERE expense_id = $1
      RETURNING *;
    `;
    const deleteResult = await con.query(deleteQuery, [expense_id]);

    // Respond with the updated data
    res.status(200).json({
      message: "Expense deleted successfully (soft delete)",
      data: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Error deleting Expense:", error);
    res.status(500).json({
      message: "Error deleting Expense",
      error: error.message,
    });
  }
};

const updateMemberSettings = async (req, res) => {
  try {
    console.log("🚀 Starting member settings update");
    console.log("📝 Received request body:", req.body);
    console.log("📎 Received files:", req.files);

    const {
      member_email_address,
      member_phone_number,
      member_company_address,
      member_company_name,
      member_gst_number,
      member_facebook,
      member_instagram,
      member_linkedin,
      member_youtube,
    } = req.body;

    // Initialize file paths
    let photoPath = null;
    let aadharPath = null;
    let panPath = null;
    let gstCertPath = null;

    // Handle multiple file uploads
    if (req.files) {
      console.log("📁 Processing uploaded files");
      
      if (req.files.member_photo) {
        photoPath = req.files.member_photo[0].filename;
        console.log("🖼️ Member photo uploaded:", photoPath);
      }
      
      if (req.files.member_aadhar) {
        aadharPath = req.files.member_aadhar[0].filename;
        console.log("📄 Aadhar card uploaded:", aadharPath);
      }
      
      if (req.files.member_pan) {
        panPath = req.files.member_pan[0].filename;
        console.log("📄 PAN card uploaded:", panPath);
      }
      
      if (req.files.member_gst_cert) {
        gstCertPath = req.files.member_gst_cert[0].filename;
        console.log("📄 GST certificate uploaded:", gstCertPath);
      }
    }

    // Dynamically build the query
    let queryParts = [
      'member_phone_number = $1',
      'member_company_address = $2',
      'member_company_name = $3',
      'member_gst_number = $4',
      'member_facebook = $5',
      'member_instagram = $6',
      'member_linkedin = $7',
      'member_youtube = $8'
    ];

    let values = [
      member_phone_number,
      member_company_address,
      member_company_name,
      member_gst_number,
      member_facebook || '',
      member_instagram || '',
      member_linkedin || '',
      member_youtube || ''
    ];

    let paramCounter = 9;

    // Add file paths to query if they exist
    if (photoPath) {
      queryParts.push(`member_photo = $${paramCounter}`);
      values.push(photoPath);
      paramCounter++;
    }
    if (aadharPath) {
      queryParts.push(`member_aadhar_image = $${paramCounter}`);
      values.push(aadharPath);
      paramCounter++;
    }
    if (panPath) {
      queryParts.push(`member_PAN_image = $${paramCounter}`);
      values.push(panPath);
      paramCounter++;
    }
    if (gstCertPath) {
      queryParts.push(`member_GST_certificate_image = $${paramCounter}`);
      values.push(gstCertPath);
      paramCounter++;
    }

    // Add email to values array
    values.push(member_email_address);

    // Construct the final query
    const query = `
      UPDATE member 
      SET ${queryParts.join(', ')}
      WHERE member_email_address = $${paramCounter}
      RETURNING *`;

    console.log("🔍 Executing query:", query);
    console.log("📊 Query values:", values);

    const result = await con.query(query, values);

    if (result.rows.length === 0) {
      console.log("❌ No member found with email:", member_email_address);
      return res.status(404).json({ message: "Member not found with this email" });
    }

    console.log("✅ Update successful");
    res.json({
      message: "Member settings updated successfully",
      data: result.rows[0],
      files: {
        photo: photoPath,
        aadhar: aadharPath,
        pan: panPath,
        gst_cert: gstCertPath
      }
    });
  } catch (error) {
    console.error("❌ Error in updateMemberSettings:", error);
    res.status(500).json({
      message: "Error updating member settings",
      error: error.message,
    });
  }
};
const updateUserSettings = async (req, res) => {
  try {
    const {
      company_name,
      company_address,
      company_gst,
      company_email,
      company_phone,
      company_account_number,
      company_ifsc_code,
      company_bank_branch,
      company_facebook,
      company_twitter,
      company_youtube,
      company_instagram,
    } = req.body;

    // Update query
    const updateQuery = `
            UPDATE company 
            SET 
                company_name = $1,
                company_address = $2,
                company_gst = $3,
                company_email = $4,
                company_phone = $5,
                company_account_number = $6,
                company_ifsc_code = $7,
                company_bank_branch = $8,
                company_facebook = $9,
                company_twitter = $10,
                company_youtube = $11,
                company_instagram = $12
            WHERE company_id = 1
            RETURNING *
        `;

    const result = await con.query(updateQuery, [
      company_name,
      company_address,
      company_gst,
      company_email,
      company_phone,
      company_account_number,
      company_ifsc_code,
      company_bank_branch,
      company_facebook || null, // If empty, save as null
      company_twitter || null, // If empty, save as null
      company_youtube || null, // If empty, save as null
      company_instagram || null, // If empty, save as null
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      message: "Company settings updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating company settings:", error);
    res.status(400).json({
      message: "Error updating company settings",
      error: error.toString(),
    });
  }
};

const updateLogo = async (req, res) => {
  try {
    console.log("Received logo update request:", req.body);
    const { display_image_name, display_status, added_by } = req.body;

    // Update query - since there's only one record, we don't need an ID
    const query = `
            UPDATE display_logo 
            SET 
                display_image_name = $1,
                display_status = $2,
                added_by = $3,
                added_on = CURRENT_TIMESTAMP
            WHERE display_id = 1
            RETURNING *`;

    const result = await con.query(query, [
      display_image_name,
      display_status,
      added_by,
    ]);

    if (result.rows.length === 0) {
      console.log("No logo settings found");
      return res.status(404).json({ message: "Logo settings not found" });
    }

    console.log("Logo update successful");
    res.json({
      message: "Logo settings updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error in updateLogo:", error);
    res.status(500).json({
      message: "Error updating logo settings",
      error: error.message,
    });
  }
};

const updateGstTypeValues = async (req, res) => {
  try {
    console.log("Received GST type values update request:", req.body);
    const { gst_value_id, vat_value_id } = req.body;

    // First, update all GST values (type_id = 1) to inactive
    await con.query(`
            UPDATE gst_type_values 
            SET active_status = 'inactive' 
            WHERE gst_type_name_id = 1
        `);

    // Then set only the selected GST value to active
    await con.query(
      `
            UPDATE gst_type_values 
            SET active_status = 'active' 
            WHERE gst_value_id = $1
        `,
      [gst_value_id]
    );

    // Next, update all VAT values (type_id = 2) to inactive
    await con.query(`
            UPDATE gst_type_values 
            SET active_status = 'inactive' 
            WHERE gst_type_name_id = 2
        `);

    // Finally, set only the selected VAT value to active
    await con.query(
      `
            UPDATE gst_type_values 
            SET active_status = 'active' 
            WHERE gst_value_id = $1
        `,
      [vat_value_id]
    );

    // Fetch the updated values to return in response
    const result = await con.query(`
            SELECT * FROM gst_type_values 
            WHERE gst_type_name_id IN (1, 2)
            ORDER BY gst_type_name_id, gst_value_id
        `);

    console.log("Update successful");
    res.json({
      message: "GST type values updated successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error in updateGstTypeValues:", error);
    res.status(500).json({
      message: "Error updating GST type values",
      error: error.message,
    });
  }
};

const updateUserPassword = async (req, res) => {
  console.log("Starting password update process in backend");
  const { currentPassword, newPassword, email } = req.body;

  try {
    console.log("Checking for user with email:", email);

    // Get the current password hash for the specific user
    const userResult = await con.query(
      "SELECT password_hash FROM users WHERE email = $1 AND is_active = true",
      [email]
    );

    console.log(
      "User query result:",
      userResult.rows.length > 0 ? "User found" : "User not found"
    );

    if (userResult.rows.length === 0) {
      console.error("No active user found with email:", email);
      return res.status(404).json({
        success: false,
        message: "No active user found",
      });
    }

    // Verify current password
    console.log("Verifying current password");
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password_hash
    );
    console.log("Password verification result:", isPasswordValid);

    if (!isPasswordValid) {
      console.error("Current password is incorrect");
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash the new password
    console.log("Hashing new password");
    const saltRounds = 6;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password for the specific user
    console.log("Updating password in database");
    await con.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 AND is_active = true",
      [newPasswordHash, email]
    );

    console.log("Password updated successfully");
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in updateUserPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating password",
    });
  }
};

const getDisplayLogo = async (req, res) => {
  try {
    // console.log("Fetching display logo...");

    const result = await con.query(
      "SELECT display_id, display_image_name, display_status, added_by, added_on FROM display_logo WHERE display_status = 'active' ORDER BY display_id DESC LIMIT 1"
    );

    // console.log("Query result:", result.rows);

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      console.log("No active logo found");
      res.json([]);
    }
  } catch (error) {
    console.error("Error fetching display logo:", error);
    res.status(500).json({ error: "Error fetching display logo" });
  }
};

const getGstType = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM gst_type where active_status = 'active' "
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching gst type:", error);
    res.status(500).send("Error fetching gst type");
  }
};

const getGstTypeValues = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM gst_type_values ");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching gst type values:", error);
    res.status(500).send("Error fetching gst type values");
  }
};
const getMemberByEmail = async (req, res) => {
  const { email } = req.params; // Get email from route parameters
  console.log(email);
  try {
    // Use a parameterized query to safely insert the email into the SQL statement
    const result = await con.query(
      "SELECT * FROM member WHERE member_email_address = $1",
      [email.toLowerCase()] // Convert email to lowercase to handle case-insensitivity
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).send("Error fetching member");
  }
};

// Function to send QR code by email
const sendQrCodeByEmail = async (req, res) => {
  const {
    orderId,
    cfPaymentId,
    page_title,
    training_name,
    training_venue,
    training_ticket_price,
    training_date,
    training_published_by,
    training_id,
    customerId,
  } = req.body;

  console.log(
    "Received request to send QR code for orderId:",
    orderId,
    "and cfPaymentId:",
    cfPaymentId
  );
  console.log(req.body);

  try {
    // Fetch order details to get customer email
    const orderResponse = await fetch(
      `http://localhost:5000/api/allOrders`
    );
    const orders = await orderResponse.json();

    // Find the order by orderId
    const order = orders.find((o) => o.order_id === orderId);

    if (!order) {
      console.error("Order not found for ID:", orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    const customerEmail = order.customer_email;
    if (!customerEmail) {
      console.error("Customer email not found for order ID:", orderId);
      return res.status(404).json({ message: "Customer email not found" });
    }

    console.log("Customer email found:", customerEmail);

    // Generate the QR code and save it as a temporary file
    const qrCodeImagePath = path.join(
      __dirname,
      "checkinTrainings",
      `qr_code_${orderId}.png`
    );
    await QRCode.toFile(qrCodeImagePath, cfPaymentId); // Generate QR code as a file

    // Define PDF path within checkinTrainings folder
    const pdfFolderPath = path.join(__dirname, "checkinTrainings");
    const pdfPath = path.join(pdfFolderPath, `training_${orderId}.pdf`);
    console.log("PDF will be saved at:", pdfPath);

    // Create PDF with QR code and training details
    const doc = new PDFDocument();
    const pdfWriteStream = fs.createWriteStream(pdfPath);
    doc.pipe(pdfWriteStream);

    doc.fontSize(20).text(page_title, { align: "center" }).moveDown();

    doc
      .fontSize(14)
      .text(`Training Name: ${training_name}`)
      .text(`Venue: ${training_venue}`)
      .text(`Ticket Price: ${training_ticket_price}`)
      .text(`Date: ${training_date}`)
      .text(`Training By: ${training_published_by}`)
      .moveDown();

    doc.text("QR Code:", { align: "left" });

    // Embed the QR code image in the PDF
    doc.image(qrCodeImagePath, { width: 200, height: 200, align: "center" });

    // Finish and close the PDF document
    doc.end();

    // Wait for the PDF file to be fully written before checking its existence
    pdfWriteStream.on("finish", () => {
      console.log("PDF created successfully:", pdfPath);

      // Check if the PDF exists after the file is fully written
      if (!fs.existsSync(pdfPath)) {
        console.error("PDF file does not exist at path:", pdfPath);
        return res.status(500).json({ message: "PDF file does not exist" });
      }

      // Set up nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: "server.bninewdelhi.com",
        port: 587,
        secure: false,
        auth: {
          user: "info@bninewdelhi.in",
          pass: "PzfE8JH93pV1RUx",
        },
      });

      // Format the training details into the email
      const emailContent = `
        <h2>${page_title}</h2>
        <p><strong>Training Name:</strong> ${training_name}</p>
        <p><strong>Venue:</strong> ${training_venue}</p>
        <p><strong>Ticket Price:</strong> ${training_ticket_price}</p>
        <p><strong>Date:</strong> ${training_date}</p>
        <p><strong>Training By:</strong> ${training_published_by}</p>
        <p>Here is your generated QR code:</p>
        <img src="cid:qr_code_image" alt="QR Code" width="200" height="200">
        <p>Attached is a PDF with the QR code and training details.</p>
      `;

      // Email options
      const mailOptions = {
        from: "info@bninewdelhi.in",
        to: customerEmail,
        subject: `Training Details & QR Code for ${training_name}`,
        html: emailContent,
        attachments: [
          {
            filename: `training_${orderId}.pdf`,
            path: pdfPath,
          },
          {
            filename: `qr_code_${orderId}.png`,
            path: qrCodeImagePath,
            cid: "qr_code_image", // This is used to embed the image in the email body
          },
        ],
      };

      // Send email and handle errors
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          return res.status(500).json({ message: "Error sending email" });
        } else {
          console.log("Email sent successfully:", info.response);

          // Clean up temporary QR code and PDF files after confirming email is sent
          fs.unlinkSync(qrCodeImagePath);
          fs.unlinkSync(pdfPath);
          console.log("Temporary files removed after sending.");

          return res.status(200).json({
            message: "QR code and training details sent successfully",
          });
        }
      });
    });

    // Insert record into the training_checkin table
    const query = `
      INSERT INTO training_checkin (
        training_id, order_id, transaction_id, qr_code_generated, qr_code_generated_on, checked_in
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING checkin_id
    `;

    const values = [
      training_id,
      orderId,
      cfPaymentId,
      true, // qr_code_generated
      new Date(), // qr_code_generated_on
      false, // checked_in
    ];

    const result = await con.query(query, values);
    console.log(
      "Details stored in training_checkin table with checkin_id:",
      result.rows[0].checkin_id
    );
  } catch (error) {
    console.error("Error sending QR code and training details:", error);
    return res
      .status(500)
      .json({ message: "Error sending QR code and training details" });
  }
};

// Function to generate QR code
const generateQRCode = async (data) => {
  try {
    const qrCodeImage = await QRCode.toDataURL(data); // Generates a QR code as a data URL
    return qrCodeImage;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

const markAttendence = async (req, res) => {
  const { transaction_id, training_id, orderId, customerId } = req.body;

  console.log("Request Body:", req.body);

  if (!transaction_id) {
    return res
      .status(400)
      .json({ success: false, message: "Transaction ID is required." });
  }

  try {
    // Check if the transaction exists and fetch the `checked_in` status
    const checkQuery =
      "SELECT checked_in FROM training_checkin WHERE transaction_id = $1";
    const checkResult = await con.query(checkQuery, [transaction_id]);

    console.log("Check Query Result:", checkResult.rows);

    if (checkResult.rows.length === 0) {
      // Transaction not found, insert a new record
      const insertQuery = `
        INSERT INTO training_checkin (
          order_id, transaction_id, member_id, training_id, qr_code_generated, qr_code_generated_on, checked_in
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
      const insertResult = await con.query(insertQuery, [
        orderId,
        transaction_id,
        customerId,
        training_id,
        false, // qr_code_generated
        null, // qr_code_generated_on
        true, // checked_in
      ]);

      console.log("Insert Query Result:", insertResult.rows);

      return res.status(201).json({
        success: true,
        message:
          "Attendance marked successfully. Transaction was not previously found, so it was created.",
        data: insertResult.rows[0],
      });
    }

    // Fetch the `checked_in` status
    const isCheckedIn = checkResult.rows[0].checked_in;

    console.log("Checked In Status:", isCheckedIn);

    // If `checked_in` is true, return an error message
    if (isCheckedIn === true) {
      return res
        .status(400)
        .json({ success: false, message: "Member has already checked in." });
    }

    // Update the `checked_in` field to true
    const updateQuery =
      "UPDATE training_checkin SET checked_in = true WHERE transaction_id = $1 RETURNING *";
    const updateResult = await con.query(updateQuery, [transaction_id]);

    console.log("Update Query Result:", updateResult.rows);

    if (updateResult.rowCount > 0) {
      return res.json({
        success: true,
        message: "Attendance marked successfully.",
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to mark attendance." });
    }
  } catch (error) {
    console.error("Error updating attendance:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const verifyQrCode = async (req, res) => {
  const { cfPaymentId, confirmAttendance } = req.body;
  const loggedInEmail = req.headers["loggedin-email"]; // Pass this from the frontend
  const loginType = req.headers["login-type"]; // Pass this from the frontend

  if (loginType !== "ro_admin") {
    return res
      .status(403)
      .json({ message: "Unauthorized: You are not allowed to scan QR codes." });
  }

  try {
    // Fetch the transaction from the `training_checkin` table
    const transactionQuery =
      "SELECT * FROM training_checkin WHERE transaction_id = $1";
    const transactionResult = await con.query(transactionQuery, [cfPaymentId]);

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = transactionResult.rows[0];

    // Check if the member is already checked in
    if (transaction.checked_in) {
      return res
        .status(400)
        .json({ message: "Member has already checked in." });
    }

    // If only verifying the QR code without marking attendance
    if (!confirmAttendance) {
      return res.status(200).json({ message: "QR code verified", transaction });
    }

    // Mark attendance if confirmation is provided
    const updateQuery =
      "UPDATE training_checkin SET checked_in = true WHERE transaction_id = $1";
    await con.query(updateQuery, [cfPaymentId]);

    res.status(200).json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error verifying QR code:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Backend: Adjusted to filter based on query parameter
const allCheckins = async (req, res) => {
  try {
    const query = "SELECT * FROM training_checkin"; // Default query (non-deleted regions)

    const result = await con.query(query); // Execute the query
    res.json(result.rows); // Return filtered data
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).send("Error fetching regions");
  }
};

// Fetch all active members
const getAllKittyPayments = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM kittypaymentchapter");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all kitty payments:", error);
    res.status(500).send("Error fetching all kitty payments");
  }
};

const getCancelIrn = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM cancel_irn");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching cancel irn:", error);
    res.status(500).send("Error fetching all cancel irn");
  }
};

const updatePaymentGatewayStatus = async (req, res) => {
  const { gateway_id } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ 
        message: "Status must be either 'active' or 'inactive'" 
      });
    }

    // If setting to active, first set all gateways to inactive
    if (status === 'active') {
      await con.query(
        "UPDATE paymentgateways SET status = 'inactive'"
      );
    }

    // Update the specified gateway
    const result = await con.query(
      `UPDATE paymentgateways 
       SET status = $1 
       WHERE gateway_id = $2 
       RETURNING *`,
      [status, gateway_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "Payment gateway not found" 
      });
    }

    res.status(200).json({
      message: "Payment gateway status updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error updating payment gateway status:", error);
    res.status(500).json({ 
      message: "Error updating payment gateway status" 
    });
  }
};

// added by vasusri
const addPendingAmount =async (req, res)=>{
  const { 
    chapter_id,
    member_id,
    kitty_id,
    member_pending_balance,
    total_amount_paid,
    tax,
    date_of_update
  } = req.body;
  try {
    console.log("add Pending controller runs");
    
    console.log(chapter_id, member_id, kitty_id, member_pending_balance, total_amount_paid, tax, date_of_update);

    // Validate required fields
    if (!kitty_id || !chapter_id || !member_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: kitty_id, chapter_id and member_id are required" 
      });
    }

    // Generate a unique transaction ID (you can modify this as per your requirements)
    // const transaction_id = `TR${Date.now()}`;

    const query = `
      INSERT INTO memberpendingkittyopeningbalance (
      chapter_id,
      member_id,
      kitty_id,
      member_pending_balance,
      total_amount_paid,
      tax,
      date_of_update
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`;

    const values = [
      chapter_id,
      member_id,
      kitty_id,
      member_pending_balance,
      total_amount_paid,
      tax,
      date_of_update
    ];

    const result = await con.query(query, values);

    res.status(201).json({
      success: true,
      message: "Balance added successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error adding pending amount:", error);
    res.status(500).json({
      success: false,
      message: "Error adding Pending amount",
      error: error.message
    });
  }
}


// create by vasu Sri
const getPendingAmount = async (req, res) => {
  // const { member_id, chapter_id, kitty_id } = req.body; 
  const { member_id, chapter_id, kitty_id } = req.query;
  console.log("member_id, chapter_id, kitty_id",member_id, chapter_id, kitty_id);
  try {
    const result = await con.query(
          "SELECT * FROM memberpendingkittyopeningbalance WHERE member_id = $1 AND chapter_id = $2 AND kitty_id = $3",
  [member_id, chapter_id, kitty_id]
        );

    // const result = await con.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Pending balance data found"
      });
    }

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error("Error fetching pending balance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending balance",
      error: error.message
    });
  }
};



// Fetch all active members
const memberPendingKittyOpeningBalance = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM memberpendingkittyopeningbalance");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all memberpendingkittyopeningbalance:", error);
    res.status(500).send("Error fetching all memberpendingkittyopeningbalance");
  }
};

const updateChapterSettings = async (req, res) => {
  console.log('Starting updateChapterSettings controller...');
  
  try {
      console.log('Request body:', req.body);
      const {
          email_id,
          contact_number,
          contact_person,
          chapter_mission,
          chapter_vision,
          street_address_line,
          postal_code,
          chapter_facebook,
          chapter_instagram,
          chapter_linkedin,
          chapter_youtube
      } = req.body;
      console.log(email_id, contact_number, contact_person, chapter_mission, chapter_vision, street_address_line, postal_code, chapter_facebook, chapter_instagram, chapter_linkedin, chapter_youtube);

      if (!email_id) {
          console.error('Email ID is required');
          return res.status(400).json({
              success: false,
              message: 'Email ID is required'
          });
      }

      let updateQuery = `
          UPDATE chapter 
          SET 
              contact_number = COALESCE($1, contact_number),
              contact_person = COALESCE($2, contact_person),
              chapter_mission = COALESCE($3, chapter_mission),
              chapter_vision = COALESCE($4, chapter_vision),
              street_address_line = COALESCE($5, street_address_line),
              postal_code = COALESCE($6, postal_code),
              chapter_facebook = COALESCE($7, chapter_facebook),
              chapter_instagram = COALESCE($8, chapter_instagram),
              chapter_linkedin = COALESCE($9, chapter_linkedin),
              chapter_youtube = COALESCE($10, chapter_youtube)
      `;

      const queryParams = [
          contact_number,
          contact_person,
          chapter_mission,
          chapter_vision,
          street_address_line,
          postal_code,
          chapter_facebook,
          chapter_instagram,
          chapter_linkedin,
          chapter_youtube
      ];

      // Handle file upload if present
      if (req.file) {
          console.log('File uploaded:', req.file);
          const photoPath = `${req.file.filename}`;
          updateQuery += `, chapter_logo = $11`;
          queryParams.push(photoPath);
      }

      updateQuery += ` WHERE email_id = $${queryParams.length + 1} RETURNING *`;
      queryParams.push(email_id);

      const result = await con.query(updateQuery, queryParams);

      if (result.rows.length === 0) {
          console.error('No chapter found with email:', email_id);
          return res.status(404).json({
              success: false,
              message: 'Chapter not found'
          });
      }

      // Add the logo URL to the response
      const updatedChapter = result.rows[0];
      if (updatedChapter.chapter_logo) {
          updatedChapter.chapter_logo_url = `http://localhost:5000/api/uploads/chapterLogos/${updatedChapter.chapter_logo}`;
      }

      console.log('Chapter updated successfully:', updatedChapter);
      res.status(200).json({
          success: true,
          message: 'Chapter settings updated successfully',
          data: updatedChapter
      });

  } catch (error) {
      console.error('Error in updateChapterSettings:', error);
      res.status(500).json({
          success: false,
          message: 'Error updating chapter settings',
          error: error.message
      });
  }
};

const addInvoiceManually = async (req, res) => {
  const { customer_details, payment_details } = req.body;
  console.log(customer_details);
  console.log(payment_details);

  try {
    // Generate random order_id and transaction_id
    const order_id = `ORD${Date.now()}`;
    const cf_payment_id = `TRX${Date.now()}`;

    // Define default values
    const defaultValues = {
      order_amount: 0,
      order_currency: "INR",
      payment_gateway_id: null,
      member_id: null,
      chapter_id: null,
      region_id: null,
      universal_link_id: null,
      ulid_id: null,
      order_status: "pending",
      payment_session_id: null,
      one_time_registration_fee: 0,
      membership_fee: 0,
      tax: 0,
      memberName: "Unknown",
      customer_email: "unknown@example.com",
      customer_phone: "0000000000",
      gstin: null,
      company: "Unknown",
      mobileNumber: "0000000000",
      renewalYear: null,
      payment_note: null,
      trainingId: null,
      eventId: null,
      kitty_bill_id: null,
      payment_amount: 0,
      payment_currency: "INR",
      payment_status: "pending",
      payment_message: null,
      payment_time: new Date(),
      payment_completion_time: null,
      bank_reference: null,
      auth_id: null,
      payment_method: {},
      error_details: {},
      gateway_order_id: null,
      gateway_payment_id: null,
      payment_group: null,
    };

    // Prepare order data with default values
    const orderData = [
      order_id,
      payment_details.order_amount || defaultValues.order_amount,
      payment_details.order_currency || defaultValues.order_currency,
      customer_details.payment_gateway_id || defaultValues.payment_gateway_id,
      customer_details.member_id || defaultValues.member_id,
      customer_details.chapter_id || defaultValues.chapter_id,
      customer_details.region_id || defaultValues.region_id,
      customer_details.universal_link_id || defaultValues.universal_link_id,
      customer_details.ulid_id || defaultValues.ulid_id,
      payment_details.order_status || defaultValues.order_status,
      payment_details.payment_session_id || defaultValues.payment_session_id,
      customer_details.one_time_registration_fee || defaultValues.one_time_registration_fee,
      customer_details.membership_fee || defaultValues.membership_fee,
      customer_details.tax || defaultValues.tax,
      customer_details.memberName || defaultValues.memberName,
      customer_details.customer_email || defaultValues.customer_email,
      customer_details.customer_phone || defaultValues.customer_phone,
      customer_details.gstin || defaultValues.gstin,
      customer_details.company || defaultValues.company,
      customer_details.mobileNumber || defaultValues.mobileNumber,
      customer_details.renewalYear || defaultValues.renewalYear,
      customer_details.payment_note || defaultValues.payment_note,
      customer_details.trainingId || defaultValues.trainingId,
      customer_details.eventId || defaultValues.eventId,
      customer_details.kitty_bill_id || defaultValues.kitty_bill_id,
    ];

    // Insert into Orders table
    await con.query(
      `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
      orderData
    );

    // Prepare transaction data with default values
    const transactionData = [
      cf_payment_id,
      order_id,
      customer_details.payment_gateway_id || defaultValues.payment_gateway_id, // Assume 999 for cash
      payment_details.payment_amount || defaultValues.payment_amount,
      payment_details.payment_currency || defaultValues.payment_currency,
      payment_details.payment_status || defaultValues.payment_status,
      payment_details.payment_message || defaultValues.payment_message,
      payment_details.payment_time || defaultValues.payment_time,
      payment_details.payment_completion_time || defaultValues.payment_completion_time,
      payment_details.bank_reference || defaultValues.bank_reference,
      payment_details.auth_id || defaultValues.auth_id,
      JSON.stringify(payment_details.payment_method || defaultValues.payment_method),
      JSON.stringify(payment_details.error_details || defaultValues.error_details),
      payment_details.gateway_order_id || defaultValues.gateway_order_id,
      payment_details.gateway_payment_id || defaultValues.gateway_payment_id,
      payment_details.payment_group || defaultValues.payment_group,
    ];

    // Insert into Transactions table
    await con.query(
      `INSERT INTO Transactions 
        (cf_payment_id, order_id, payment_gateway_id, payment_amount, payment_currency, payment_status, 
         payment_message, payment_time, payment_completion_time, bank_reference, auth_id, payment_method, 
         error_details, gateway_order_id, gateway_payment_id, payment_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      transactionData
    );

    res.status(201).json({
      message: "Order and transaction added successfully",
      order_id,
      cf_payment_id,
    });
  } catch (error) {
    console.error("Error adding order and transaction:", error);
    res.status(500).json({ message: "Error adding order and transaction" });
  }
};


const getAllMemberCredit = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM memberkittycredit");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all member credit:", error);
    res.status(500).send("Error fetching all member credit");
  }
};



const addMemberCredit = async (req, res) => {
  let { member_id, chapter_id, credit_amount, credit_date, credit_type } = req.body;

  // Ensure member_id is always an array
  if (!Array.isArray(member_id)) {
    member_id = [member_id]; // Convert single member_id to array
  }
  

  try {
    const query = `
      INSERT INTO memberkittycredit (member_id, chapter_id, credit_amount, credit_date, is_adjusted, credit_type) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    let insertedRecords = [];

    const response = await fetch("http://localhost:5000/api/getbankOrder");
    const bankOrders = await response.json();

    
    for (const id of member_id) {
      const values = [parseInt(id), chapter_id, credit_amount, credit_date, false, credit_type]; // Ensure member_id is an integer
      const result = await con.query(query, values);
      insertedRecords.push(result.rows[0]);
    const matchedBankOrder = bankOrders.find(order => parseFloat(id) === parseFloat(order.member_id) && order.chapter_id === parseFloat(chapter_id));
    if (matchedBankOrder) {
      console.log("Matched Bank Order:", matchedBankOrder);
     
        const updateQuery = `
          UPDATE bankorder 
          SET amount_to_pay = amount_to_pay - $1 
          WHERE member_id = $2 AND chapter_id = $3 
          RETURNING *;
        `;
        const values = [credit_amount, matchedBankOrder.member_id, matchedBankOrder.chapter_id];
        const updateResult = await con.query(updateQuery, values);
        console.log("Updated Matched Bank Order:", updateResult.rows[0]);
      
      // You can add any additional logic here if needed
    } else {
      console.log("No matching bank order found for member_id:", id);
    }

    
    }


    res.status(201).json({ message: "Credit added successfully!", data: insertedRecords });
  } catch (error) {
    console.error("Error adding credit:", error);
    res.status(500).send("Error adding credit");
  }
};

const getInterviewSheetQuestions = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM interview_sheet_questions");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching interview sheet questions:", error);
    res.status(500).send("Error fetching interview sheet questions");
  }
};

const getCommitmentSheet = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM commitmentsheet");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching commitment sheet:", error);
    res.status(500).send("Error fetching commitment sheet");
  }
};

const insertCommitmentSheet = async (req, res) => {
  const {
    visitorName, chapter, chequeNum, chequeDate, bank, address,
    agree1, agree2, agree3, agree4, agree5, agree6, agree7, agree8, agree9,
    agree10, agree11, agree12, agree13, category, companyName, date,
    email, gstin, inductionDate, mobile, name, neftNum, sign, sponsor,
    visitor_id, vpsign
  } = req.body;

  console.log("data",req.body);

  try {
    const query = `
      INSERT INTO commitmentsheet (
        visitorName, chapter, chequeNum, chequeDate, bank, address,
        agree1, agree2, agree3, agree4, agree5, agree6, agree7, agree8, agree9,
        agree10, agree11, agree12, agree13, category, companyName, date,
        email, gstin, inductionDate, mobile, name, neftNum, sign, sponsor,
        visitor_id, vpsign
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) RETURNING commitment_id;
    `;
    
    const values = [
      visitorName, chapter, chequeNum, chequeDate, bank, address,
      agree1, agree2, agree3, agree4, agree5, agree6, agree7, agree8, agree9,
      agree10, agree11, agree12, agree13, category, companyName, date,
      email, gstin, inductionDate, mobile, name, neftNum, sign, sponsor,
      visitor_id, vpsign
    ];

    const result = await con.query(query, values); 
    console.log("added commitment data");
    const updateVisitorQuery = 'UPDATE Visitors SET commitment_sheet = $1 WHERE visitor_id = $2';
    const updateValues = [true, visitor_id];

    await con.query(updateVisitorQuery, updateValues)
      .then(() => console.log("Updated visitor commitment_sheet status successfully"))
      .catch(err => console.error("Error updating visitor commitment_sheet status:", err));
    console.log("visitor data also updated");
    res.status(201).json({
      message: 'Commitment data inserted successfully',
      commitment_id: result.rows[0].commitment_id 
    });
  } catch (error) {
    console.error("Error inserting commitment sheet:", error);
    res.status(500).send("Error inserting commitment sheet");
  }
};


const getInterviewSheetAnswers = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM interview_sheet_answers");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching interview sheet annswers:", error);
    res.status(500).send("Error fetching interview sheet answers");
  }
};

const addInterviewSheetAnswers = async (req, res) => {
  try {
    const { 
      visitorName,
      visitor_id,
      interviewBy,
      applicantSign,
      date,
      commitmentChapter,
      dynamicAnswers 
    } = req.body;

    console.log("body:", req.body);
    const insertPromises = [];

    for (const [questionId, answer] of Object.entries(dynamicAnswers)) {
    
      if (isNaN(parseInt(questionId))) {
        console.log(`Skipping invalid question ID: ${questionId}`);
        continue;
      }

      const query = `
        INSERT INTO interview_sheet_answers (
          question_id,
          answer,
          delete_status,
          status,
          chapter_id,
          member_name,
          interview_by,
          applicant_signature,
          interview_date,
          visitor_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;

      const parsedChapterId = parseInt(commitmentChapter);
      if (isNaN(parsedChapterId)) {
        throw new Error('Invalid chapter ID provided');
      }

      const values = [
        parseInt(questionId),
        answer,
        false,
        'active',
        parsedChapterId,
        visitorName,
        interviewBy,
        applicantSign,
        date,
        visitor_id
      ];

      insertPromises.push(con.query(query, values));
    }

    const results = await Promise.all(insertPromises);
    console.log("added done...");
    const updateVisitorQuery = 'UPDATE Visitors SET interview_sheet = $1 WHERE visitor_id = $2';
    const updateValues = [true, visitor_id];

    await con.query(updateVisitorQuery, updateValues)
      .then(() => console.log("Updated visitor interview_sheet status successfully"))
      .catch(err => console.error("Error updating visitor interview_sheet status:", err));
    console.log("visitor data also updated");
    res.status(201).json({
      message: "Interview sheet answers added successfully!",
      data: results.map(result => result.rows[0])
    });

  } catch (error) {
    console.error("Error adding interview sheet answers:", error);
    res.status(500).json({
      error: "Error adding interview sheet answers",
      details: error.message
    });
  }
};

const getInclusionSheet = async (req, res) => {
  try {
    // Query to select all data from the inclusionSheet table
    const result = await con.query("SELECT * FROM inclusionSheet");
    
    // Responding with the rows from the query result
    res.json(result.rows);
  } catch (error) {
    // Error handling if something goes wrong
    console.error("Error fetching inclusion sheet:", error);
    res.status(500).send("Error fetching inclusion sheet");
  }
};


const addInclusionSheet = async (req, res) => {
  try {
    const { 
      memberName,
      visitorName,
      chapter,
      category,
      chapterName,
      classificationExcludes,
      confirmation1,
      confirmation2,
      confirmation3,
      confirmation4,
      date,
      signature,
      visitor_id,
      vpSign,
      areaOfExpertise
    } = req.body;

    console.log("body:", req.body);

    // Validate if `chapter` is a valid number
    const parsedChapterId = parseInt(chapter);
    if (isNaN(parsedChapterId)) {
      throw new Error('Invalid chapter ID provided');
    }

    // Query to insert into inclusionSheet table
    const query = `
      INSERT INTO inclusionSheet (
        memberName,
        visitorName,
        chapter,
        category,
        chapterName,
        classificationExcludes,
        confirmation1,
        confirmation2,
        confirmation3,
        confirmation4,
        date,
        signature,
        visitor_id,
        vpSign,
        areaofexpertise
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const values = [
      memberName,
      visitorName,
      parsedChapterId,
      category,
      chapterName,
      classificationExcludes,
      confirmation1,
      confirmation2,
      confirmation3,
      confirmation4,
      date,
      signature,
      visitor_id,
      vpSign,
      areaOfExpertise
    ];

    // Execute the query to insert data into the table
    const result = await con.query(query, values);
    
    console.log("Inclusion sheet added:", result.rows[0]);

    // Optionally, update the visitor's status or any other related data
    const updateVisitorQuery = 'UPDATE Visitors SET inclusion_exclusion_sheet = $1 WHERE visitor_id = $2';
    const updateValues = [true, visitor_id];

    await con.query(updateVisitorQuery, updateValues)
      .then(() => console.log("Updated visitor inclusion_sheet status successfully"))
      .catch(err => console.error("Error updating visitor inclusion_sheet status:", err));

    res.status(201).json({
      message: "Inclusion sheet added successfully!",
      data: result.rows[0] // Returning the inserted row data
    });

  } catch (error) {
    console.error("Error adding inclusion sheet:", error);
    res.status(500).json({
      error: "Error adding inclusion sheet",
      details: error.message
    });
  }
};

const addMemberWriteOff = async (req, res) => {
  try {
    let { members, chapter_id, rightoff_date, rightoff_comment, } = req.body;

    console.log(req.body); // Debugging

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Invalid members array" });
    }

    const insertQuery = `
      INSERT INTO rightoff_member (
        member_id, 
        chapter_id, 
        rightoff_date, 
        total_pending_amount, 
        no_of_late, 
        writeoff_comment,
        member_name,
        member_email,
        member_phone
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const updateQuery = `
  UPDATE member 
  SET writeoff_status = TRUE,
      member_status = 'inactive'
  WHERE member_id = $1;
`;

const updateBankOrderQuery = `
  UPDATE bankorder
  SET amount_to_pay = 0
  WHERE member_id = $1;
`;


    let insertedRecords = [];

    for (const member of members) {
      const { 
        member_id, 
        no_of_late_payment, 
        total_pending_amount,
        member_name,
        member_email,
        member_phone 
      } = member;

      if (!member_id) {
        console.error("Missing member_id in:", member);
        continue; // Skip if no member_id
      }

      const values = [
        parseInt(member_id), // Ensure it's an integer
        chapter_id,
        rightoff_date,
        total_pending_amount,
        no_of_late_payment,
        rightoff_comment,
        member_name || null,      // Add new fields with null fallback
        member_email || null,
        member_phone || null
      ];

      const result = await con.query(insertQuery, values);
      insertedRecords.push(result.rows[0]);

      // Update writeoff_status in member table
      await con.query(updateQuery, [parseInt(member_id)]);
      await con.query(updateBankOrderQuery, [parseInt(member_id)]);
    }

    res.status(201).json({ message: "Member Write Off Successfully!", data: insertedRecords });

  } catch (error) {
    console.error("Error adding Write Off:", error);
    res.status(500).send("Error adding Write Off");
  }
};



const getAllMemberWriteOff = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM rightoff_member");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching write off members:", error);
    res.status(500).send("Error fetching write off members");
  }
};

const getAllVisitors = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM visitors");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all visitors:", error);
    res.status(500).send("Error fetching all visitors");
  }
};

const createInvoice = async (req, res) => {
  try {
    const {
      grand_total,
      member_id,
      chapter_id,
      region_id,
      universal_link_id,
      ulid,
      member_first_name,
      member_last_name,
      member_email_address,
      member_phone_number,
      member_gst_number,
      member_company_name,
      training_id,
    } = req.body;

    console.log(req.body);

    // Function to remove non-numeric characters except the decimal point
    const sanitizeAmount = (amount) => parseFloat(amount.replace(/[^\d.]/g, "")) || 0;

    // Sanitize grand_total before inserting into the database
    const sanitizedGrandTotal = sanitizeAmount(grand_total);
    const sanitizedCGST = sanitizeAmount(req.body.cgst_amount);
    const sanitizedSGST = sanitizeAmount(req.body.sgst_amount);
    const totalTax = (sanitizedCGST + sanitizedSGST).toFixed(2); // Sum of CGST & SGST

    // Generate order and transaction IDs
    const order_id = uuidv4();
    const transaction_id = uuidv4();
    const session_id = `session_${uuidv4()}`;
    const created_at = new Date().toISOString();
    const updated_at = new Date().toISOString();

    // Insert data into orders table
    const insertOrderQuery = `
      INSERT INTO orders (
        order_id, order_amount, order_currency, payment_gateway_id,
        customer_id, chapter_id, region_id, universal_link_id, ulid,
        order_status, payment_session_id, created_at, updated_at, tax,
        member_name, customer_email, customer_phone, gstin,
        company, mobile_number, payment_note, training_id
      ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10, $11, $12, $13, $14, $15, $16, $17, 'All Training Payments for all', $18, $19)
    `;

    const orderValues = [
      order_id,
      sanitizedGrandTotal,
      "INR",
      member_id,
      chapter_id,
      region_id,
      universal_link_id,
      ulid,
      session_id,
      created_at,
      updated_at,
      totalTax,
      `${member_first_name} ${member_last_name}`,
      member_email_address,
      member_phone_number,
      member_gst_number,
      member_company_name,
      member_phone_number,
      training_id,
    ];

    await con.query(insertOrderQuery, orderValues);

    // Insert data into transactions table
    const insertTransactionQuery = `
      INSERT INTO transactions (
        cf_payment_id, order_id, payment_gateway_id, payment_amount,
        payment_currency, payment_status, payment_message, payment_time,
        payment_completion_time, bank_reference, payment_method, gateway_payment_id,
        payment_group
      ) VALUES ($1, $2, NULL, $3, 'INR', 'SUCCESS', 'Cash payment message', $4, $5, $6, $7, $8, 'cash')
    `;

    const transactionValues = [
      transaction_id,
      order_id,
      sanitizedGrandTotal,
      created_at,
      created_at,
      transaction_id,
      JSON.stringify({
        payment_method: {
          cash: {
            channel: "cash collect",
          },
        },
      }),
      transaction_id,
    ];

    await con.query(insertTransactionQuery, transactionValues);

    res.status(201).json({
      success: true,
      message: "Invoice added successfully",
      order_id,
      transaction_id,
    });
  } catch (error) {
    console.error("Error adding invoice:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


const getZones = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM zone");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching zones:", error);
    res.status(500).send("Error fetching zones");
  }
};

const addZone = async (req, res) => {
    try {
        console.log('📝 Starting addZone process');
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        const {
            zone_name,
            zone_status,
            zone_launched_by,
            zone_contact_number,
            zone_email_id,
            date_of_publishing
        } = req.body;

        // Validate required fields
        if (!zone_name || !zone_status || !zone_contact_number || !zone_email_id) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: "Required fields missing: zone_name, zone_status, zone_contact_number, and zone_email_id are mandatory"
            });
        }

        // Get the filename from the uploaded file
        const zone_logo = req.file ? req.file.filename : null;
        console.log('🖼️ Zone logo filename:', zone_logo);

        // First, drop the existing unique constraint if it exists
        try {
            await con.query(`
                ALTER TABLE zone 
                DROP CONSTRAINT IF EXISTS zone_zone_email_id_key;
            `);
            console.log('🔧 Dropped unique constraint on email_id if it existed');
        } catch (error) {
            console.log('ℹ️ No constraint to drop or already dropped');
        }

        // Insert zone into database
        const query = `
            INSERT INTO zone (
                zone_name,
                zone_logo,
                zone_status,
                zone_launched_by,
                zone_contact_number,
                zone_email_id,
                date_of_publishing,
                delete_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            zone_name,
            zone_logo,
            zone_status,
            zone_launched_by || null,
            zone_contact_number,
            zone_email_id,
            date_of_publishing || new Date(),
            false // default delete_status
        ];

        console.log('💾 Executing query with values:', values);

        const result = await con.query(query, values);
        console.log('✅ Zone added successfully:', result.rows[0]);

        res.status(201).json({
            success: true,
            message: "Zone added successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error in addZone:', error);
        res.status(500).json({
            success: false,
            message: "Error adding zone",
            error: error.message
        });
    }
};

const getZone = async (req, res) => {
    try {
        console.log('📥 Getting zone details for ID:', req.params.zone_id);
        
        const query = `
            SELECT * FROM zone 
            WHERE zone_id = $1 AND delete_status = false
        `;
        
        const result = await con.query(query, [req.params.zone_id]);
        console.log('🔍 Zone details found:', result.rows[0]);

        if (result.rows.length === 0) {
            console.log('❌ No zone found with ID:', req.params.zone_id);
            return res.status(404).json({
                success: false,
                message: "Zone not found"
            });
        }

        // Add base URL to zone logo
        if (result.rows[0].zone_logo) {
            result.rows[0].zone_logo = `http://localhost:5000/uploads/ZonesLogos/${result.rows[0].zone_logo}`;
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error in getZone:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching zone details",
            error: error.message
        });
    }
};

const updateZone = async (req, res) => {
    try {
        console.log('📝 Starting zone update process');
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        const zone_id = req.params.zone_id;
        const {
            zone_name,
            zone_status,
            zone_launched_by,
            zone_contact_number,
            zone_email_id,
            date_of_publishing
        } = req.body;

        // Validate required fields
        if (!zone_name || !zone_status || !zone_contact_number || !zone_email_id) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: "Required fields missing"
            });
        }

        let updateQuery = `
            UPDATE zone 
            SET zone_name = $1,
                zone_status = $2,
                zone_launched_by = $3,
                zone_contact_number = $4,
                zone_email_id = $5,
                date_of_publishing = $6
        `;

        let values = [
            zone_name,
            zone_status,
            zone_launched_by,
            zone_contact_number,
            zone_email_id,
            date_of_publishing || new Date()
        ];

        // If new logo is uploaded
        if (req.file) {
            updateQuery += `, zone_logo = $${values.length + 1}`;
            values.push(req.file.filename);
        }

        updateQuery += ` WHERE zone_id = $${values.length + 1} RETURNING *`;
        values.push(zone_id);

        console.log('💾 Executing update query:', { query: updateQuery, values });

        const result = await con.query(updateQuery, values);
        console.log('✅ Zone updated successfully:', result.rows[0]);

        res.json({
            success: true,
            message: "Zone updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error in updateZone:', error);
        res.status(500).json({
            success: false,
            message: "Error updating zone",
            error: error.message
        });
    }
};


const getHotels = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM hotel WHERE delete_status='0' ");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).send("Error fetching hotels");
  }
};



const addHotel = async (req, res) => {
  try {
      console.log('📝 Starting addHotel process');
      console.log('Request body:', req.body);

      const {
          hotel_name,
          hotel_address,
          hotel_bill_amount,
          hotel_pincode,
          hotel_status,
          hotel_published_by,
          hotel_email,
          hotel_phone,
          date_of_publishing,
          bank_name,
          ifsc_code,
          account_no,
          account_type,
          hotel_gst,
          hotel_bank_proof,
          beneficiary_name,         // <-- NEW FIELD
          swift_code,               // <-- NEW FIELD
          hotel_alternative_phone   // <-- NEW FIELD
      } = req.body;

      // Validate required fields
      if (!hotel_name || !hotel_address || !hotel_bill_amount || !hotel_pincode || !hotel_phone) {
          console.error('❌ Missing required fields');
          return res.status(400).json({
              success: false,
              message: "Required fields missing: hotel_name, hotel_address, hotel_bill_amount, hotel_pincode and hotel_phone are mandatory"
          });
      }

      // Convert hotel_status to boolean (true for "Active", false for "Inactive")
      const is_active = hotel_status;

      // Insert data into the database
      const query = `
          INSERT INTO hotel (
              hotel_name,
              hotel_address,
              hotel_bill_amount,
              is_active,
              hotel_pincode,
              hotel_published_by,
              date_of_publishing,
              hotel_email,
              hotel_phone,
              bank_name,
              ifsc_code,
              account_no,
              account_type,
              hotel_gst,
              hotel_bank_proof,
              beneficiary_name,         -- NEW FIELD
              swift_code,               -- NEW FIELD
              hotel_alternative_phone   -- NEW FIELD
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING *
      `;

      const values = [
          hotel_name,
          hotel_address,
          hotel_bill_amount,
          is_active, // Corrected boolean value
          hotel_pincode,
          hotel_published_by,
          date_of_publishing || new Date(),
          hotel_email,
          hotel_phone,
          bank_name,
          ifsc_code,
          account_no,
          account_type,
          hotel_gst,
          hotel_bank_proof,
          beneficiary_name,         // <-- NEW FIELD
          swift_code,               // <-- NEW FIELD
          hotel_alternative_phone   // <-- NEW FIELD
      ];

      console.log('💾 Executing query with values:', values);

      const result = await con.query(query, values);
      console.log('✅ Hotel added successfully:', result.rows[0]);

      res.status(201).json({
          success: true,
          message: "Hotel added successfully",
          data: result.rows[0]
      });

  } catch (error) {
      console.error('❌ Error in hotel adding:', error);
      res.status(500).json({
          success: false,
          message: "Error adding hotel",
          error: error.message
      });
  }
};


const deleteHotel = async (req, res) => {
  const { hotel_id } = req.params;
  console.log("Hotel ID:", hotel_id);

  try {
    const result = await con.query(
      `UPDATE hotel SET delete_status = 1 WHERE hotel_id = $1 RETURNING *`,
      [hotel_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Hotel marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Hotel not found" });
    }
  } catch (error) {
    console.error("Error deleting Hotel", error);
    res.status(500).json({ message: "Error deleting Hotel" });
  }
};


const updateHotel = async (req, res) => {
  try {
      console.log('📝 Starting hotel update process');
      console.log('Request body:', req.body);

      const hotel_id = req.params.hotel_id;
      const {
          hotel_name,
          hotel_address,
          hotel_bill_amount,
          hotel_status,
          hotel_pincode,
          hotel_published_by,
          date_of_publishing,
          hotel_email,
          hotel_phone,
          bank_name,
          ifsc_code,
          account_no,
          account_type,
          hotel_gst,
          hotel_bank_proof,
          beneficiary_name,         // <-- NEW FIELD
          swift_code,               // <-- NEW FIELD
          hotel_alternative_phone   // <-- NEW FIELD
      } = req.body;

      // Validate required fields
      if (!hotel_name || !hotel_address || !hotel_bill_amount || !hotel_phone) {
          console.error('❌ Missing required fields');
          return res.status(400).json({
              success: false,
              message: "Required fields missing"
          });
      }

      let updateQuery = `
          UPDATE hotel 
              SET hotel_name = $1,
              hotel_address = $2,
              hotel_bill_amount = $3,
              is_active = $4,
              hotel_pincode = $5,
              date_of_publishing = $6,
              hotel_published_by = $7,
              hotel_email = $8,
              hotel_phone = $9,
              bank_name = $10,
              ifsc_code = $11,
              account_no = $12,
              account_type = $13,
              hotel_gst = $14,
              hotel_bank_proof = $15,
              beneficiary_name = $16,         -- NEW FIELD
              swift_code = $17,               -- NEW FIELD
              hotel_alternative_phone = $18   -- NEW FIELD
      `;

      let values = [
          hotel_name,
          hotel_address,
          hotel_bill_amount,
          hotel_status,
          hotel_pincode,
          date_of_publishing || new Date(),
          hotel_published_by,
          hotel_email,
          hotel_phone,
          bank_name,
          ifsc_code,
          account_no,
          account_type,
          hotel_gst,
          hotel_bank_proof,
          beneficiary_name,         // <-- NEW FIELD
          swift_code,               // <-- NEW FIELD
          hotel_alternative_phone   // <-- NEW FIELD
      ];

      updateQuery += ` WHERE hotel_id = $${values.length + 1} RETURNING *`;
      values.push(hotel_id);

      console.log('💾 Executing update query:', { query: updateQuery, values });

      const result = await con.query(updateQuery, values);
      console.log('✅ Hotel updated successfully:', result.rows[0]);

      res.json({
          success: true,
          message: "Hotel updated successfully",
          data: result.rows[0]
      });

  } catch (error) {
      console.error('❌ Error in hotel:', error);
      res.status(500).json({
          success: false,
          message: "Error updating hotel",
          error: error.message
      });
  }
};


const addHotelToRegion = async (req, res) => {
  try {
      console.log('📝 Starting addHotelAndUpdateRegion process');
      console.log('Request body:', req.body);

      const {
          hotel_name,
          hotel_address,
          hotel_bill_amount,
          hotel_pincode,
          hotel_status,
          hotel_published_by,
          hotel_email,
          hotel_phone,
          date_of_publishing,
          region_id
      } = req.body;

      // Validate required fields
      if (!hotel_name || !hotel_address || !hotel_bill_amount || !hotel_pincode || !hotel_phone || !region_id) {
          console.error('❌ Missing required fields');
          return res.status(400).json({
              success: false,
              message: "Required fields missing: hotel_name, hotel_address, hotel_bill_amount, hotel_pincode, hotel_phone, and region_id are mandatory"
          });
      }

      // Convert hotel_status to boolean (true for "Active", false for "Inactive")
      const is_active = hotel_status;

      // Insert hotel data into the database
      const hotelQuery = `
          INSERT INTO hotel (
              hotel_name,
              hotel_address,
              hotel_bill_amount,
              is_active,
              hotel_pincode,
              hotel_published_by,
              date_of_publishing,
              hotel_email,
              hotel_phone
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
      `;

      const hotelValues = [
          hotel_name,
          hotel_address,
          hotel_bill_amount,
          is_active,
          hotel_pincode,
          hotel_published_by,
          date_of_publishing || new Date(),
          hotel_email,
          hotel_phone
      ];

      console.log('💾 Executing hotel query with values:', hotelValues);

      const hotelResult = await con.query(hotelQuery, hotelValues);
      const newHotelId = hotelResult.rows[0].hotel_id;
      console.log('✅ Hotel added successfully:', hotelResult.rows[0]);

      // Fetch the current region data
      const regionResult = await con.query('SELECT hotel_id FROM region WHERE region_id = $1', [region_id]);
      
      if (regionResult.rows.length === 0) {
          return res.status(404).json({ message: "Region not found" });
      }

      const currentHotelIds = regionResult.rows[0].hotel_id || [];

      // Add the new hotel_id to the hotel_id array
      const updatedHotelIds = [...currentHotelIds, newHotelId];

      // Update the region with the new hotel_id
      await con.query('UPDATE region SET hotel_id = $1 WHERE region_id = $2', [updatedHotelIds, region_id]);

      res.status(201).json({
          success: true,
          message: "Hotel added and region updated successfully",
          hotel: hotelResult.rows[0],
          hotel_id: updatedHotelIds
      });

  } catch (error) {
      console.error('❌ Error in addHotelAndUpdateRegion:', error);
      res.status(500).json({
          success: false,
          message: "Error adding hotel and updating region",
          error: error.message
      });
  }
};


const getEoiForms = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM eoi_form");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching EOI Forms:", error);
    res.status(500).send("Error fetching EOI Forms");
  }
};
const addEoiForm = async (req, res) => {
  // Get data from the request body
  console.log("data is",req.body);
    const {
      region,
    chapter,
    invitedBy,
    visitDate,
    firstName,
    lastName,
    companyName,
    professionalClassification,
    industry,
    email,
    mobile,
    bestTimeToReach,
    howHeard,
    previousMember,
    experienceRating,
    membershipInterest,
    gstin,
    companyAddress,
    descriptionBox,
    visitor_id,
    memberName,
    member_id,
  } = req.body;

  try {
    // Create an insert query
    const query = `
      INSERT INTO eoi_form (
        is_interested, region_id, chapter_id, invited_by_member_id, member_name,
        chapter_visit_date, first_name, last_name, visitor_id, company_name, company_address,
        company_gstin, category, business, email, phone_no, best_time_to_reach, hear_about_us,
        previous_member, exp_rating
      ) 
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *;
    `;

    // Define the values to insert
    const values = [
      membershipInterest, region, chapter, member_id || null , memberName,
      visitDate, firstName, lastName, visitor_id || null, companyName, companyAddress,
      gstin, professionalClassification, industry, email, mobile, bestTimeToReach, howHeard,
      previousMember, experienceRating,
    ];

    // Execute the query

    const result = await con.query(query, values);

    // Handle Visitor Logic (Insert/Update)
    if (!visitor_id) {
      // If visitor_id is blank or null, insert a new visitor into the visitors table
      const visitorInsertQuery = `
        INSERT INTO Visitors (
          region_id, chapter_id, invited_by, invited_by_name, visitor_name, visitor_email,
          visitor_phone, visitor_company_name, visitor_address, visitor_gst, visitor_business,
          visitor_category, visited_date, total_amount, sub_total, tax, delete_status, active_status,
          order_id, visitor_form, eoi_form, new_member_form, visitor_company_address
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING visitor_id;
      `;

      const visitorValues = [
        region, chapter, member_id || null, memberName, firstName + " " + lastName, email,
        mobile, companyName, companyAddress, gstin, professionalClassification, industry,
        visitDate, null, null, null, false, "active", null, true, true, false, companyAddress || null
      ];

      const visitorResult = await con.query(visitorInsertQuery, visitorValues);
      console.log("New Visitor Inserted with ID: ", visitorResult.rows[0].visitor_id);
      // Inserted visitor_id to be used in the EOI form
      const insertedVisitorId = visitorResult.rows[0].visitor_id;

    } else {
      // Else, if visitor_id is provided, update the visitor's `new_member_form` to true
      const visitorUpdateQuery = `
        UPDATE Visitors
        SET  eoi_form = true
        WHERE visitor_id = $1 RETURNING visitor_id;
      `;
      const visitorUpdateValues = [visitor_id];
      const visitorUpdateResult = await con.query(visitorUpdateQuery, visitorUpdateValues);
      console.log("Visitor with ID", visitor_id, "updated with eoi_form = true");
    }

    // Send a success response with the newly created form
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting EOI form:", error);
    if (error.code === '23505' && error.constraint === 'eoi_form_email_key') {
      return res.status(400).json({
        message: 'Email already registered. Please try a different one.',
      });
    }

    // Handle other errors
    res.status(500).send("Error inserting EOI form");
  }
};
const exportMembersExcel = async (req, res) => {
  try {
      const result = await con.query('SELECT * FROM member');

      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'No members found' });
      }

      // Create a new Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Members');

      // Add headers
      worksheet.addRow(Object.keys(result.rows[0]));

      // Add data rows
      result.rows.forEach(row => {
          worksheet.addRow([]);
      });

      // Save the file
      const filePath = path.join(__dirname, './exports/members.xlsx');
      await workbook.xlsx.writeFile(filePath);

      res.download(filePath, 'members.xlsx', () => {
          fs.unlinkSync(filePath); // Delete file after download
      });

  } catch (error) {
      console.error('Error exporting members:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};

const exportMembersCSV = async (req, res) => {
  try {
      const result = await con.query('SELECT * FROM member');

      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'No members found' });
      }

      // Convert to CSV
      const fields = Object.keys(result.rows[0]);
      const parser = new Parser({ fields });
      const csvData = parser.parse(result.rows);

      const filePath = path.join(__dirname, './exports/members.csv');
      fs.writeFileSync(filePath, csvData);

      res.download(filePath, 'members.csv', () => {
          fs.unlinkSync(filePath); // Delete file after download
      });

  } catch (error) {
      console.error('Error exporting members:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};


const getMembershipPending = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM new_member_membership");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching pending membership details:", error);
    res.status(500).send("Error fetching pending membership details");
  }
};

const formatDate = (input) => {
  if (!input || input.trim() === '') return null;

  const parts = input.split('/');
  if (parts.length !== 3) return null;

  let [day, month, year] = parts;
  if (year.length === 2) {
    year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
  }

  const isoString = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`).toISOString();
  return isoString;
};

const importMembersCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const phoneNumbers = new Set();
    const emailAddresses = new Set();
    const gstNumbers = new Set();
    const members = [];

    // Helper to sanitize date
    const sanitizeDate = (dateStr) => {
      return dateStr && dateStr.trim() !== '' ? dateStr : null;
    };

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (data.accolades_id) {
          try {
            data.accolades_id = JSON.parse(data.accolades_id.replace(/'/g, '"'));
          } catch (err) {
            console.error("Error parsing accolades_id:", data.accolades_id);
            data.accolades_id = [];
          }
        } else {
          data.accolades_id = [];
        }

        // phoneNumbers.add(data.member_phone_number);
        // emailAddresses.add(data.member_email_address);
        // gstNumbers.add(data.member_gst_number);

        members.push(data);
      })
      .on('end', async () => {
        fs.unlinkSync(filePath);

        if (members.length === 0) {
          return res.status(400).json({ message: 'No data found in file' });
        }

        try {
          // Check for duplicates
          const existingQuery = `
            SELECT member_phone_number, member_email_address, member_gst_number 
            FROM member 
            WHERE member_phone_number = ANY($1) 
              OR member_email_address = ANY($2) 
              OR member_gst_number = ANY($3)
          `;
          const { rows: existingMembers } = await con.query(existingQuery, [
            Array.from(phoneNumbers),
            Array.from(emailAddresses),
            Array.from(gstNumbers),
          ]);

          if (existingMembers.length > 0) {
            return res.status(400).json({
              message: "Duplicate data found for phone, email, or GST. Please review your file.",
              duplicates: existingMembers.map((m) =>
                `Phone: ${m.member_phone_number}, Email: ${m.member_email_address}, GST: ${m.member_gst_number}`
              ),
            });
          }

          // Insert each member one-by-one
          for (const data of members) {
            const insertMemberQuery = `
              INSERT INTO member (
                member_first_name, member_last_name, member_date_of_birth, member_phone_number,
                member_alternate_mobile_number, member_email_address, street_address_line_1, address_pincode,
                address_city, address_state, region_id, chapter_id, accolades_id, member_induction_date,
                member_current_membership, member_renewal_date, member_gst_number, member_company_name,
                member_company_address, member_company_state, member_company_city, member_photo, member_website,
                member_company_logo, member_facebook, member_instagram, member_linkedin, member_youtube,
                country, street_address_line_2, gender, notification_consent, date_of_publishing,
                member_sponsored_by, member_status, delete_status, member_company_pincode,
                meeting_opening_balance, meeting_payable_amount, category_name
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26,
                $27, $28, $29, $30, $31, $32, $33, $34,
                $35, $36, $37, $38, $39, $40
              ) RETURNING member_id
            `;

            const memberValues = [
              data.member_first_name,
              data.member_last_name,
              sanitizeDate(data.member_date_of_birth),
              data.member_phone_number,
              data.member_alternate_mobile_number,
              data.member_email_address,
              data.street_address_line_1,
              data.address_pincode,
              data.address_city,
              data.address_state,
              data.region_id,
              data.chapter_id,
              `{${data.accolades_id.join(',')}}`,
              sanitizeDate(data.member_induction_date),
              data.member_current_membership,
              sanitizeDate(data.member_renewal_date),
              data.member_gst_number,
              data.member_company_name,
              data.member_company_address,
              data.member_company_state,
              data.member_company_city,
              data.member_photo,
              data.member_website,
              data.member_company_logo,
              data.member_facebook,
              data.member_instagram,
              data.member_linkedin,
              data.member_youtube,
              data.country,
              data.street_address_line_2,
              data.gender,
              data.notification_consent,
              sanitizeDate(data.date_of_publishing),
              data.member_sponsored_by,
              data.member_status,
              data.delete_status,
              data.member_company_pincode,
              data.meeting_opening_balance,
              data.meeting_payable_amount,
              data.category_name,
            ];

            const result = await con.query(insertMemberQuery, memberValues);
            const member_id = result.rows[0].member_id;

            // Insert into bankorder
            const meeting_opening_balance = parseFloat(data.meeting_opening_balance) || 0;

            await con.query(
              `INSERT INTO bankorder (member_id, chapter_id, amount_to_pay) VALUES ($1, $2, $3)`,
              [member_id, parseInt(data.chapter_id), meeting_opening_balance]
            );
          }

          res.status(200).json({ message: 'Members and bank orders imported successfully!' });
        } catch (err) {
          console.error('Database error:', err);
          res.status(500).json({ message: 'Database insertion failed. Please try again.' });
        }
      });
  } catch (error) {
    console.error('Error importing members:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const memberApplicationFormNewMember = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM member_application_form_new_member");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all new member form for member application:", error);
    res.status(500).send("Error fetching all new member form for member application");
  }
};

const addMemberApplication = async (req, res) => {
  try {
    // 1. Log incoming request
    console.log("\n🚀 New Member Application Request Received");
    console.log("==================================");

    // 2. Log and validate incoming data
    console.log("📝 Form Data Received:", {
      ...req.body,
      reference_consent: !!req.body.reference_consent,
      terms_accepted: !!req.body.terms_accepted
    });

    // 3. Check for required fields
    const requiredFields = ['email', 'firstName', 'lastName', 'mobile'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log("❌ Missing Required Fields:", missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // 4. Check for existing email
    console.log("🔍 Checking for existing email:", req.body.email);
    const emailCheckQuery = `
      SELECT email FROM member_application_form_new_member 
      WHERE email = $1
    `;
    const emailCheck = await con.query(emailCheckQuery, [req.body.email]);

    if (emailCheck.rows.length > 0) {
      console.log("❌ Email already exists:", req.body.email);
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please use a different email address."
      });
    }
    console.log("✅ Email check passed");

    // 5. Destructure and process form data
    const {
      applicationType,
      region,
      chapter,
      invited_by_member,
      visitDate,
      firstName,
      lastName,
      companyName,
      professionalClassification,
      industry,
      email,
      mobile,
      howHeard,
      gstin,
      companyAddress,
      visitor_id,
      memberName,
      secondaryPhone,
      businessWebsite,
      q1_experience,
      q2_length_time,
      q3_education,
      q4_license,
      q5_primary_occupation,
      q6_weekly_commitment,
      q7_substitute_commitment,
      q8_referral_commitment,
      q9_referral_ability,
      q10_previous_member,
      q11_other_networks,
      ref1_first_name,
      ref1_last_name,
      ref1_business_name,
      ref1_phone,
      ref1_email,
      ref1_relationship,
      ref2_first_name,
      ref2_last_name,
      ref2_business_name,
      ref2_phone,
      ref2_email,
      ref2_relationship,
      reference_consent,
      terms_accepted
    } = req.body;

    // 6. Log processed values for questionnaire
    console.log("📋 Processing Questionnaire Responses:", {
      q1_experience: q1_experience,
      q2_length_time: q2_length_time,
      q3_education: q3_education,
      q4_license: q4_license?.substring(0, 1),
      q5_primary_occupation: q5_primary_occupation?.substring(0, 1),
      q6_weekly_commitment: q6_weekly_commitment?.substring(0, 1),
      q7_substitute_commitment: q7_substitute_commitment?.substring(0, 1),
      q8_referral_commitment: q8_referral_commitment?.substring(0, 1),
      q9_referral_ability,
      q10_previous_member: q10_previous_member?.substring(0, 1),
      q11_other_networks: q11_other_networks?.substring(0, 1)
    });

    // 7. Process member ID
    const invited_by_member_id = parseInt(invited_by_member) || null;
    console.log("👤 Invited by member ID:", invited_by_member_id);

    // 8. Construct query
    console.log("🔧 Preparing database query");
    const query = `
      INSERT INTO member_application_form_new_member (
        applicationtype, region, chapter, invited_by_member, visitdate,
        firstname, lastname, companyname, professionalclassification,
        industry, email, mobile, howheard, gstin, companyaddress,
        visitor_id, membername, secondaryphone, businesswebsite,
        q1_experience, q2_length_time, q3_education, q4_license,
        q5_primary_occupation, q6_weekly_commitment, q7_substitute_commitment,
        q8_referral_commitment, q9_referral_ability, q10_previous_member,
        q11_other_networks, ref1_first_name, ref1_last_name,
        ref1_business_name, ref1_phone, ref1_email, ref1_relationship,
        ref2_first_name, ref2_last_name, ref2_business_name, ref2_phone,
        ref2_email, ref2_relationship, reference_consent, terms_accepted
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 
              $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, 
              $39, $40, $41, $42, $43, $44)
      RETURNING *;
    `;

    // 9. Prepare values array
    const values = [
      applicationType,
      region,
      chapter,
      invited_by_member_id,
      visitDate,
      firstName,
      lastName,
      companyName,
      professionalClassification,
      industry,
      email,
      mobile,
      howHeard,
      gstin,
      companyAddress,
      visitor_id,
      memberName,
      secondaryPhone,
      businessWebsite,
      q1_experience,
      q2_length_time,
      q3_education,
      q4_license?.substring(0, 1),
      q5_primary_occupation?.substring(0, 1),
      q6_weekly_commitment?.substring(0, 1),
      q7_substitute_commitment?.substring(0, 1),
      q8_referral_commitment?.substring(0, 1),
      q9_referral_ability,
      q10_previous_member?.substring(0, 1),
      q11_other_networks?.substring(0, 1),
      ref1_first_name,
      ref1_last_name,
      ref1_business_name,
      ref1_phone,
      ref1_email,
      ref1_relationship,
      ref2_first_name,
      ref2_last_name,
      ref2_business_name,
      ref2_phone,
      ref2_email,
      ref2_relationship,
      reference_consent,
      terms_accepted
    ];

    // 10. Execute query
    console.log("💾 Executing database insert");
    const result = await con.query(query, values);
    console.log("✅ Database insert successful");

    // 11. Update visitor's member_application status
    if (visitor_id) {
      console.log("🔄 Updating visitor member_application status for visitor_id:", visitor_id);
      const updateVisitorQuery = `
        UPDATE Visitors 
        SET member_application_form = true 
        WHERE visitor_id = $1 
        RETURNING visitor_id, visitor_name, member_application_form`;
      
      try {
        const visitorUpdateResult = await con.query(updateVisitorQuery, [visitor_id]);
        if (visitorUpdateResult.rows.length > 0) {
          console.log("✅ Visitor status updated successfully:", {
            visitor_id: visitorUpdateResult.rows[0].visitor_id,
            visitor_name: visitorUpdateResult.rows[0].visitor_name,
            member_application: visitorUpdateResult.rows[0].member_application_form
          });
        } else {
          console.log("⚠️ No visitor found with ID:", visitor_id);
        }
      } catch (updateError) {
        console.error("⚠️ Warning: Failed to update visitor status:", updateError.message);
        // We don't want to fail the whole operation if just the visitor update fails
      }
    } else {
      console.log("ℹ️ No visitor_id provided, skipping visitor status update");
    }

    // 12. Log successful result (existing code)
    console.log("🎉 Application submitted successfully:", {
      application_id: result.rows[0].application_id,
      email: result.rows[0].email,
      name: `${result.rows[0].firstname} ${result.rows[0].lastname}`
    });

    // 13. Send success response
    res.status(201).json({
      success: true,
      message: "Member application submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    // 14. Error handling with detailed logging
    console.error("\n❌ Error in addMemberApplication:");
    console.error("Type:", error.name);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    
    // Handle specific errors
    if (error.code === '23505') {
      if (error.constraint === 'member_applications_email_key') {
        console.log("📧 Duplicate email error caught");
        return res.status(400).json({
          success: false,
          message: "This email is already registered. Please use a different email address."
        });
      }
    }

    // Log database-specific errors
    if (error.code) {
      console.error("Database Error Code:", error.code);
      console.error("Constraint:", error.constraint);
      console.error("Detail:", error.detail);
    }

    // Send error response
    res.status(500).json({
      success: false,
      message: "Error submitting member application",
      error: error.message
    });
  } finally {
    console.log("==================================\n");
  }
};

const markTrainingCompleted = async (req, res) => {
  console.log('\n🎯 Starting markTrainingCompleted controller');
  console.log('==================================');

  try {
      // 1. Log incoming request data
      const { training_id } = req.body;
      console.log('📝 Received training_id:', training_id);

      if (!training_id) {
          console.log('❌ Error: No training_id provided');
          return res.status(400).json({
              success: false,
              message: 'Training ID is required'
          });
      }

      // 2. Verify training exists
      console.log('🔍 Checking if training exists...');
      const checkQuery = 'SELECT training_status FROM training WHERE training_id = $1';
      const checkResult = await con.query(checkQuery, [training_id]);

      if (checkResult.rows.length === 0) {
          console.log('❌ Error: Training not found with ID:', training_id);
          return res.status(404).json({
              success: false,
              message: 'Training not found'
          });
      }

      // 3. Check if already completed
      if (checkResult.rows[0].training_status === 'Completed') {
          console.log('ℹ️ Training already marked as completed');
          return res.status(400).json({
              success: false,
              message: 'Training is already marked as completed'
          });
      }

      // 4. Update training status
      console.log('📝 Updating training status to Completed...');
      const updateQuery = `
          UPDATE training
          SET training_status = 'Completed' 
          WHERE training_id = $1 
          RETURNING training_id, training_name, training_status
      `;
      
      const result = await con.query(updateQuery, [training_id]);

      // 5. Log success and send response
      console.log('✅ Training status updated successfully:', result.rows[0]);
      console.log('==================================\n');

      res.status(200).json({
          success: true,
          message: 'Training marked as completed successfully',
          data: result.rows[0]
      });

  } catch (error) {
      // 6. Error handling with detailed logging
      console.error('\n❌ Error in markTrainingCompleted:');
      console.error('Type:', error.name);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('==================================\n');

      res.status(500).json({
          success: false,
          message: 'Error marking training as completed',
          error: error.message
      });
  }
};


const updateMemberApplicationDocs = async (req, res) => {
  try {
      console.log("\n📄 Updating Member Application Documents");
      console.log("=====================================");
      
      const { application_id } = req.params;
      const { aadhar_card_number, pan_card_number } = req.body;

      console.log("📝 Request Data:", {
          application_id,
          aadhar_card_number,
          pan_card_number,
          files: req.files
      });

      // Initialize file paths
      let aadharPath = null;
      let panPath = null;
      let gstPath = null;

      // Handle file uploads
      if (req.files) {
          if (req.files.aadhar_card_img) {
              aadharPath = req.files.aadhar_card_img[0].filename;
              console.log("📄 Aadhar card uploaded:", aadharPath);
          }
          
          if (req.files.pan_card_img) {
              panPath = req.files.pan_card_img[0].filename;
              console.log("📄 PAN card uploaded:", panPath);
          }
          
          if (req.files.gst_certificate) {
              gstPath = req.files.gst_certificate[0].filename;
              console.log("📄 GST certificate uploaded:", gstPath);
          }
      }

      // Update query without the documents_submitted field
      const query = `
          UPDATE member_application_form_new_member 
          SET 
              aadhar_card_number = COALESCE($1, aadhar_card_number),
              pan_card_number = COALESCE($2, pan_card_number),
              aadhar_card_img = COALESCE($3, aadhar_card_img),
              pan_card_img = COALESCE($4, pan_card_img),
              gst_certificate = COALESCE($5, gst_certificate)
          WHERE application_id = $6
          RETURNING *;
      `;

      const values = [
          aadhar_card_number || null,
          pan_card_number || null,
          aadharPath,
          panPath,
          gstPath,
          application_id
      ];

      console.log("💾 Executing database update");
      const result = await con.query(query, values);

      if (result.rows.length === 0) {
          console.log("❌ No application found with ID:", application_id);
          return res.status(404).json({
              success: false,
              message: "Application not found"
          });
      }

      console.log("✅ Documents updated successfully");
      res.status(200).json({
          success: true,
          message: "Documents uploaded successfully",
          data: result.rows[0]
      });

  } catch (error) {
      console.error("❌ Error updating documents:", error);
      res.status(500).json({
          success: false,
          message: "Error updating documents",
          error: error.message
      });
  }
};


const updateOnboardingCall = async (req, res) => {
  try {
      console.log('📝 Starting onboarding call update process');
      
      const visitor_id = req.params.visitor_id;
      const filename = req.file ? req.file.filename : null;

      console.log('🔍 Update details:', {
          visitor_id: visitor_id,
          filename: filename
      });

      if (!filename) {
          console.error('❌ No file uploaded');
          return res.status(400).json({
              success: false,
              message: "No file uploaded"
          });
      }

      // Update the visitors table
      const updateQuery = `
          UPDATE Visitors 
          SET onboarding_call = $1
          WHERE visitor_id = $2 
          RETURNING visitor_id, visitor_name, onboarding_call
      `;

      const result = await con.query(updateQuery, [filename, visitor_id]);

      if (result.rows.length === 0) {
          console.error('❌ No visitor found with ID:', visitor_id);
          return res.status(404).json({
              success: false,
              message: "Visitor not found"
          });
      }

      const updatedVisitor = result.rows[0];
      
      // Add the full URL for the uploaded image
      const imageUrl = `http://localhost:5000/api/uploads/onboardingCalls/${filename}`;
      
      console.log('✅ Onboarding call updated successfully:', {
          visitor_id: updatedVisitor.visitor_id,
          visitor_name: updatedVisitor.visitor_name,
          filename: updatedVisitor.onboarding_call,
          imageUrl: imageUrl
      });

      res.json({
          success: true,
          message: "Onboarding call screenshot uploaded successfully",
          data: {
              ...updatedVisitor,
              imageUrl: imageUrl
          }
      });

  } catch (error) {
      console.error('❌ Error in updateOnboardingCall:', error);
      res.status(500).json({
          success: false,
          message: "Error updating onboarding call",
          error: error.message
      });
  }
};

const exportMemberWiseAccolades = async (req, res) => {
  try {
    // Corrected SQL query to join members and accolades using accolades_id array
    const query = `
      SELECT 
        CONCAT(m.member_first_name, ' ', m.member_last_name) AS member_name,
        a.accolade_name
      FROM member m
      JOIN accolades a ON a.accolade_id = ANY(m.accolades_id)
      ORDER BY m.member_first_name, a.accolade_name;
    `;

    const { rows: membersData } = await con.query(query);

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Member Accolades Data');

    // Define columns
    worksheet.columns = [
      { header: 'Member Name', key: 'member_name', width: 25 },
      { header: 'Accolade Name', key: 'accolade_name', width: 30 },
    ];

    // Add data rows
    membersData.forEach(row => worksheet.addRow(row));

    // Set response headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="member_accolades.xlsx"');

    // Write the Excel file to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting member accolades data:', error);
    res.status(500).json({ message: 'Failed to export data' });
  }
};


const getRequestedMemberRequisition = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM member_requisition_request");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all requested requisition of all members:", error);
    res.status(500).send("Error fetching all requested requisition of all members");
  }
};

const addMemberRequisition = async (req, res) => {
  console.log('📝 New Member Requisition Request:', req.body);

  try {
      const {
          member_id,
          chapter_id,
          accolade_id,
          request_comment,
          accolade_amount,
          order_id = null  // Optional parameter
      } = req.body;

      // Validate required fields
      if (!member_id || !chapter_id || !accolade_id) {
          console.error('❌ Missing required fields');
          return res.status(400).json({
              success: false,
              message: "Required fields missing: member_id, chapter_id, and accolade_id are mandatory"
          });
      }

      console.log('🔍 Validated Request Data:', {
          member_id,
          chapter_id,
          accolade_id,
          request_comment,
          accolade_amount,
          order_id
      });

      // Set default values for status fields
      const approve_status = 'pending';
      const request_status = 'open';
      const given_status = false;

      const query = `
          INSERT INTO member_requisition_request (
              member_id,
              chapter_id,
              accolade_id,
              requested_time_date,
              request_comment,
              accolade_amount,
              order_id,
              approve_status,
              request_status,
              given_status
          )
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
          RETURNING *
      `;

      const values = [
          member_id,
          chapter_id,
          accolade_id,
          request_comment,
          accolade_amount,
          order_id,
          approve_status,
          request_status,
          given_status
      ];

      console.log('📊 Executing Query with values:', values);

      const result = await con.query(query, values);
      const newRequisition = result.rows[0];

      console.log('✅ Requisition created successfully:', newRequisition);

      res.status(201).json({
          success: true,
          message: "Member requisition request created successfully",
          data: newRequisition
      });

  } catch (error) {
      console.error('❌ Error creating member requisition:', error);
      res.status(500).json({
          success: false,
          message: "Error creating member requisition request",
          error: error.message
      });
  }
};


const getRequestedChapterRequisition = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM chapter_requisition");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all requested requisition of all chapters:", error);
    res.status(500).send("Error fetching all requested requisition of all chapters");
  }
};


const addChapterRequisition = async (req, res) => {
  console.log('\n🚀 Starting Chapter Requisition Creation');
  console.log('=====================================');

  try {
      const {
          member_ids,
          chapter_id,
          accolade_ids,
          comment,
          request_status = 'open',
          ro_comment = null,
          pickup_status = false,
          pickup_date = null,
          visitor_id,  // New field
          approve_status = null,
          slab_wise_comment = null,
          given_status = null
      } = req.body;

      console.log('📝 Checking for visitor_id flow:', { visitor_id });

      // If visitor_id exists, handle single entry flow
      if (visitor_id) {
          console.log('🎯 Detected visitor_id flow with data:', {
              visitor_id,
              chapter_id,
              accolade_ids: Array.isArray(accolade_ids) ? accolade_ids[0] : accolade_ids,
              comment,
              ro_comment,
              pickup_status,
              pickup_date,
              approve_status,
              slab_wise_comment,
              given_status
          });

          const visitorQuery = `
              INSERT INTO chapter_requisition (
                  member_ids,
                  chapter_id,
                  accolade_ids,
                  requested_date,
                  comment,
                  request_status,
                  ro_comment,
                  pickup_status,
                  pickup_date,
                  approve_status,
                  slab_wise_comment,
                  given_status,
                  visitor_id,
                  requested_by
              )
              VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING *
          `;

          const visitorValues = [
              [0], // member_ids will be null
              chapter_id,
              [Array.isArray(accolade_ids) ? accolade_ids[0] : accolade_ids], // Single accolade_id in array
              comment,
              request_status,
              ro_comment,
              pickup_status,
              pickup_date,
              approve_status,
              slab_wise_comment,
              given_status,
              visitor_id,  // Moved to last position
              req.body.requested_by
          ];

          console.log('🔍 Executing visitor flow query with values:', visitorValues);

          const result = await con.query(visitorQuery, visitorValues);
          const newRequisition = result.rows[0];

          console.log('✅ Chapter Requisition created successfully (visitor flow):', newRequisition);

          return res.status(201).json({
              success: true,
              message: "Chapter requisition created successfully (visitor flow)",
              data: newRequisition
          });
      }

      // Original flow for member_ids (existing code)
      console.log('👥 Regular member flow detected with data:', {
          member_ids,
          chapter_id,
          accolade_ids,
          comment,
          request_status,
          ro_comment,
          pickup_status,
          pickup_date
      });

      // Validate required fields
      if (!member_ids || !chapter_id || !accolade_ids) {
          console.error('❌ Validation Error: Missing required fields');
          return res.status(400).json({
              success: false,
              message: "member_ids, chapter_id, and accolade_ids are required"
          });
      }

      // Validate arrays
      if (!Array.isArray(member_ids) || !Array.isArray(accolade_ids)) {
          console.error('❌ Validation Error: member_ids and accolade_ids must be arrays');
          return res.status(400).json({
              success: false,
              message: "member_ids and accolade_ids must be arrays"
          });
      }

      // Original query with visitor_id added at the end
      const query = `
          INSERT INTO chapter_requisition (
              member_ids,
              chapter_id,
              accolade_ids,
              requested_date,
              comment,
              request_status,
              ro_comment,
              pickup_status,
              pickup_date,
              visitor_id,
              requested_by
          )
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
      `;

      const values = [
          member_ids,
          chapter_id,
          accolade_ids,
          comment,
          request_status,
          ro_comment,
          pickup_status,
          pickup_date,
          null,  // visitor_id will be null in regular flow
          req.body.requested_by
      ];

      console.log('🔍 Executing regular flow query with values:', values);

      const result = await con.query(query, values);
      const newRequisition = result.rows[0];

      console.log('✅ Chapter Requisition created successfully (regular flow):', newRequisition);

      res.status(201).json({
          success: true,
          message: "Chapter requisition created successfully",
          data: newRequisition
      });

  } catch (error) {
      console.error('❌ Error in addChapterRequisition:', error);
      res.status(500).json({
          success: false,
          message: "Error creating chapter requisition",
          error: error.message
      });
  }
};;

const updateChapterRequisition = async (req, res) => {
  console.log('\n🔄 Starting Chapter Requisition Update');
  console.log('=====================================');

  try {
      const { 
          chapter_requisition_id, 
          approve_status, 
          ro_comment, 
          pickup_status, 
          pickup_date, 
          given_status, 
          slab_wise_comment,
          pick_up_status_ro,
          pick_up_status_ro_comment 
      } = req.body;

      await con.query('BEGIN');

      try {
      // First, check if this is a visitor requisition
      const visitorCheck = await con.query(
          'SELECT visitor_id FROM chapter_requisition WHERE chapter_requisition_id = $1',
          [chapter_requisition_id]
      );
      
      const isVisitorRequest = visitorCheck.rows[0]?.visitor_id !== null;
      console.log('👤 Is Visitor Request:', isVisitorRequest);

      // Keep existing slab wise comment check
      const isOnlySlabWiseCommentUpdate = slab_wise_comment && 
          !approve_status && 
          !ro_comment && 
          pickup_status === undefined && 
          !pickup_date && 
          !given_status;

      if (!chapter_requisition_id) {
          console.log('❌ Missing chapter_requisition_id in request body');
          return res.status(400).json({
              success: false,
              message: "chapter_requisition_id is required in request body"
          });
      }

      // Get existing requisition data
      const existingRequisition = await con.query(
          'SELECT * FROM chapter_requisition WHERE chapter_requisition_id = $1',
          [chapter_requisition_id]
      );

      if (existingRequisition.rows.length === 0) {
          console.log('❌ No requisition found with ID:', chapter_requisition_id);
          return res.status(404).json({
              success: false,
              message: "Requisition not found"
          });
      }

      let finalApproveStatus = {};
      let finalRoComment = {};
      let finalGivenStatus = {};

      // Helper function to safely parse JSON
      const safeJSONParse = (str) => {
          if (!str) return {};
          try {
              return typeof str === 'object' ? str : JSON.parse(str);
          } catch (e) {
              console.error('Error parsing JSON:', e);
              return {};
          }
      };

      // Check if this is only a pickup status update
      const isOnlyPickupUpdate = (pick_up_status_ro !== undefined || pick_up_status_ro_comment !== undefined) && 
          !approve_status && 
          !ro_comment && 
          !given_status && 
          !slab_wise_comment;

      if (isOnlyPickupUpdate) {
          finalApproveStatus = safeJSONParse(existingRequisition.rows[0].approve_status);
          finalRoComment = safeJSONParse(existingRequisition.rows[0].ro_comment);
          finalGivenStatus = safeJSONParse(existingRequisition.rows[0].given_status);
      } else if (isVisitorRequest) {
          finalApproveStatus = approve_status || existingRequisition.rows[0].approve_status;
          finalRoComment = ro_comment || existingRequisition.rows[0].ro_comment;
          finalGivenStatus = given_status || existingRequisition.rows[0].given_status || '{}';
      } else {
          finalApproveStatus = safeJSONParse(existingRequisition.rows[0].approve_status);
          finalRoComment = safeJSONParse(existingRequisition.rows[0].ro_comment);
          finalGivenStatus = safeJSONParse(existingRequisition.rows[0].given_status);

          if (approve_status) {
              finalApproveStatus = { ...finalApproveStatus, ...safeJSONParse(approve_status) };
          }
          if (ro_comment) {
              finalRoComment = { ...finalRoComment, ...safeJSONParse(ro_comment) };
          }
          if (given_status) {
              finalGivenStatus = { ...finalGivenStatus, ...safeJSONParse(given_status) };
          }
      }

          // Handle member_accolades insertion for approved statuses
          if (!isVisitorRequest && approve_status) {
              const approveStatusObj = safeJSONParse(approve_status);
              
              for (const [key, status] of Object.entries(approveStatusObj)) {
                  if (status === 'approved') {
                      const [memberId, accoladeId] = key.split('_').map(Number);
                      console.log(`🎯 Processing approved accolade for member ${memberId}, accolade ${accoladeId}`);

                      // First check if this combination already exists
                      const checkQuery = `
                          SELECT id FROM member_accolades 
                          WHERE member_id = $1 AND accolade_id = $2
                          LIMIT 1
                      `;
                      
                      const existingRecord = await con.query(checkQuery, [memberId, accoladeId]);
                      
                      if (existingRecord.rows.length === 0) { 
                          const insertQuery = `
                              INSERT INTO member_accolades 
                              (member_id, accolade_id, issue_date, count, given_date, comment)
                              VALUES ($1, $2, CURRENT_DATE, 1, NULL, NULL)
                              RETURNING *
                          `;

                          const insertResult = await con.query(insertQuery, [memberId, accoladeId]);
                          console.log('✅ Inserted new record into member_accolades:', insertResult.rows[0]);
                      } else {
                          console.log(`ℹ️ Skipping insert: Accolade ${accoladeId} already exists for member ${memberId}`);
                      }
                  }
              }
          }

          // Handle given status updates - Only update member_accolades table
          if (given_status) {
          console.log('📝 Processing member accolade updates for given status:', given_status);
          
          const givenStatusObj = safeJSONParse(given_status);
          
          for (const [key, value] of Object.entries(givenStatusObj)) {
              if (value && value.date) {
                  const [memberId, accoladeId] = key.split('_').map(Number);
                      console.log(`🎯 Processing given status for member ${memberId}, accolade ${accoladeId}`);

                      // Update member_accolades table
                      const updateAccoladeQuery = `
                          UPDATE member_accolades 
                          SET given_date = $1
                          WHERE member_id = $2 
                          AND accolade_id = $3 
                          AND given_date IS NULL
                          RETURNING *
                      `;

                      const accoladeResult = await con.query(updateAccoladeQuery, [
                          value.date,
                          memberId,
                          accoladeId
                      ]);

                      if (accoladeResult.rows.length > 0) {
                          console.log('✅ Updated member_accolades:', accoladeResult.rows[0]);
                      } else {
                          console.log(`ℹ️ No eligible record found to update given_date for member ${memberId}, accolade ${accoladeId}`);
                  }
              }
          }
      }

      const finalPickupDate = pickup_date && pickup_date.trim() !== '' ? pickup_date : existingRequisition.rows[0].pickup_date;

      const query = `
          UPDATE chapter_requisition 
          SET 
              approve_status = $1,
              ro_comment = $2,
              pickup_status = $3,
              pickup_date = $4,
              given_status = $5,
              slab_wise_comment = $6,
              pick_up_status_ro = $7,
              pick_up_status_ro_comment = $8
          WHERE chapter_requisition_id = $9
          RETURNING *
      `;

      const prepareValue = (value) => {
          if (!value) return '{}';
          
          if (typeof value === 'string') {
              try {
                  const parsed = JSON.parse(value);
                  return JSON.stringify(parsed);
              } catch (e) {
                  return value;
              }
          }
          
          return JSON.stringify(value);
      };

      const values = [
          prepareValue(finalApproveStatus),
          prepareValue(finalRoComment),
          isOnlySlabWiseCommentUpdate ? existingRequisition.rows[0].pickup_status : 
              (pickup_status !== undefined ? pickup_status : existingRequisition.rows[0].pickup_status),
          finalPickupDate,
          prepareValue(finalGivenStatus),
          slab_wise_comment || existingRequisition.rows[0].slab_wise_comment,
          pick_up_status_ro !== undefined ? pick_up_status_ro : existingRequisition.rows[0].pick_up_status_ro,
          pick_up_status_ro_comment !== undefined ? pick_up_status_ro_comment : existingRequisition.rows[0].pick_up_status_ro_comment,
          chapter_requisition_id
      ];

      const result = await con.query(query, values);
      const updatedRequisition = result.rows[0];

          await con.query('COMMIT');
      console.log('✅ Chapter Requisition updated successfully:', updatedRequisition);

      res.json({
          success: true,
          message: "Chapter requisition updated successfully",
          data: updatedRequisition
      });

      } catch (error) {
          await con.query('ROLLBACK');
          throw error;
      }

  } catch (error) {
      console.error('❌ Error in updateChapterRequisition:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
          success: false,
          message: "Error updating chapter requisition",
          error: error.message
      });
  }
};



const updateMemberRequisition = async (req, res) => {
  console.log('\n🔄 Starting Member Requisition Update');
  console.log('=====================================');
  console.log('📥 Received request body:', req.body);

  try {
      const { 
          member_request_id,
          member_id,
          chapter_id,
          accolade_id,
          approve_status,
          response_comment,
          given_status,
          given_date,
          request_status
      } = req.body;

      console.log('📝 Request Data:', {
          member_request_id,
          member_id,
          chapter_id,
          accolade_id,
          approve_status,
          response_comment,
          given_status,
          given_date,
          request_status
      });

      let query;
      let values;

      // Case 1: If member_request_id is provided (approval flow)
      if (member_request_id) {
          // Validate required fields for approval flow
          if (!member_id || !chapter_id || !accolade_id) {
              console.error('❌ Missing required fields for approval flow');
              return res.status(400).json({
                  success: false,
                  message: "Required fields missing: member_id, chapter_id, and accolade_id are mandatory"
              });
          }

          // Begin transaction
          const client = await con.connect();

          try {
              await client.query('BEGIN');

              // Update member_requisition_request
          query = `
              UPDATE member_requisition_request 
              SET 
                  approve_status = CAST($1 AS VARCHAR),
                  response_comment = $2,
                  approved_date = CASE 
                      WHEN CAST($1 AS VARCHAR) = 'approved' THEN CURRENT_TIMESTAMP 
                      ELSE approved_date 
                  END
              WHERE 
                  member_request_id = $3 
                  AND member_id = $4 
                  AND chapter_id = $5 
                  AND accolade_id = $6
                  AND given_status = false
                  AND request_status = 'open'
                  AND given_date IS NULL
              RETURNING *
          `;

          values = [
              approve_status || 'pending',
              response_comment || '',
              member_request_id,
              member_id,
              chapter_id,
              accolade_id
          ];

              const result = await client.query(query, values);

              if (result.rows.length === 0) {
                  await client.query('ROLLBACK');
                  console.log('❌ No matching requisition found or conditions not met');
                  return res.status(404).json({
                      success: false,
                      message: "No matching requisition found or conditions not met"
                  });
              }

              await client.query('COMMIT');

              console.log('✅ Member Requisition updated successfully:', result.rows[0]);

              res.json({
                  success: true,
                  message: "Member requisition updated successfully",
                  data: result.rows[0]
              });

          } catch (error) {
              await client.query('ROLLBACK');
              throw error;
          } finally {
              client.release();
          }
      }
      // Case 2: Update given status flow
      else {
          // Validate required fields for given status update
          if (!member_id || !chapter_id || !accolade_id || given_status === undefined || !given_date || !request_status) {
              console.error('❌ Missing required fields for given status update');
              return res.status(400).json({
                  success: false,
                  message: "Required fields missing for given status update"
              });
          }

          // Begin transaction
          const client = await con.connect();

          try {
              await client.query('BEGIN');

              // First update member_requisition_request
          query = `
              UPDATE member_requisition_request 
              SET 
                  given_status = $1,
                  given_date = $2,
                  request_status = $3
              WHERE 
                  member_id = $4 
                  AND chapter_id = $5 
                  AND accolade_id = $6
                  AND given_status = false
                  AND request_status = 'open'
                  AND given_date IS NULL
              RETURNING *
          `;

          values = [
              given_status,
              given_date,
              request_status,
              member_id,
              chapter_id,
              accolade_id
          ];

              const result = await client.query(query, values);

      if (result.rows.length === 0) {
                  await client.query('ROLLBACK');
          console.log('❌ No matching requisition found or conditions not met');
          return res.status(404).json({
              success: false,
              message: "No matching requisition found or conditions not met"
          });
      }

              // Update member_accolades if record exists
              const updateAccoladeQuery = `
                  UPDATE member_accolades 
                  SET given_date = $1
                  WHERE member_id = $2 
                  AND accolade_id = $3 
                  AND issue_date IS NOT NULL
                  RETURNING *
              `;

              const accoladeValues = [
                  given_date,
                  member_id,
                  accolade_id
              ];

              console.log('🎯 Updating member_accolades:', accoladeValues);

              const accoladeResult = await client.query(updateAccoladeQuery, accoladeValues);
              console.log('✅ Updated member_accolades:', accoladeResult.rows[0]);

              await client.query('COMMIT');

      console.log('✅ Member Requisition updated successfully:', result.rows[0]);

      res.json({
          success: true,
          message: "Member requisition updated successfully",
          data: result.rows[0]
      });

          } catch (error) {
              await client.query('ROLLBACK');
              throw error;
          } finally {
              client.release();
          }
      }

  } catch (error) {
      console.error('❌ Error in updateMemberRequisition:', error);
      res.status(500).json({
          success: false,
          message: "Error updating member requisition",
          error: error.message
      });
  }
};

// Add this new controller
const sendVisitorEmail = async (req, res) => {
  try {
      const { visitor_email, visitor_name, chapter_name } = req.body;
      console.log('📧 Preparing welcome email:', {
          to: visitor_email,
          name: visitor_name,
          chapter: chapter_name
      });

      // Get current date and time in the required format
      const currentDate = new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: true
      });
       // Define the attachments with exact paths
       const attachments = [
        {
            filename: '4(a)- Contact Sphere Sheet.docx',
            path: path.join(__dirname, 'email-attachments', '4(a)- Contact Sphere Sheet (2) (1).docx'),
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        },
        {
            filename: '4(b)- GAINS Profile Sheet.docx',
            path: path.join(__dirname, 'email-attachments', '4(b)- GAINS Profile Sheet (2) (1).docx'),
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        },
        {
            filename: '4(c)- Biography Sheet for members.doc',
            path: path.join(__dirname, 'email-attachments', '4(c)- Biography Sheet for members (2) (1) (1).doc'),
            contentType: 'application/msword'
        },
        {
            filename: '4(d)- SAMPLE Filled GAINS profile.pdf',
            path: path.join(__dirname, 'email-attachments', '4(d)- SAMPLE Filled GAINS profile (2) (1).pdf'),
            contentType: 'application/pdf'
        }
    ];

    // Verify all attachments exist
    for (const attachment of attachments) {
        if (!fs.existsSync(attachment.path)) {
            console.error('❌ Missing attachment:', attachment.filename);
            throw new Error(`Required attachment ${attachment.filename} not found`);
        }
    }


      const mailOptions = {
          from: 'Vice President Desk-BNI Prolific <info@bninewdelhi.in>',
          to: `${visitor_name} <${visitor_email}>`,
          cc: [
              'SUNIL K. BNI DIRECTOR <sunilk@bni-india.in>',
              'Shini Sunil <shini.sunil@adico.in>',
              'Raja Shukla | Digital Marketing | Prolific Shukla <rajashukla@outlook.com>',
              'Yatin wadhwa| Prolific| General Insurance <yatinwadhwa@ymail.com>',
              'admin.bnidw@adico.in',
              'BNI N E W Delhi Admin <admin@bninewdelhi.com>',
              'sunil.k@adico.in'
          ],
          subject: `Welcome Aboard to the BNI ${chapter_name} Chapter ${visitor_name}`,
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6;">
                  <div style="border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; color: #666;">
                      <p><strong>From:</strong> Vice President Desk-BNI Prolific &lt;info@bninewdelhi,in&gt;</p>
                      <p><strong>Sent:</strong> ${currentDate}</p>
                      <p><strong>To:</strong> ${visitor_name} &lt;${visitor_email}&gt;</p>
                      <p><strong>Cc:</strong> SUNIL K. BNI DIRECTOR &lt;sunilk@bni-india.in&gt;; Shini Sunil &lt;shini.sunil@adico.in&gt;; Raja Shukla | Digital Marketing | Prolific Shukla &lt;rajashukla@outlook.com&gt;; Yatin wadhwa| Prolific| General Insurance &lt;yatinwadhwa@ymail.com&gt;; admin.bnidw@adico.in; BNI N E W Delhi Admin &lt;admin@bninewdelhi.com&gt;; sunil.k@adico.in</p>
                      <p><strong>Subject:</strong> Welcome Aboard to the BNI ${chapter_name} Chapter ${visitor_name}</p>
                  </div>

                  <p>Dear ${visitor_name},</p>

                  <p style="margin-top: 20px;">
                      I, on behalf of the Membership Committee, congratulate you for deciding to be a part of the ${chapter_name} Chapter in the business category of REAL ESTATE - 2ND HOMES- Only Uttrakhand Please remember that a BNI member represents his / her given business category on this platform and not his / her entire business.
                  </p>

                  <p style="margin-top: 20px;">
                      Your payment of membership has been received and we are going to inducted you in the chapter on 20th March 2025
                  </p>

                  <p style="margin-top: 20px;">
                      In order to proceed with the Induction formalities, please comply with the following:
                  </p>

                  <ul style="margin-top: 20px; margin-left: 20px;">
                      <li style="margin-bottom: 10px;">Share your Bio Sheet (sample attached-prose form), as this would be read out during the induction.</li>
                      <li style="margin-bottom: 10px;">Send a high-resolution passport size photograph along with your personal and professional photos, email ID and mobile number so that our creative team can include these details in the 30 seconds meeting note sheet and induction video.</li>
                      <li style="margin-bottom: 10px;">Your Gains Profile which is required for Goal-Oriented 1-2-1's</li>
                  </ul>

                  <p style="margin-top: 20px;">
                      In this formal meeting, you may bring along a client or a vendor to add to your business credibility. I would request the observer details to be shared, at least 48 hrs prior to the meeting day.
                  </p>

                  <p style="margin-top: 20px;">
                      Please note that Mr. RAJA SHUKLA (President) - 9599052298, Mr. Yatin Wadhwa (Secretary- 9818979676), Mr. Sachit Chawla (Mentor Coordinator-9811930922) would be calling you over the next few days to advise you on our mentoring program to help start your BNI journey.
                  </p>

                  <p style="margin-top: 20px;">
                      I would be keen to help you with any clarifications that you may have.
                  </p>
              </div>
          `,
          attachments: attachments
      };
      console.log('📎 Attaching documents:', attachments.map(a => a.filename));

      await transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', visitor_email);

      await transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', visitor_email);

      // Update visitors table to set welcome_mail to true
      const updateQuery = `
          UPDATE visitors 
          SET welcome_mail = true 
          WHERE visitor_email = $1 
          RETURNING *
      `;
      
      const result = await con.query(updateQuery, [visitor_email]);
      console.log('✅ Updated welcome_mail status in visitors table:', result.rows[0]);

      res.status(200).json({
          success: true,
          message: `Welcome email sent successfully to ${visitor_name}`
      });

  } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to send welcome email',
          error: error.message
      });
  }
};
const sendVPEmail = async (req, res) => {
try {
    const { visitor_email, visitor_name, chapter_name } = req.body;
    console.log('📧 Preparing VP email:', {
        to: visitor_email,
        name: visitor_name,
        chapter: chapter_name
    });

    // Get current date in DD-MM-YYYY format
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');

    const mailOptions = {
      from: 'Vice President Desk-BNI Prolific <info@bninewdelhi.in>',
          to: `${visitor_name} <${visitor_email}>`,
        cc: [
            'Prolific DC Lalpreet Aulakh <lalpreet@studiodesignbox.com>',
            'SUNIL K. BNI DIRECTOR <sunilk@bni-india.in>',
            'Sunil K <sunil.k@adico.in>',
            'BNI NEW Delhi | Support <support@bninewdelhi.com>',
            'Raja Shukla | Digital Marketing | Prolific Shukla <rajashukla@outlook.com>',
            'Yatin wadhwa| Prolific| General Insurance <yatinwadhwa@ymail.com>',
            'admin.bnidw@adico.in'
        ],
        subject: 'Request for BNI Connect Activation',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6;">
                <div style="border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; color: #666;">
                    <p><strong>From:</strong> Vice President Desk-BNI Prolific &lt;info@bninewdelhi,in&gt;</p>
                    <p><strong>Sent:</strong> ${new Date().toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric',
                        hour12: true
                    })}</p>
                    <p><strong>To:</strong> BNI N E W Delhi Admin &lt;admin@bninewdelhi.com&gt;</p>
                    <p><strong>Cc:</strong> Prolific DC Lalpreet Aulakh &lt;lalpreet@studiodesignbox.com&gt;; SUNIL K. BNI DIRECTOR &lt;sunilk@bni-india.in&gt;; Sunil K &lt;sunil.k@adico.in&gt;; BNI NEW Delhi | Support &lt;support@bninewdelhi.com&gt;; Raja Shukla | Digital Marketing | Prolific Shukla &lt;rajashukla@outlook.com&gt;; Yatin wadhwa| Prolific| General Insurance &lt;yatinwadhwa@ymail.com&gt;; admin.bnidw@adico.in</p>
                    <p><strong>Subject:</strong> Request for BNI Connect Activation</p>
                </div>

                <p>Dear Blessy,</p>

                <p style="margin-top: 20px;">
                    This is to inform you that we have already inducted <strong>${visitor_name}</strong> in the chapter today on ${currentDate}. All joining documents have been submitted in RO and visitor entry is validated and completed by ST, including tax address and tax reference number. The Google sheet has been filled with all details for verification.
                </p>
            </div>
        `
    };

    console.log('📧 Sending VP email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        cc: mailOptions.cc,
        subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent:', info.response);
    console.log('✅ VP email sent successfully');

     // Update visitors table to set vp_mail to true
     const updateQuery = `
     UPDATE visitors 
     SET vp_mail = true 
     WHERE visitor_email = $1 
     RETURNING *
 `;
 
 const result = await con.query(updateQuery, [visitor_email]);
 console.log('✅ Updated vp_mail status in visitors table:', result.rows[0]);

    res.status(200).json({
        success: true,
        message: `VP email sent successfully for ${visitor_name}`,
        emailInfo: info
    });

} catch (error) {
    console.error('❌ Error sending VP email:', error);
    res.status(500).json({
        success: false,
        message: 'Failed to send VP email',
        error: error.message
    });
}
};

const updateVisitor = async (req, res) => {
  try {
      console.log('\n🔄 Starting Visitor Update Process');
      console.log('=====================================');
      console.log('📝 Request Body:', req.body);
      
      const { 
          visitor_id, 
          chapter_apply_kit, 
          visitor_entry_excel, 
          google_updation_sheet, 
          approve_induction_kit, 
          induction_status,
          verification 
      } = req.body;

      // Validate visitor_id
      if (!visitor_id) {
          console.log('❌ Error: visitor_id is missing');
          return res.status(400).json({ error: 'visitor_id is required' });
      }

      // First, get the existing visitor data
      const existingVisitorQuery = 'SELECT verification FROM visitors WHERE visitor_id = $1';
      const existingVisitor = await con.query(existingVisitorQuery, [visitor_id]);
      
      let updatedVerification = {};
      
      // If there's existing verification data, parse it
      if (existingVisitor.rows[0]?.verification) {
          try {
              updatedVerification = JSON.parse(existingVisitor.rows[0].verification);
              console.log('📊 Existing verification data:', updatedVerification);
          } catch (error) {
              console.error('❌ Error parsing existing verification:', error);
          }
      }

      // Merge new verification data with existing data
      if (verification) {
          updatedVerification = {
              ...updatedVerification,
              ...verification
          };
          console.log('🔄 Merged verification data:', updatedVerification);
      }

      const query = `
          UPDATE visitors
          SET 
              chapter_apply_kit = COALESCE($1, chapter_apply_kit),
              visitor_entry_excel = COALESCE($2, visitor_entry_excel),
              google_updation_sheet = COALESCE($3, google_updation_sheet),
              approve_induction_kit = COALESCE($4, approve_induction_kit),
              induction_status = COALESCE($5, induction_status),
              verification = $6
          WHERE visitor_id = $7
          RETURNING *;
      `;

      const values = [
          chapter_apply_kit,
          visitor_entry_excel,
          google_updation_sheet,
          approve_induction_kit,
          induction_status,
          JSON.stringify(updatedVerification),  // Use merged verification data
          visitor_id
      ];

      console.log('🔍 Executing query with values:', values);

      const { rows } = await con.query(query, values);

      if (rows.length === 0) {
          console.log('❌ Error: No visitor found with ID:', visitor_id);
          return res.status(404).json({ error: 'Visitor not found' });
      }

      console.log('✅ Visitor updated successfully:', rows[0]);
      res.json({ 
          message: 'Visitor updated successfully', 
          updatedVisitor: rows[0] 
      });

  } catch (error) {
      console.error('❌ Error updating visitor:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
      });
  }
};


const sendTrainingMails = async (req, res) => {
  try {
      const { member_ids, training_id } = req.body;
      console.log('📧 Starting Training Mail Process:', {
          member_ids,
          training_id
      });

      // Updated query to use correct column name: member_email_address
      const memberQuery = `
          SELECT member_email_address, member_first_name, member_last_name 
          FROM member 
          WHERE member_id = ANY($1::int[])
      `;
      const memberResult = await con.query(memberQuery, [member_ids]);
      console.log('👥 Found members:', memberResult.rows);

      // Get training details with additional fields
      const trainingQuery = `
          SELECT training_name, training_date, training_venue, training_price, training_time, training_note 
          FROM training
          WHERE training_id = $1
      `;
      const trainingResult = await con.query(trainingQuery, [training_id]);
      console.log('📚 Training details:', trainingResult.rows[0]);

      // Get hotel details for the venue
      const hotelQuery = `
          SELECT hotel_name, hotel_address
          FROM hotel 
          WHERE hotel_id = $1
      `;
      const hotelResult = await con.query(hotelQuery, [trainingResult.rows[0].training_venue]);
      
      // Process hotel address to get only first two comma-separated parts
      let venueAddress = '';
      if (hotelResult.rows[0]) {
          const addressParts = hotelResult.rows[0].hotel_address.split(',');
          venueAddress = addressParts.slice(0, 2).join(',');
      }

      // Send emails to each member
      const emailPromises = memberResult.rows.map(async (member) => {
          console.log(`📤 Preparing email for ${member.member_first_name} ${member.member_last_name}`);

          const mailOptions = {
              from: "info@bninewdelhi.in",
              to: `${member.member_first_name} ${member.member_last_name} <${member.member_email_address}>`,
              subject: `Training Update: ${trainingResult.rows[0].training_name}`,
              html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #d01f2f;">BNI Training Update</h2>
                      <p>Dear ${member.member_first_name},</p>
                      <p>Hi! This is a  email regarding the new training.</p>
                      <p>Training Details:</p>
                      <ul>
                          <li>Training: ${trainingResult.rows[0].training_name}</li>
                          <li>Date: ${new Date(trainingResult.rows[0].training_date).toLocaleDateString()}</li>
                          <li>Time: ${trainingResult.rows[0].training_time}</li>
                          <li>Venue: ${hotelResult.rows[0]?.hotel_name || 'TBD'}</li>
                          <li>Address: ${venueAddress || 'TBD'}</li>
                          <li>Training Ticket Price: ₹${trainingResult.rows[0].training_price || 'Free'}</li>
                          ${trainingResult.rows[0].training_note ? `<li> TrainingNote: ${trainingResult.rows[0].training_note}</li>` : ''}
                      </ul>
                      <p><strong>Best regards,<br>BNI NEW Delhi</strong></p>

                      <!-- Payment Button -->
            <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                <a href="https://bninewdelhi.com/training-payments/3/bdbe4592-738e-42b1-ad02-beea957a3f9d/1" 
                   style="
                       background-color: red;
                       color: white;
                       padding: 15px 30px;
                       text-decoration: none;
                       border-radius: 25px;
                       font-weight: bold;
                       font-size: 16px;
                       display: inline-block;
                       box-shadow: 0 4px 15px rgba(208, 31, 47, 0.3);
                       transition: all 0.3s ease;
                       border: 2px solid transparent;
                   "
                   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(208, 31, 47, 0.4)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(208, 31, 47, 0.3)';"
                >
                    Register Now
                </a>
            </div>
                  </div>
              `
          };

          try {
              const info = await transporter.sendMail(mailOptions);
              console.log(`✅ Email sent successfully to ${member.member_email_address}:`, info.messageId);
              return {
                  success: true,
                  member_email: member.member_email_address,
                  messageId: info.messageId
              };
          } catch (error) {
              console.error(`❌ Error sending email to ${member.member_email_address}:`, error);
              return {
                  success: false,
                  member_email: member.member_email_address,
                  error: error.message
              };
          }
      });

      const emailResults = await Promise.all(emailPromises);
      console.log('📊 Email sending results:', emailResults);

      // Count successful and failed emails
      const successful = emailResults.filter(result => result.success).length;
      const failed = emailResults.filter(result => !result.success).length;

      res.status(200).json({
          success: true,
          message: `Emails sent: ${successful} successful, ${failed} failed`,
          details: emailResults
      });

  } catch (error) {
      console.error('❌ Error in sendTrainingMails:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to send training emails',
          error: error.message
      });
  }
};


const updateVisitorAndEoi = async (req, res) => {
  try {
    const { visitor_id } = req.params;
    const {
      // Fields that can be updated in visitors table
      region_id,
      chapter_id,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_company_name,
      visitor_address,
      visitor_gst,
      visitor_business,
      visitor_category,
      
      // Fields that can be updated only in EOI form
      best_time_to_reach,
      hear_about_us,
      previous_member,
      exp_rating,
      chapter_visit_date
    } = req.body;

    // Start transaction
    await con.query('BEGIN');

    try {
      // Update visitor table
      const visitorQuery = `
        UPDATE Visitors 
        SET 
          region_id = $1,
          chapter_id = $2,
          visitor_email = $3,
          visitor_phone = $4,
          visitor_company_name = $5,
          visitor_address = $6,
          visitor_gst = $7,
          visitor_business = $8,
          visitor_category = $9
        WHERE visitor_id = $10
        RETURNING *
      `;

      const visitorValues = [
        region_id,
        chapter_id,
        visitor_email,
        visitor_phone,
        visitor_company_name,
        visitor_address,
        visitor_gst,
        visitor_business,
        visitor_category,
        visitor_id
      ];

      const visitorResult = await con.query(visitorQuery, visitorValues);

      // Update only specific fields in EOI form table
      const eoiQuery = `
        UPDATE eoi_form 
        SET 
          region_id = $1,
          chapter_id = $2,
          best_time_to_reach = $3,
          hear_about_us = $4,
          previous_member = $5,
          exp_rating = $6,
          chapter_visit_date = $7
        WHERE visitor_id = $8
        RETURNING *
      `;

      const eoiValues = [
        region_id,
        chapter_id,
        best_time_to_reach,
        hear_about_us,
        previous_member,
        exp_rating,
        chapter_visit_date,
        visitor_id
      ];

      const eoiResult = await con.query(eoiQuery, eoiValues);

      // Commit transaction
      await con.query('COMMIT');

      res.status(200).json({
        success: true,
        message: "Visitor and EOI form updated successfully",
        visitor: visitorResult.rows[0],
        eoi: eoiResult.rows[0]
      });

    } catch (error) {
      // Rollback in case of error
      await con.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating visitor and EOI form:', error);
    res.status(500).json({
      success: false,
      message: "Error updating visitor and EOI form",
      error: error.message
    });
  }
};

const updateInterviewSheetAnswers = async (req, res) => {
  try {
    const { visitor_id } = req.params;
    const { 
      commitmentChapter,  // new chapter_id
      dynamicAnswers,     // object containing question_id: new_answer pairs
      date               // new interview date if needed
    } = req.body;

    console.log("Update request body:", req.body);
    console.log("Updating answers for visitor_id:", visitor_id);

    // Start a transaction
    await con.query('BEGIN');

    try {
      const updatePromises = [];

      // Loop through each answer to update
      for (const [questionId, newAnswer] of Object.entries(dynamicAnswers)) {
        if (isNaN(parseInt(questionId))) {
          console.log(`Skipping invalid question ID: ${questionId}`);
          continue;
        }

        const updateQuery = `
          UPDATE interview_sheet_answers 
          SET 
            answer = $1,
            chapter_id = $2,
            interview_date = $3
          WHERE 
            visitor_id = $4 
            AND question_id = $5
          RETURNING *;
        `;

        const parsedChapterId = parseInt(commitmentChapter);
        if (isNaN(parsedChapterId)) {
          throw new Error('Invalid chapter ID provided');
        }

        const values = [
          newAnswer,
          parsedChapterId,
          date,
          visitor_id,
          parseInt(questionId)
        ];

        updatePromises.push(con.query(updateQuery, values));
      }

      // Execute all updates
      const results = await Promise.all(updatePromises);
      
      // Commit transaction
      await con.query('COMMIT');

      console.log("Interview sheet answers updated successfully");
      
      res.status(200).json({
        message: "Interview sheet answers updated successfully!",
        data: results.map(result => result.rows[0])
      });

    } catch (error) {
      // Rollback in case of error
      await con.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Error updating interview sheet answers:", error);
    res.status(500).json({
      error: "Error updating interview sheet answers",
      details: error.message
    });
  }
};

const updateCommitmentSheet = async (req, res) => {
  try {
    const { visitor_id } = req.params;
    const {
      visitorName, chapter, chequeNum, chequeDate, bank, address,
      agree1, agree2, agree3, agree4, agree5, agree6, agree7, agree8, agree9,
      agree10, agree11, agree12, agree13, category, companyName, date,
      email, gstin, inductionDate, mobile, name, neftNum, sign, sponsor, vpsign
    } = req.body;

    console.log("Updating commitment sheet for visitor_id:", visitor_id);
    console.log("Update data:", req.body);

    // First check if visitor exists and has member_application_form
    const visitorQuery = 'SELECT member_application_form FROM Visitors WHERE visitor_id = $1';
    const visitorResult = await con.query(visitorQuery, [visitor_id]);

    if (visitorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    if (visitorResult.rows[0].member_application_form) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update commitment sheet as member application form has already been filled'
      });
    }

    // Update commitment sheet
    const updateQuery = `
      UPDATE commitmentsheet 
      SET 
        visitorName = $1,
        chapter = $2,
        chequeNum = $3,
        chequeDate = $4,
        bank = $5,
        address = $6,
        agree1 = $7,
        agree2 = $8,
        agree3 = $9,
        agree4 = $10,
        agree5 = $11,
        agree6 = $12,
        agree7 = $13,
        agree8 = $14,
        agree9 = $15,
        agree10 = $16,
        agree11 = $17,
        agree12 = $18,
        agree13 = $19,
        category = $20,
        companyName = $21,
        date = $22,
        email = $23,
        gstin = $24,
        inductionDate = $25,
        mobile = $26,
        name = $27,
        neftNum = $28,
        sign = $29,
        sponsor = $30,
        vpsign = $31
      WHERE visitor_id = $32
      RETURNING *;
    `;

    const values = [
      visitorName, chapter, chequeNum, chequeDate, bank, address,
      agree1, agree2, agree3, agree4, agree5, agree6, agree7, agree8, agree9,
      agree10, agree11, agree12, agree13, category, companyName, date,
      email, gstin, inductionDate, mobile, name, neftNum, sign, sponsor,
      vpsign, visitor_id
    ];

    // Start transaction
    await con.query('BEGIN');

    try {
      const result = await con.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('No commitment sheet found for this visitor');
      }

      // Commit transaction
      await con.query('COMMIT');

      console.log("Commitment sheet updated successfully");
      res.status(200).json({
        success: true,
        message: 'Commitment sheet updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      // Rollback in case of error
      await con.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Error updating commitment sheet:", error);
    res.status(500).json({
      success: false,
      message: 'Error updating commitment sheet',
      error: error.message
    });
  }
};

const updateInclusionSheet = async (req, res) => {
  try {
    const { visitor_id } = req.params;
    const {
      membername,
      visitorname,
      chapter,
      category,
      chaptername,
      classificationexcludes,
      confirmation1,
      confirmation2,
      confirmation3,
      confirmation4,
      date,
      signature,
      vpsign,
      areaofexpertise
    } = req.body;

    console.log("Updating inclusion sheet for visitor_id:", visitor_id);
    console.log("Update data:", req.body);

    // First check if visitor exists and has member_application_form
    const visitorQuery = 'SELECT member_application_form FROM Visitors WHERE visitor_id = $1';
    const visitorResult = await con.query(visitorQuery, [visitor_id]);

    if (visitorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    if (visitorResult.rows[0].member_application_form) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update inclusion sheet as member application form has already been filled'
      });
    }

    // Update inclusion sheet
    const updateQuery = `
      UPDATE inclusionsheet 
      SET 
        membername = $1,
        visitorname = $2,
        chapter = $3,
        category = $4,
        chaptername = $5,
        classificationexcludes = $6,
        confirmation1 = $7,
        confirmation2 = $8,
        confirmation3 = $9,
        confirmation4 = $10,
        date = $11,
        signature = $12,
        vpsign = $13,
        areaofexpertise = $14
      WHERE visitor_id = $15
      RETURNING *;
    `;

    const values = [
      membername,
      visitorname,
      chapter,
      category,
      chaptername,
      classificationexcludes,
      confirmation1,
      confirmation2,
      confirmation3,
      confirmation4,
      date,
      signature,
      vpsign,
      areaofexpertise,
      visitor_id
    ];

    // Start transaction
    await con.query('BEGIN');

    try {
      const result = await con.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('No inclusion sheet found for this visitor');
      }

      // Commit transaction
      await con.query('COMMIT');

      console.log("Inclusion sheet updated successfully");
      res.status(200).json({
        success: true,
        message: 'Inclusion sheet updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      // Rollback in case of error
      await con.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Error updating inclusion sheet:", error);
    res.status(500).json({
      success: false,
      message: 'Error updating inclusion sheet',
      error: error.message
    });
  }
};


const addVisitorPayment = async (req, res) => {
  const invoiceData = req.body;
  console.log("📥 Received Visitor Payment Data:", invoiceData);

  try {
    const issuedDate = new Date(invoiceData.date_issued);

    // Generate unique IDs
    const order_id = `VIS${Date.now()}`;
    const cf_payment_id = `TRX${Date.now()}`;
    console.log("🔑 Generated IDs:", { order_id, cf_payment_id });

    // Define default values
    const defaultValues = {
      order_currency: "INR",
      payment_gateway_id: null,
      order_status: "ACTIVE",
      payment_session_id: null,
      payment_currency: "INR",
      payment_status: "SUCCESS",
      payment_time: issuedDate,
      payment_completion_time: issuedDate,
      payment_note: "Visitor Payment",
      error_details: {}
    };

    // Prepare order data with visitor information
    const orderData = [
      order_id,
      invoiceData.taxable_amount || 0,
      defaultValues.order_currency,
      invoiceData.payment_gateway_id || defaultValues.payment_gateway_id,
      invoiceData.member_id,
      invoiceData.chapter_id,
      invoiceData.region_id,
      invoiceData.universal_link_id,
      null, // ulid
      defaultValues.order_status,
      defaultValues.payment_session_id,
      0, // one_time_registration_fee
      0, // membership_fee
      invoiceData.gst_amount || 0,
      invoiceData.member_name,
      invoiceData.visitor_email,
      invoiceData.visitor_mobile,
      invoiceData.visitor_gstin,
      invoiceData.visitor_company,
      invoiceData.visitor_mobile,
      null, // renewal_year
      defaultValues.payment_note,
      null, // training_id
      null, // event_id
      null, // kitty_bill_id
      null, // visitor_id
      invoiceData.visitor_name,
      invoiceData.visitor_email,
      invoiceData.visitor_mobile,
      invoiceData.visitor_address,
      invoiceData.visitor_company,
      invoiceData.visitor_gstin,
      invoiceData.visitor_business_category,
      invoiceData.visitor_company_address,
      issuedDate, // created_at
      issuedDate  // updated_at
    ];

    console.log("📝 Prepared Order Data:", orderData);

    // Insert into Orders table
    const orderResult = await con.query(
      `INSERT INTO Orders (
        order_id, order_amount, order_currency, payment_gateway_id, 
        customer_id, chapter_id, region_id, universal_link_id, ulid, 
        order_status, payment_session_id, one_time_registration_fee, 
        membership_fee, tax, member_name, customer_email, customer_phone, 
        gstin, company, mobile_number, renewal_year, payment_note, 
        training_id, event_id, kitty_bill_id, visitor_id,
        visitor_name, visitor_email, visitor_mobilenumber, visitor_address,
        visitor_company, visitor_gstin, visitor_business, visitor_company_address,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
                $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36) 
      RETURNING *`,
      orderData
    );

    console.log("✅ Order Created:", orderResult.rows[0]);

    // Update the payment note in the mode_of_payment object
    const paymentMethod = invoiceData.mode_of_payment;
    if (paymentMethod.cash) {
      paymentMethod.cash.payment_note = "Visitor Payment";
    } else if (paymentMethod.upi) {
      paymentMethod.upi.payment_note = "Visitor Payment";
    } else if (paymentMethod.bank_transfer) {
      paymentMethod.bank_transfer.payment_note = "Visitor Payment";
    } else if (paymentMethod.cheque) {
      paymentMethod.cheque.payment_note = "Visitor Payment";
    }

    // Prepare transaction data
    const transactionData = [
      cf_payment_id,
      order_id,
      invoiceData.payment_gateway_id || defaultValues.payment_gateway_id,
      invoiceData.total_amount || 0,
      defaultValues.payment_currency,
      defaultValues.payment_status,
      "Visitor Payment Successful",
      issuedDate,
      issuedDate,
      null, // bank_reference
      "VISITOR_PAYMENT", // auth_id
      JSON.stringify(paymentMethod),
      JSON.stringify(defaultValues.error_details),
      null, // gateway_order_id
      null, // gateway_payment_id
      'visitor_payment'
    ];

    console.log("📝 Prepared Transaction Data:", transactionData);

    // Insert into Transactions table
    const transactionResult = await con.query(
      `INSERT INTO Transactions (
        cf_payment_id, order_id, payment_gateway_id, payment_amount, 
        payment_currency, payment_status, payment_message, payment_time, 
        payment_completion_time, bank_reference, auth_id, payment_method, 
        error_details, gateway_order_id, gateway_payment_id, payment_group
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING *`,
      transactionData
    );

    console.log("✅ Transaction Created:", transactionResult.rows[0]);

    // Prepare visitor data
    const visitorData = [
      invoiceData.region_id,
      invoiceData.chapter_id,
      invoiceData.member_id || null,
      invoiceData.member_name || null,
      invoiceData.visitor_name,
      invoiceData.visitor_email,
      invoiceData.visitor_mobile,
      invoiceData.visitor_company,
      invoiceData.visitor_address,
      invoiceData.visitor_gstin,
      invoiceData.visitor_business_category,
      invoiceData.visitor_business_category,
      issuedDate, // visited_date
      invoiceData.total_amount,
      invoiceData.taxable_amount,
      invoiceData.gst_amount,
      false,
      'active',
      order_id,
      true,
      false,
      false,
      invoiceData.visitor_company_address,
      false,
      false,
      false,
      false,
      null,
      false,
      false,
      null,
      false,
      false,
      false,
      false,
      null
    ];

    const visitorResult = await con.query(
      `INSERT INTO visitors (
        region_id, chapter_id, invited_by, invited_by_name, 
        visitor_name, visitor_email, visitor_phone, visitor_company_name,
        visitor_address, visitor_gst, visitor_business, visitor_category,
        visited_date, total_amount, sub_total, tax, delete_status,
        active_status, order_id, visitor_form, eoi_form, new_member_form,
        visitor_company_address, interview_sheet, commitment_sheet,
        inclusion_exclusion_sheet, member_application_form, onboarding_call,
        vp_mail, welcome_mail, chapter_apply_kit, visitor_entry_excel,
        google_updation_sheet, approve_induction_kit, induction_status, verification
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35, $36
      ) RETURNING *`,
      visitorData
    );

    console.log("✅ Visitor Created:", visitorResult.rows[0]);

    res.status(201).json({
      success: true,
      message: "Visitor payment processed and visitor created successfully",
      data: {
        order_id,
        cf_payment_id,
        order: orderResult.rows[0],
        transaction: transactionResult.rows[0],
        visitor: visitorResult.rows[0]
      }
    });

  } catch (error) {
    console.error("❌ Error processing visitor payment:", error);
    res.status(500).json({
      success: false,
      message: "Error processing visitor payment",
      error: error.message
    });
  }
};


const addKittyPaymentManually = async (req, res) => {
  try {
    console.log('📝 Starting manual kitty payment process');
    
    const {
      member_id,
      chapter_id,
      region_id,
      kitty_bill_id,
      order_amount,
      tax_amount,
      member_first_name,
      member_last_name,
      member_mobilenumber,
      member_company_name,
      member_gstin,
      payment_type,
      remaining_balance_with_gst,
      created_at
    } = req.body;

    // Generate order ID in the required format
    const randomString = Math.random().toString(36).substring(2, 15);
    const order_id = `order_${Date.now()}${randomString}`;
    const payment_session_id = `session_${Date.now()}${Math.random().toString(36).substring(2, 15)}payment`;
    
    console.log('🔑 Generated IDs:', { order_id, payment_session_id });

    // Prepare order data
    const orderQuery = `
      INSERT INTO Orders (
        order_id, order_amount, order_currency, payment_gateway_id,
        customer_id, chapter_id, region_id, universal_link_id,
        ulid, order_status, payment_session_id,
        one_time_registration_fee, membership_fee, tax,
        member_name, customer_email, customer_phone,
        gstin, company, mobile_number, renewal_year,
        payment_note, training_id, event_id, kitty_bill_id,
        visitor_id, visitor_name, visitor_email, visitor_mobilenumber,
        visitor_address, visitor_company, visitor_gstin,
        visitor_business, visitor_company_address, accolade_id,
        created_at
      ) VALUES (
        $1, $2, 'INR', 1,
        $3, $4, $5, 4,
        $6, 'ACTIVE', $7,
        '0', '0', $8,
        $9, $10, $11,
        $12, $13, $14, '1Year',
        'meeting-payments', null, null, $15,
        null, null, null, null,
        null, null, null,
        null, null, null,
        $16
      ) RETURNING *
    `;

    const orderValues = [
      order_id,
      order_amount || 0,
      member_id,
      chapter_id,
      region_id,
      null, // ulid
      payment_session_id,
      tax_amount || 0,
      `${member_first_name} ${member_last_name}`,
      '', // email address (empty as not needed)
      member_mobilenumber || '',
      member_gstin || '',
      member_company_name,
      member_mobilenumber || '',
      kitty_bill_id,
      created_at
    ];

    console.log('📦 Inserting order with values:', orderValues);
    const orderResult = await con.query(orderQuery, orderValues);
    console.log('✅ Order created successfully');

    // Payment method object
    const paymentMethod = {
      cash: {
        payment_note: payment_type === "partial" ? "Partial Meeting Payment" : 
                     payment_type === "advance" ? "Advance Meeting Payment" : 
                     "Meeting Payment"
      }
    };

    // Insert transaction record
    const transactionQuery = `
      INSERT INTO Transactions (
        cf_payment_id, order_id, payment_gateway_id,
        payment_amount, payment_currency, payment_status,
        payment_message, payment_time, payment_completion_time,
        auth_id, payment_method, error_details, payment_group
      ) VALUES (
        $1, $2, 1,
        $3, 'INR', 'SUCCESS',
        'Kitty Payment Successful', $4, $4,
        'KITTY_PAYMENT', $5, '{}', 'cash'
      ) RETURNING *
    `;

    const cf_payment_id = `TRX_${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    const transactionValues = [
      cf_payment_id,
      order_id,
      order_amount || 0,
      created_at,
      JSON.stringify(paymentMethod)
    ];

    console.log('💳 Inserting transaction with values:', transactionValues);
    const transactionResult = await con.query(transactionQuery, transactionValues);
    console.log('✅ Transaction created successfully');

    // Handle bankorder updates based on payment type
    let updateBankorderQuery;
    let bankorderValues;

    if (payment_type === "advance") {
      // Get both amount_to_pay and current advance_pay
      const currentBankorderQuery = `
          SELECT amount_to_pay, advance_pay 
        FROM bankorder 
        WHERE chapter_id = $1 AND member_id = $2
      `;
      const currentBankorder = await con.query(currentBankorderQuery, [chapter_id, member_id]);
      const currentAmountToPay = currentBankorder.rows[0]?.amount_to_pay || 0;
      const currentAdvancePay = currentBankorder.rows[0]?.advance_pay || 0;

      if (currentAmountToPay === 0) {
          // If amount_to_pay is 0, add order_amount to existing advance_pay
        updateBankorderQuery = `
          UPDATE bankorder 
              SET advance_pay = advance_pay + $3
          WHERE chapter_id = $1 AND member_id = $2
          RETURNING *
        `;
        bankorderValues = [chapter_id, member_id, order_amount];
      }
      else {
        // If amount_to_pay exists:
        // 1. Calculate remaining after paying amount_to_pay
        const remainingAmount = order_amount - currentAmountToPay;
        
        // 2. Set amount_to_pay to 0 and add remaining to existing advance_pay
        updateBankorderQuery = `
          UPDATE bankorder 
          SET amount_to_pay = 0,
                advance_pay = advance_pay + $3
          WHERE chapter_id = $1 AND member_id = $2
          RETURNING *
        `;
        bankorderValues = [chapter_id, member_id, remainingAmount];
      }

    console.log("💰 Advance Payment Update:", {
        currentAdvancePay,
        newAmount: order_amount,
        currentAmountToPay,
        finalQuery: updateBankorderQuery,
        values: bankorderValues
    });
}else {
      // Existing logic for partial/full payments
      updateBankorderQuery = `
        UPDATE bankorder 
        SET amount_to_pay = $3
        WHERE chapter_id = $1 AND member_id = $2
        RETURNING *
      `;
      const newAmountToPay = payment_type === "partial" ? remaining_balance_with_gst : 0;
      bankorderValues = [chapter_id, member_id, newAmountToPay];
    }

    console.log('🏦 Updating bankorder for member:', { 
      member_id, 
      chapter_id, 
      payment_type,
      bankorderValues
    });

    const bankorderResult = await con.query(updateBankorderQuery, bankorderValues);
    console.log('✅ Bankorder updated successfully:', bankorderResult.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Kitty payment processed successfully',
      data: {
        order: orderResult.rows[0],
        transaction: transactionResult.rows[0],
        bankorder: bankorderResult.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Error processing kitty payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process kitty payment',
      error: error.message
    });
  }
};

const exportAccoladesToExcel = async (req, res) => {
  try {
    const result = await con.query('SELECT * FROM accolades');
    const accolades = result.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accolades');

    // Define columns
    worksheet.columns = [
      { header: 'Accolade ID', key: 'accolade_id', width: 15 },
      { header: 'Accolade Name', key: 'accolade_name', width: 30 },
      { header: 'Status', key: 'accolade_status', width: 15 },
      { header: 'Created At', key: 'accolade_publish_date', width: 25 },
      // Add more fields if you have them
    ];

    // Add rows
    accolades.forEach(accolade => {
      worksheet.addRow(accolade);
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=accolades.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting accolades:', err);
    res.status(500).send('Error exporting accolades to Excel');
  }
};


const importMemberAccolades = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Function to convert Excel serial to JS date string
    const excelDateToJSDate = (serial) => {
      if (!serial) return null;
      if (typeof serial === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(serial)) return serial; // Already formatted
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      return date_info.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    for (const row of data) {
      const {
        member_id,
        accolade_id,
        given_date,
        issue_date,
        count,
        comment
      } = row;

      const formatted_given_date = excelDateToJSDate(given_date);
      const formatted_issue_date = excelDateToJSDate(issue_date);

      await con.query(
        `INSERT INTO member_accolades (member_id, accolade_id, given_date, issue_date, count, comment)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          member_id,
          accolade_id,
          formatted_given_date,
          formatted_issue_date,
          count,
          comment || null
        ]
      );
    }

    con.release();
    res.status(200).json({ message: 'Member accolades imported successfully' });
  } catch (error) {
    console.error('Error importing member accolades:', error);
    res.status(500).json({ message: 'Failed to import member accolades' });
  }
};


const getAllMemberAccolades = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM member_accolades");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching member accolades:", error);
    res.status(500).send("Error fetching member accolades");
  }
};

const sendFormSubmissionEmail = async (req, res) => {
    try {
        const { 
            email,
            name,
            formType,
            chapter_name,
          formData  // All form data
        } = req.body;

        console.log('📧 Preparing form submission email:', {
            to: email,
            name: name,
            formType: formType,
            chapter: chapter_name
        });

        const currentDate = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });

      // Helper function to create member application table
      const createMemberApplicationTable = (data) => {
          return `
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                  <tr style="background-color: #f0f0f0;">
                      <th colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Entry Details</th>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Application Type</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.applicationType === 'member' ? 'Member Application' : 'Renewal Application'}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Region</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">West</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Chapter</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${chapter_name || 'N/A'}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Visit Date</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.visitDate || 'N/A'}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Invited By</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.memberName || 'N/A'}</td>
                  </tr>

                  <tr style="background-color: #f0f0f0;">
                      <th colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Personal Information</th>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Full Name</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.firstName} ${data.lastName}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Email</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.email}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Primary Phone</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.mobile}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Secondary Phone</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.secondaryPhone || 'N/A'}</td>
                  </tr>

                  <tr style="background-color: #f0f0f0;">
                      <th colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Business Information</th>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Company Name</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.companyName}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Professional Classification</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.professionalClassification}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Industry</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.industry}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Business Website</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.businessWebsite || 'N/A'}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>GSTIN</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.gstin || 'N/A'}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Company Address</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.companyAddress || 'N/A'}</td>
                  </tr>

                  <tr style="background-color: #f0f0f0;">
                      <th colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Experience & Credentials</th>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Professional Experience</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.q1_experience}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Time in Professional Classification</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.q2_length_time}</td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Education & Certifications</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">${data.q3_education}</td>
                  </tr>

                  <tr style="background-color: #f0f0f0;">
                      <th colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">References</th>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Reference 1</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">
                          Name: ${data.ref1_first_name} ${data.ref1_last_name}<br>
                          Business: ${data.ref1_business_name || 'N/A'}<br>
                          Phone: ${data.ref1_phone}<br>
                          Email: ${data.ref1_email || 'N/A'}<br>
                          Relationship: ${data.ref1_relationship || 'N/A'}
                      </td>
                  </tr>
                  <tr>
                      <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Reference 2</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">
                          Name: ${data.ref2_first_name} ${data.ref2_last_name}<br>
                          Business: ${data.ref2_business_name || 'N/A'}<br>
                          Phone: ${data.ref2_phone}<br>
                          Email: ${data.ref2_email || 'N/A'}<br>
                          Relationship: ${data.ref2_relationship || 'N/A'}
                      </td>
                  </tr>
              </table>
          `;
      };

        // Format EOI form data in a table
      const createEOITable = (data) => {
            return `
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Region</strong></td>
                      <td style="padding: 12px; border: 1px solid #dee2e6;">West</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Chapter</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.chapter || 'N/A'}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Full Name</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.firstName} ${data.lastName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Email</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.email}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Mobile</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.mobile}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Company Name</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.companyName}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Professional Classification</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.professionalClassification}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Industry</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.industry}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>GSTIN</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.gstin || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Company Address</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.companyAddress}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Visit Date</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.visitDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>How did you hear about us?</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.howHeard}</td>
                    </tr>
                </table>
            `;
        };

        let emailSubject, emailContent;
      if (formType === 'member_application') {
          emailSubject = `Member Application Form Submission - BNI ${chapter_name}`;
          emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #dc2626; padding: 20px; text-align: center; margin-bottom: 20px;">
                      <h1 style="color: white; margin: 0;">BNI Member Application</h1>
                  </div>
                  
                  <p style="font-size: 16px;">Dear ${name},</p>
                  
                  <p style="font-size: 16px;">Thank you for submitting your Member Application form for BNI ${chapter_name} Chapter. 
                  We have successfully received your submission on ${currentDate}.</p>
                  
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h2 style="color: #dc2626; margin-top: 0;">Application Details</h2>
                      ${createMemberApplicationTable(formData)}
                  </div>

                  <p style="font-size: 16px;">Our team will review your application and contact you shortly with the next steps. 
                  Meanwhile, if you have any questions, please feel free to reach out to us.</p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                      <p style="margin: 0;">Best Regards,<br>
                      <strong>BNI ${chapter_name} Chapter</strong></p>
                  </div>
              </div>
          `;
      } else {
            emailSubject = `Expression of Interest Form Submission - BNI ${chapter_name}`;
            emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #dc2626; padding: 20px; text-align: center; margin-bottom: 20px;">
                        <h1 style="color: white; margin: 0;">BNI Expression of Interest</h1>
                    </div>
                    
                    <p style="font-size: 16px;">Dear ${name},</p>
                    
                    <p style="font-size: 16px;">Thank you for submitting your Expression of Interest form for BNI ${chapter_name} Chapter. 
                    We have successfully received your submission on ${currentDate}.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #dc2626; margin-top: 0;">Form Details</h2>
                      ${createEOITable(formData)}
                    </div>

                    <p style="font-size: 16px;">Our team will review your application and contact you shortly with the next steps. 
                    Meanwhile, if you have any questions, please feel free to reach out to us.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                        <p style="margin: 0;">Best Regards,<br>
                        <strong>BNI ${chapter_name} Chapter</strong></p>
                    </div>
                </div>
            `;
        }

      // Generate PDF content using the same table creation functions
      const pdfContent = `
          <html>
              <head>
                  <style>
                      body { font-family: Arial, sans-serif; }
                      .header { 
                          background-color: #dc2626; 
                          color: white; 
                          padding: 20px;
                          text-align: center;
                      }
                      .header h1 {
                          color: #dc2626;
                          background-color: white;
                          padding: 10px;
                          margin: 0;
                          border-radius: 4px;
                      }
                      table { width: 100%; border-collapse: collapse; }
                      td, th { padding: 12px; border: 1px solid #dee2e6; }
                      tr:nth-child(even) { background-color: #f8f9fa; }
                  </style>
              </head>
              <body>
                  <div class="header">
                      <h1>${formType === 'member_application' ? 'BNI Member Application' : 'BNI Expression of Interest'}</h1>
                      <p>Submission Date: ${currentDate}</p>
                  </div>
                  <div style="padding: 20px;">
                      ${formType === 'member_application' ? createMemberApplicationTable(formData) : createEOITable(formData)}
                  </div>
              </body>
          </html>
      `;

      // Generate unique filename for PDF
      const pdfFileName = `${Date.now()}_${formType}_${email.split('@')[0]}.pdf`;
      const pdfFilePath = path.join(__dirname, 'temp', pdfFileName);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '/temp'))) {
          fs.mkdirSync(path.join(__dirname, '/temp'), { recursive: true });
      }

      // Generate PDF using puppeteer
      const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-production', '--disable-setuid-production']
      });
      const page = await browser.newPage();
      await page.setContent(pdfContent, { waitUntil: 'networkidle0' });
      await page.pdf({
          path: pdfFilePath,
          format: 'A4',
          margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
          }
      });
      await browser.close();

      // Create mail options with PDF attachment
        const mailOptions = {
            from: 'BNI N E W Delhi <info@bninewdelhi.in>',
            to: `${name} <${email}>`,
          // cc: [
          //     'SUNIL K. BNI DIRECTOR <sunilk@bni-india.in>',
          //     'Shini Sunil <shini.sunil@adico.in>',
          //     'Raja Shukla | Digital Marketing | Prolific Shukla <rajashukla@outlook.com>',
          //     'Yatin wadhwa| Prolific| General Insurance <yatinwadhwa@ymail.com>',
          //     'admin.bnidw@adico.in',
          //     'BNI N E W Delhi Admin <admin@bninewdelhi.com>',
          //     'sunil.k@adico.in'
          // ],
          subject: emailSubject,
          html: emailContent,
          attachments: [{
              filename: 'application_form.pdf',
              path: pdfFilePath
          }]
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Form submission email sent successfully to:', email);

      // Clean up - delete the temporary PDF file
      fs.unlink(pdfFilePath, (err) => {
          if (err) console.error('Error deleting temporary PDF:', err);
          else console.log('✅ Temporary PDF file deleted successfully');
      });

      res.status(200).json({
          success: true,
          message: `Form submission confirmation email sent successfully to ${email}`
      });

  } catch (error) {
      console.error('❌ Error sending form submission email:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to send form submission email',
          error: error.message
      });
  }
};

const sendInterviewSheetEmail = async (req, res) => {
  try {
      const { 
          commitmentChapter,
          visitorName,
          visitor_id,
          date,
          interviewBy,
          applicantSign,
          dynamicAnswers,
          chapter_name
      } = req.body;

      console.log('📧 Preparing interview sheet email for:', visitorName);

       // Get visitor email from database
       const visitorQuery = 'SELECT visitor_email FROM visitors WHERE visitor_id = $1';
       const visitorResult = await con.query(visitorQuery, [visitor_id]);
      
      if (!visitorResult.rows[0]) {
          throw new Error('Visitor not found');
      }

      const { visitor_email } = visitorResult.rows[0];

      // Get questions
      const questionsQuery = 'SELECT * FROM interview_sheet_questions WHERE delete_status = false ORDER BY question_id';
      const questionsResult = await con.query(questionsQuery);
      const questions = questionsResult.rows;

      // Create PDF content
      const pdfContent = `
          <html>
              <head>
                  <style>
                      body { 
                          font-family: Arial, sans-serif;
                          margin: 0;
                          padding: 20px;
                      }
                      .header { 
                          background-color: #dc2626; 
                          padding: 20px;
                          text-align: center;
                          margin-bottom: 20px;
                      }
                      .header h1 {
                          color: #dc2626;
                          background-color: white;
                          padding: 10px;
                          margin: 0;
                          border-radius: 4px;
                      }
                      .info-section {
                          margin-bottom: 20px;
                          padding: 10px;
                          background-color: #f8f9fa;
                          border-radius: 4px;
                      }
                      .question {
                          margin: 15px 0;
                          padding: 15px;
                          border: 1px solid #dee2e6;
                          border-radius: 4px;
                      }
                      .question-text {
                          font-weight: bold;
                          color: #dc2626;
                          margin-bottom: 10px;
                      }
                      .answer {
                          margin-left: 20px;
                          padding: 10px;
                          background-color: #fff;
                          border-left: 3px solid #dc2626;
                      }
                      .signature-section {
                          margin-top: 30px;
                          border-top: 1px solid #dee2e6;
                          padding-top: 20px;
                          display: grid;
                          grid-template-columns: 1fr 1fr;
                          gap: 20px;
                      }
                  </style>
              </head>
              <body>
                  <div class="header">
                      <h1>BNI Interview Sheet</h1>
                      <p style="color: white;">Chapter: ${chapter_name}</p>
                  </div>

                  <div class="info-section">
                      <p><strong>Visitor Name:</strong> ${visitorName}</p>
                      <p><strong>Interview Date:</strong> ${date}</p>
                      <p><strong>Region:</strong> West</p>
                  </div>

                  ${questions.map(q => `
                      <div class="question">
                          <div class="question-text">${q.question_id}. ${q.question}</div>
                          <div class="answer">${dynamicAnswers[q.question_id] || 'No answer provided'}</div>
                      </div>
                  `).join('')}

                  <div class="signature-section">
                      <div>
                          <p><strong>Interviewed By:</strong> ${interviewBy}</p>
                      </div>
                      <div>
                          <p><strong>Applicant's Signature:</strong> ${applicantSign}</p>
                      </div>
                  </div>
              </body>
          </html>
      `;

      // Generate PDF
      const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-production', '--disable-setuid-production']
      });
      const page = await browser.newPage();
      await page.setContent(pdfContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
          }
      });
      await browser.close();

      // Create temporary file
      const pdfFileName = `interview-sheet-${Date.now()}.pdf`;
      const pdfFilePath = path.join(__dirname, '/temp', pdfFileName);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '/temp'))) {
          fs.mkdirSync(path.join(__dirname, '/temp'), { recursive: true });
      }

      fs.writeFileSync(pdfFilePath, pdfBuffer);

      // Send email using existing transporter
      const mailOptions = {
          from: 'BNI N E W Delhi <info@bninewdelhi.in>',
          to: `${visitorName} <${visitor_email}>`,
            cc: [
                'SUNIL K. BNI DIRECTOR <sunilk@bni-india.in>',
                'Shini Sunil <shini.sunil@adico.in>',
                'Raja Shukla | Digital Marketing | Prolific Shukla <rajashukla@outlook.com>',
                'admin.bnidw@adico.in',
              'BNI N E W Delhi Admin <admin@bninewdelhi.com>'
          ],
          subject: `Interview Sheet - BNI ${chapter_name}`,
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #dc2626; padding: 20px; text-align: center; margin-bottom: 20px;">
                      <h1 style="color: white; margin: 0;">BNI Interview Sheet</h1>
                  </div>
                  
                  <p style="font-size: 16px;">Dear ${visitorName},</p>
                  
                  <p style="font-size: 16px;">Thank you for completing the interview process with BNI ${chapter_name} Chapter. 
                  Please find attached your interview sheet with all responses.</p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                      <p style="margin: 0;">Best Regards,<br>
                      <strong>BNI ${chapter_name} Chapter</strong></p>
                  </div>
              </div>
          `,
          attachments: [{
              filename: 'interview-sheet.pdf',
              path: pdfFilePath
          }]
        };

        await transporter.sendMail(mailOptions);
      console.log('✅ Interview sheet email sent successfully to:', visitor_email);

      // Clean up - delete temporary PDF file
      fs.unlink(pdfFilePath, (err) => {
          if (err) console.error('Error deleting temporary PDF:', err);
          else console.log('✅ Temporary PDF file deleted successfully');
      });

        res.status(200).json({
            success: true,
          message: `Interview sheet sent successfully to ${visitor_email}`
        });

    } catch (error) {
      console.error('❌ Error sending interview sheet:', error);
        res.status(500).json({
            success: false,
          message: 'Failed to send interview sheet',
            error: error.message
        });
    }
};

const addVendor = async (req, res) => {
  try {
    const {
      vendor_name,
      vendor_company_name,
      vendor_company_address,
      vendor_company_gst,
      vendor_account,
      vendor_bank_name,
      vendor_ifsc_code,
      vendor_account_type,
      vendor_status,
      phone_number,
      email_id,
      chapter_id
    } = req.body;

    // Validate required fields
    // if (!vendor_name || !vendor_company_name || !vendor_company_address || !vendor_company_gst || 
    //     !vendor_account || !vendor_bank_name || !vendor_ifsc_code || !vendor_account_type || 
    //     !vendor_status || !phone_number || !email_id) {
    //   return res.status(400).json({ message: 'All fields are required' });
    // }

    // Validate GST format
    // const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    // if (!gstPattern.test(vendor_company_gst)) {
    //   return res.status(400).json({ message: 'Invalid GST number format' });
    // }

    // Validate IFSC format
    // const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    // if (!ifscPattern.test(vendor_ifsc_code)) {
    //   return res.status(400).json({ message: 'Invalid IFSC code format' });
    // }

    // Validate phone number
    // const phonePattern = /^[0-9]{10}$/;
    // if (!phonePattern.test(phone_number)) {
    //   return res.status(400).json({ message: 'Invalid phone number format' });
    // }

    // Validate email
    // const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailPattern.test(email_id)) {
    //   return res.status(400).json({ message: 'Invalid email format' });
    // }

    // Check if vendor with same GST number already exists
    // const existingVendorGST = await con.query(
    //   'SELECT * FROM vendors WHERE vendor_company_gst = $1',
    //   [vendor_company_gst]
    // );

    // if (existingVendorGST.rows.length > 0) {
    //   return res.status(400).json({ message: 'Vendor with this GST number already exists' });
    // }

    // Check if vendor with same email already exists
    // const existingVendorEmail = await con.query(
    //   'SELECT * FROM vendors WHERE email_id = $1',
    //   [email_id]
    // );

    // if (existingVendorEmail.rows.length > 0) {
    //   return res.status(400).json({ message: 'Vendor with this email already exists' });
    // }

    // Insert new vendor
    const result = await con.query(
      `INSERT INTO vendors (
        vendor_name,
        vendor_company_name,
        vendor_company_address,
        vendor_company_gst,
        vendor_account,
        vendor_bank_name,
        vendor_ifsc_code,
        vendor_account_type,
        vendor_status,
        phone_number,
        email_id,
        chapter_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        vendor_name,
        vendor_company_name,
        vendor_company_address,
        vendor_company_gst,
        vendor_account,
        vendor_bank_name,
        vendor_ifsc_code,
        vendor_account_type,
        vendor_status,
        phone_number,
        email_id,
        chapter_id
      ]
    );

    res.status(201).json({
      message: 'Vendor added successfully',
      vendor: result.rows[0]
    });
  } catch (error) {
    console.error('Error in addVendor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sendPaymentLinksEmail = async (req, res) => {
  try {
    const { memberIds, paymentLink, qrUrl, paymentType, chapterName } = req.body;

    // Validate request
    if (!memberIds || !Array.isArray(memberIds) || !paymentLink || !qrUrl || !paymentType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Get member details from database
    const memberQuery = await con.query(
      "SELECT member_first_name, member_last_name, member_email_address FROM member WHERE member_id = ANY($1)",
      [memberIds]
    );

    const members = memberQuery.rows;

    // Check if we got any members
    if (!members.length) {
      return res.status(404).json({
        success: false,
        message: "No members found with the provided IDs"
      });
    }

    console.log('Members found:', members); // Debug log

    // Send email to each member
    for (const member of members) {
      // Skip if no email address
      if (!member.member_email_address) {
        console.log('Skipping member - no email address:', member);
        continue;
      }

      const memberName = `${member.member_first_name} ${member.member_last_name}`;
      
      // Create HTML email content with inline styles
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d01f2f;">BNI Payment Link</h2>
          <p>Dear ${memberName},</p>
          <p>Please find below your payment link for ${paymentType}:</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0;"><strong>Payment Link:</strong> <a href="${paymentLink}">${paymentLink}</a></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Or scan this QR code to pay:</strong></p>
            <img src="${qrUrl}" alt="Payment QR Code" style="width: 200px; height: 200px; border: 2px solid #d01f2f; border-radius: 10px;">
          </div>

          <p style="color: #666; font-size: 14px;">This is an automated message. Please do not reply to this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} BNI. All rights reserved.</p>
          </div>
        </div>
      `;

      // Configure mail options
      const mailOptions = {
        from: 'BNI N E W Delhi <info@bninewdelhi.in>',
        to: member.member_email_address, // Fixed: Using member_email_address instead of email_id
        subject: `BNI ${chapterName} - ${paymentType} Payment Link`,
        html: emailContent
      };

      console.log('Sending email to:', member.member_email_address); // Debug log

      // Send email using nodemailer transporter
      await transporter.sendMail(mailOptions);
    }

    res.json({
      success: true,
      message: `Payment links sent successfully to ${members.length} members`
    });

  } catch (error) {
    console.error('Error sending payment links:', error);
    res.status(500).json({
      success: false,
      message: "Failed to send payment links",
      error: error.message
    });
  }
};

const sendAllPaymentLinksEmail = async (req, res) => {
  try {
    const { memberIds, allLinks, chapterName } = req.body;
    if (!memberIds || !Array.isArray(memberIds) || !allLinks || !Array.isArray(allLinks)) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Fetch member emails
    const memberQuery = await con.query(
      "SELECT member_email_address, member_first_name, member_last_name FROM member WHERE member_id = ANY($1)",
      [memberIds]
    );
    const members = memberQuery.rows;

    // Prepare email content
    for (const member of members) {
      let linksHtml = allLinks.map(l => `
        <div style="margin-bottom:18px;">
          <h3 style="color:#d01f2f;font-size:1.1em;">${l.type}</h3>
          <div style="margin:8px 0;">
            <a href="${l.link}" style="color:#1565c0;text-decoration:underline;">${l.link}</a>
          </div>
          <img src="${l.qr}" alt="QR" style="width:120px;height:120px;border:2px solid #d01f2f;border-radius:8px;">
        </div>
      `).join('');

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d01f2f;">BNI Payment Links</h2>
          <p>Dear ${member.member_first_name} ${member.member_last_name},</p>
          <p>Please find below all your payment links for <b>${chapterName}</b>:</p>
          ${linksHtml}
          <p style="color: #666; font-size: 14px;">This is an automated message. Please do not reply to this email.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} BNI. All rights reserved.</p>
          </div>
        </div>
      `;

      // Send email (use your nodemailer transporter)
      await transporter.sendMail({
        from: 'BNI N E W Delhi <info@bninewdelhi.in>',
        to: member.member_email_address,
        subject: `BNI ${chapterName} - All Payment Links`,
        html: emailContent
      });
    }

    res.json({ success: true, message: `All payment links sent to ${members.length} members` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send payment links", error: error.message });
  }
};

// bni-data-backend/allControllers/paymentControllers/newMemberManualPaymentController.js

const addNewMemberPaymentManually = async (req, res) => {
  try {
    // 1. Get data from frontend
    const {
      payment_status,
      payment_note,
      order_amount,
      tax_amount,
      one_time_registration_fee,
      membership_fee,
      renewal_year,
      region_id,
      chapter_id,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_company_name,
      visitor_company_address,
      visitor_address,
      visitor_gst,
      visitor_business,
      visitor_category,
      visited_date,
      company
    } = req.body;

    console.log('📥 Received request body:', req.body);

    // 3. Generate order_id and payment_session_id
    const order_id = `order_${Date.now()}${Math.random().toString(36).substring(2, 10)}`;
    const payment_session_id = `session_${Date.now()}${Math.random().toString(36).substring(2, 10)}`;
    console.log('🆕 Generated Order ID:', order_id);
    console.log('🆕 Generated Payment Session ID:', payment_session_id);

    // 4. Insert order
    const orderQuery = `
      INSERT INTO Orders (
        order_id, order_amount, order_currency, payment_gateway_id,
        chapter_id, region_id, universal_link_id, order_status, payment_session_id,
        one_time_registration_fee, membership_fee, tax, member_name, customer_email,
        customer_phone, gstin, company, renewal_year, payment_note, visitor_name,
        visitor_email, visitor_mobilenumber, visitor_address, visitor_company,
        visitor_gstin, visitor_business, visitor_company_address, created_at
      ) VALUES (
        $1, $2, 'INR', 1,
        $3, $4, 1, 'ACTIVE', $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23, NOW()
      ) RETURNING *
    `;
    const orderValues = [
      order_id, order_amount, chapter_id, region_id, payment_session_id,
      one_time_registration_fee, membership_fee, tax_amount, visitor_name, visitor_email,
      visitor_phone, visitor_gst, company, renewal_year, payment_note, visitor_name,
      visitor_email, visitor_phone, visitor_address, visitor_company_name,
      visitor_gst, visitor_business, visitor_company_address
    ];
    const orderResult = await con.query(orderQuery, orderValues);
    console.log('✅ Order inserted:', orderResult.rows[0]);

    // 5. Insert transaction
    const cf_payment_id = `TRX_${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    const transactionQuery = `
      INSERT INTO Transactions (
        cf_payment_id, order_id, payment_gateway_id,
        payment_amount, payment_currency, payment_status,
        payment_message, payment_time, payment_completion_time,
        auth_id, payment_method, error_details, payment_group
      ) VALUES (
        $1, $2, 1,
        $3, 'INR', 'SUCCESS',
        'New Member Payment Successful', NOW(), NOW(),
        'NEW_MEMBER_PAYMENT', $4, '{}', 'cash'
      ) RETURNING *
    `;
    const paymentMethod = {
      cash: { payment_note: payment_note || "New Member Payment" }
    };
    const transactionValues = [
      cf_payment_id, order_id, order_amount, JSON.stringify(paymentMethod)
    ];
    const transactionResult = await con.query(transactionQuery, transactionValues);
    console.log('💳 Transaction inserted:', transactionResult.rows[0]);

    // 6. Visitor Verification
    let visitor_id;
    let matchedVisitor = null;

    if (visitor_email) {
      const visitorRes = await con.query(
        'SELECT * FROM Visitors WHERE visitor_email = $1',
        [visitor_email]
      );
      if (visitorRes.rows.length > 0) {
        matchedVisitor = visitorRes.rows[0];
        console.log('📧 Matched visitor by email:', matchedVisitor.visitor_id);
      }
    }

    if (!matchedVisitor && visitor_phone) {
      const visitorRes = await con.query(
        'SELECT * FROM Visitors WHERE visitor_phone = $1',
        [visitor_phone]
      );
      if (visitorRes.rows.length > 0) {
        matchedVisitor = visitorRes.rows[0];
        console.log('📱 Matched visitor by phone:', matchedVisitor.visitor_id);
      }
    }

    if (matchedVisitor) {
      // 7. Existing Visitor
      visitor_id = matchedVisitor.visitor_id;
      console.log('🧾 Existing visitor detected. Updating visitor & membership.');

      await con.query(
        'UPDATE Visitors SET new_member_form = $1 WHERE visitor_id = $2',
        [true, visitor_id]
      );
      console.log('🛠️ Visitor record updated for new_member_form = true');

      const membershipRes = await con.query(
        'SELECT * FROM new_member_membership WHERE visitor_id = $1',
        [visitor_id]
      );
      const existingMembership = membershipRes.rows[0];

      const payingGst = (parseFloat(order_amount) * 18) / 118;
      const payingAmountWithoutGST = parseFloat(order_amount) - payingGst;

      if (existingMembership) {
        const currpaid = parseFloat(existingMembership.paid_amount) + payingAmountWithoutGST;
        const pending = parseFloat(existingMembership.due_balance) - payingAmountWithoutGST;
        await con.query(
          `UPDATE new_member_membership 
           SET paid_amount = $1, order_id = $2, due_balance = $3
           WHERE visitor_id = $4`,
          [currpaid, order_id, pending, visitor_id]
        );
        console.log('📦 Updated existing membership record.');
      } else {
        const totalAmount = parseFloat(one_time_registration_fee || 0) + parseFloat(membership_fee || 0);
        const pending = totalAmount - payingAmountWithoutGST;
        const myear = renewal_year === "2Year" ? 2 : 1;
        await con.query(
          `INSERT INTO new_member_membership (
            visitor_id, total_amount, paid_amount, membership_yr,
            date_of_purchase, order_id, due_balance
          ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
          [
            visitor_id,
            totalAmount,
            payingAmountWithoutGST,
            myear,
            order_id,
            pending,
          ]
        );
        console.log('🆕 Inserted new membership record for existing visitor.');
      }
    } else {
      // 8. New Visitor
      console.log('👤 No existing visitor found. Creating new visitor and membership.');
      const subtotal = parseFloat(order_amount) - parseFloat(tax_amount || 0);
      const insertVisitorQuery = `
        INSERT INTO Visitors (
          region_id, chapter_id, visitor_name, visitor_email, visitor_phone,
          visitor_company_name, visitor_company_address, visitor_address, visitor_gst,
          visitor_business, visitor_category, visited_date, total_amount, sub_total, tax,
          delete_status, active_status, order_id, new_member_form
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          false, 'active', $16, true
        ) RETURNING visitor_id
      `;
      const visitorValues = [
        region_id, chapter_id, visitor_name, visitor_email, visitor_phone,
        visitor_company_name, visitor_company_address, visitor_address, visitor_gst,
        visitor_business, visitor_category, visited_date, order_amount, subtotal, tax_amount,
        order_id
      ];
      const visitorResult = await con.query(insertVisitorQuery, visitorValues);
      visitor_id = visitorResult.rows[0].visitor_id;
      console.log('✅ New visitor inserted with ID:', visitor_id);

      const totalAmount = parseFloat(one_time_registration_fee || 0) + parseFloat(membership_fee || 0) + parseFloat(tax_amount || 0);
      const payingGst = (parseFloat(order_amount) * 18) / 118;
      const payingAmountWithoutGST = parseFloat(order_amount) - payingGst;
      const pending = totalAmount - payingAmountWithoutGST;
      const myear = renewal_year === "2Year" ? 2 : 1;

      await con.query(
        `INSERT INTO new_member_membership (
          visitor_id, total_amount, paid_amount, membership_yr,
          date_of_purchase, order_id, due_balance
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        [
          visitor_id,
          totalAmount,
          payingAmountWithoutGST,
          myear,
          order_id,
          pending,
        ]
      );
      console.log('🆕 New membership record inserted for new visitor.');
    }

    // 9. Respond
    console.log('🎉 All operations completed successfully.');
    res.status(201).json({
      success: true,
      message: 'New member payment processed successfully',
      data: {
        order: orderResult.rows[0],
        transaction: transactionResult.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Error processing new member payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process new member payment',
      error: error.message
    });
  }
};

const allOtherPayment = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM other_payment"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching other payment:", error);
    res.status(500).send("Error fetching other payment");
  }
};
const addChapterPayment = async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    console.log('Received files:', req.files);

    // 1. Get all data from req.body
    const {
      payment_add_by,
      payment_description,
      chapter_id,
      amount,
      payment_date,
      payment_mode,
      is_gst,
      gst_percentage,
      gst_amount,
      cgst,
      sgst,
      igst,
      total_amount,
      is_igst
    } = req.body;

    // Validate required fields
    if (!payment_description || !chapter_id || !amount || !payment_date || !payment_mode || !payment_add_by) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        receivedData: req.body
      });
    }

    // 2. Handle file upload (if any)
    let payment_img_path = null;
    if (req.files && req.files.payment_img) {
      const file = req.files.payment_img;
      const uploadDir = path.join(__dirname, 'public', 'uploads', 'other_payments');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const fileName = `other_payment_${Date.now()}_${file.name}`;
      const uploadPath = path.join(uploadDir, fileName);
      await file.mv(uploadPath);
      payment_img_path = `/uploads/other_payments/${fileName}`;
    }

    // 3. Get region_id for the chapter
    const chapterRes = await con.query('SELECT region_id FROM chapter WHERE chapter_id = $1', [chapter_id]);
    if (!chapterRes.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chapter ID'
      });
    }
    const region_id = chapterRes.rows[0].region_id;

    // 4. Generate IDs
    const order_id = `OP${Date.now()}`;
    const cf_payment_id = order_id;

    // Start transaction
    await con.query('BEGIN');

    try {
      // 5. Insert into orders table
      const orderQuery = `
        INSERT INTO orders (
          order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id, visitor_id, visitor_name, visitor_email, visitor_mobilenumber, visitor_address, visitor_company, visitor_gstin, visitor_business, visitor_company_address, accolade_id, created_at, updated_at
        ) VALUES (
          $1, $2, 'INR', 1, null, $3, $4, null, null, 'ACTIVE', null, 0, 0, $5, null, null, null, null, null, null, null, 'other-payment', null, null, null, null, null, null, null, null, null, null, null, null, null, $6, $6
        )
      `;
      await con.query(orderQuery, [
        order_id,
        total_amount,
        chapter_id,
        region_id,
        is_gst === 'true' || is_gst === true ? gst_amount : 0,
        payment_date
      ]);

      // 6. Insert into transactions table
      const transactionQuery = `
        INSERT INTO transactions (
          cf_payment_id, order_id, payment_gateway_id, payment_amount, payment_currency, payment_status, payment_message, payment_time, payment_completion_time, bank_reference, auth_id, payment_method, error_details, gateway_order_id, gateway_payment_id, payment_group
        ) VALUES (
          $1, $2, null, $3, 'INR', 'SUCCESS', 'other-payment', $4, $4, null, 'other-payment', $5, '{}', null, null, 'other-payment'
        )
      `;
      const paymentMethod = {};
      paymentMethod[payment_mode] = { payment_note: 'other-payment' };
      await con.query(transactionQuery, [
        cf_payment_id,
        order_id,
        total_amount,
        new Date(),
        JSON.stringify(paymentMethod)
      ]);

      // 7. Insert into other_payment table
      const otherPaymentQuery = `
        INSERT INTO other_payment (
          payment_description, is_gst, gst_percentage, gst_amount, cgst, sgst, igst, total_amount, added_by, payment_img, date, chapter_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
      `;
      await con.query(otherPaymentQuery, [
        payment_description,
        is_gst === 'true' || is_gst === true,
        gst_percentage || '0',
        gst_amount || '0',
        cgst || '0',
        sgst || '0',
        igst || '0',
        total_amount,
        payment_add_by,
        payment_img_path,
        payment_date,
        chapter_id
      ]);

      // Commit transaction
      await con.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      // Rollback in case of error
      await con.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error in addChapterPayment:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message,
      receivedData: req.body 
    });
  }
};


module.exports = {
  addInvoiceManually,
  getPendingAmount,
  addPendingAmount,
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
  updateUniversalLink,
  deleteUniversalLink,
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
  getDisplayLogo,
  getGstType,
  getGstTypeValues,
  getMemberByEmail,
  sendQrCodeByEmail,
  markAttendence,
  verifyQrCode,
  allCheckins,
  getAllKittyPayments,
  updatePaymentGatewayStatus,
  memberPendingKittyOpeningBalance,
  addPendingAmount,
  getPendingAmount,
  updateChapterSettings,
  getAllMemberCredit,
  addMemberCredit,
  getInterviewSheetQuestions,
  getInterviewSheetAnswers,
  addInterviewSheetAnswers,
  getCommitmentSheet,
  insertCommitmentSheet,
  addMemberWriteOff,
  getAllMemberWriteOff,
  getAllVisitors,
  createInvoice,
  getBankOrder,
  getSpecificBankOrder,
  getCurrentDate,
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
  sendFormSubmissionEmail,
  sendInterviewSheetEmail,
  getAllVendors,
  addVendor,
  getAllDocNumbers,
  sendPaymentLinksEmail,
  sendAllPaymentLinksEmail,
  addNewMemberPaymentManually,
  allOtherPayment,
  addChapterPayment
};
