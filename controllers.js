const { Client } = require("pg");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer"); // Ensure you have nodemailer installed
const QRCode = require("qrcode"); // Import the qrcode library
const PDFDocument = require("pdfkit");
const { QueryTypes } = require("sequelize"); // If using Sequelize
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs

// Instead of this:
// const fetch = require('node-fetch');

// Use this:
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Replace with your Render database credentials
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

con.connect().then(() => console.log("Connected to render PostgreSQL"));

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
  const { member_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM member WHERE member_id = $1",
      [member_id]
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

const getChapter = async (req, res) => {
  const { chapter_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM chapter WHERE chapter_id = $1",
      [chapter_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Chapter:", error);
    res.status(500).send("Error fetching Chapter");
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
            logoUrl = `https://bni-data-backend.onrender.com/api/uploads/regionLogos/${region.region_logo}`;
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
        return [];
      }
    };

    const chapterDaysArray = parseArray(chapterDays);
    const chapterStatusArray = parseArray(chapterStatus);
    const chapterTypeArray = parseArray(chapterType);
    const accoladesArray = parseArray(accolades_config);

    console.log('📅 Processed arrays:', {
      days: chapterDaysArray,
      status: chapterStatusArray,
      type: chapterTypeArray,
      accolades: accoladesArray
    });

    const result = await con.query(
      `INSERT INTO region (
          region_name, contact_person, contact_number, email_id, days_of_chapter, region_status,
          accolades_config, chapter_status, chapter_type, mission, vision, region_logo, 
          one_time_registration_fee, one_year_fee, two_year_fee, five_year_fee, late_fees, 
          country, state, city, street_address_line_1, street_address_line_2, social_facebook, 
          social_instagram, social_linkedin, social_youtube, website_link, region_launched_by, 
          date_of_publishing, postal_code
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
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
      ]
    );

    console.log('✅ Region added successfully to database');
    console.log('📄 Database result:', result.rows[0]);

    res.status(201).json({ 
      message: "Region added successfully!", 
      data: {
        ...result.rows[0],
        region_logo_url: region_logo ? `https://bni-data-backend.onrender.com/uploads/regionLogos/${region_logo}` : null
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
  const {
    region_id,
    chapter_name,
    chapter_logo,
    chapter_status,
    chapter_membership_fee,
    chapter_kitty_fees,
    chapter_visitor_fees,
    chapter_meeting_day,
    one_time_registration_fee,
    chapter_type,
    eoi_link,
    member_app_link,
    meeting_hotel_name,
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
  } = req.body;
  // console.log(req.body);

  // Validate required fields
  if (!chapter_name || !region_id) {
    return res
      .status(400)
      .json({ message: "Chapter name and region ID are required." });
  }

  try {
    const checkDuplicate = await con.query(
      `SELECT * FROM chapter WHERE chapter_name = $1`,
      [chapter_name]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Chapter name already exists",
      });
    }

    const result = await con.query(
      `INSERT INTO chapter (
                region_id, chapter_name, chapter_logo, chapter_status, chapter_membership_fee,
                chapter_kitty_fees, chapter_visitor_fees, chapter_meeting_day, one_time_registration_fee,
                chapter_type, eoi_link, member_app_link, meeting_hotel_name,
                chapter_membership_fee_two_year, chapter_membership_fee_five_year, contact_number,
                contact_person, chapter_mission, chapter_vision, email_id, country, state, city,
                street_address_line, postal_code, chapter_facebook, chapter_instagram,
                chapter_linkedin, chapter_youtube, chapter_website, date_of_publishing,
                chapter_launched_by, chapter_location_note, chapter_late_fees, available_fund, kitty_billing_frequency
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23,
                $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35, $36
            ) RETURNING *`,
      [
        region_id,
        chapter_name,
        chapter_logo,
        chapter_status,
        chapter_membership_fee,
        chapter_kitty_fees,
        chapter_visitor_fees,
        chapter_meeting_day,
        one_time_registration_fee,
        chapter_type,
        eoi_link,
        member_app_link,
        meeting_hotel_name,
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
        billing_frequency
      ]
    );

    res
      .status(201)
      .json({ message: "Chapter added successfully!", data: result.rows[0] } );
  } catch (error) {
    console.error("Error adding chapter:", error);
    res.status(500).send("Error adding chapter");
  }
};

const addMember = async (req, res) => {
  const {
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
    meeting_opening_balance,
  } = req.body;

  // Validate required fields
  if (
    !member_first_name ||
    !member_email_address ||
    !region_id ||
    !chapter_id
  ) {
    return res.status(400).json({
      message:
        "Member first name, email address, region ID, and chapter ID are required.",
    });
  }

  // Add GST number format validation
  if (member_gst_number) {
    if (!/^[A-Z0-9]{15}$/.test(member_gst_number)) {
      return res.status(400).json({
        message:
          "GST number must be exactly 15 characters (letters and numbers).",
      });
    }
  }

  try {
    const result = await con.query(
      `INSERT INTO member (
                member_first_name, member_last_name, member_date_of_birth, member_phone_number,
                member_alternate_mobile_number, member_email_address, address_pincode,
                address_city, address_state, region_id, chapter_id, accolades_id, category_id,
                member_induction_date, member_current_membership, member_renewal_date, member_gst_number,
                member_company_name, member_company_address, member_company_state, member_company_city,
                member_photo, member_website, member_company_logo,
                member_facebook, member_instagram, member_linkedin, member_youtube, country,
                street_address_line_1, street_address_line_2, gender, notification_consent,
                date_of_publishing, member_sponsored_by, member_status, meeting_opening_balance
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26,
                $27, $28, $29, $30, $31, $32, $33, $34,
                $35, $36, $37
            ) RETURNING *`,
      [
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
        meeting_opening_balance,
      ]
    );

    res
      .status(201)
      .json({ message: "Member added successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).send("Error adding member");
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

        // Convert arrays to PostgreSQL array format
        const formattedDays = `{${daysOfChapter.map(day => `"${day}"`).join(',')}}`;
        const formattedStatus = `{${chapterStatus.map(status => `"${status}"`).join(',')}}`;
        const formattedType = `{${chapterType.map(type => `"${type}"`).join(',')}}`;
        const formattedAccolades = `{${accoladesConfig.join(',')}}`;

        console.log('📊 Formatted arrays:', {
            days: formattedDays,
            status: formattedStatus,
            type: formattedType,
            accolades: formattedAccolades
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
                accolades_config = $29
        `;

        // Add region_logo update if a new file was uploaded
        if (req.file) {
            query += `, region_logo = $30`;
        }

        query += ` WHERE region_id = $${req.file ? '31' : '30'} RETURNING *`;

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
            formattedAccolades    // Using formatted array string
        ];

        // Add file name and region_id to values array
        if (req.file) {
            values.push(req.file.filename);
        }
        values.push(region_id);

        console.log('📝 Executing query with values:', values);

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
  const { chapter_id } = req.params; // Get chapter_id from URL parameter
  const chapterData = req.body; // Get the updated data from the request body

  console.log("Updating chapter with ID:", chapter_id);
  console.log("Received data:", chapterData);

  try {
    // Convert invalid numeric fields to null
    const toNumeric = (value) =>
      isNaN(value) || value === "Not Found" ? null : Number(value);

    // Clean the input data
    const cleanedData = {
      ...chapterData,
      chapter_membership_fee: toNumeric(chapterData.chapter_membership_fee),
      chapter_kitty_fees: toNumeric(chapterData.chapter_kitty_fees),
      chapter_visitor_fees: toNumeric(chapterData.chapter_visitor_fees),
      one_time_registration_fee: toNumeric(
        chapterData.one_time_registration_fee
      ),
      chapter_late_fees: toNumeric(chapterData.chapter_late_fees),
      chapter_membership_fee_two_year: toNumeric(
        chapterData.chapter_membership_fee_two_year
      ),
      chapter_membership_fee_five_year: toNumeric(
        chapterData.chapter_membership_fee_five_year
      ),
    };

    const query = `
      UPDATE chapter
      SET
        chapter_name = $1,
        region_id = $2,
        chapter_meeting_day = $3,
        chapter_type = $4,
        chapter_status = $5,
        chapter_membership_fee = $6,
        chapter_kitty_fees = $7,
        chapter_visitor_fees = $8,
        one_time_registration_fee = $9,
        eoi_link = $10,
        member_app_link = $11,
        meeting_hotel_name = $12,
        chapter_mission = $13,
        chapter_vision = $14,
        contact_person = $15,
        contact_number = $16,
        email_id = $17,
        country = $18,
        state = $19,
        city = $20,
        street_address_line = $21,
        postal_code = $22,
        chapter_facebook = $23,
        chapter_instagram = $24,
        chapter_linkedin = $25,
        chapter_youtube = $26,
        chapter_website = $27,
        chapter_logo = $28,
        date_of_publishing = $29,
        chapter_launched_by = $30,
        chapter_late_fees = $31,
        chapter_membership_fee_two_year = $32,
        chapter_membership_fee_five_year = $33,
        kitty_billing_frequency = $34,
        available_fund = $35
      WHERE chapter_id = $36
      RETURNING *;`;

    const values = [
      cleanedData.chapter_name,
      cleanedData.region_id,
      cleanedData.chapter_meeting_day,
      cleanedData.chapter_type,
      cleanedData.chapter_status,
      cleanedData.chapter_membership_fee,
      cleanedData.chapter_kitty_fees,
      cleanedData.chapter_visitor_fees,
      cleanedData.one_time_registration_fee,
      cleanedData.eoi_link,
      cleanedData.member_app_link,
      cleanedData.meeting_hotel_name,
      cleanedData.chapter_mission,
      cleanedData.chapter_vision,
      cleanedData.contact_person,
      cleanedData.contact_number,
      cleanedData.email_id,
      cleanedData.country,
      cleanedData.state,
      cleanedData.city,
      cleanedData.street_address_line,
      cleanedData.postal_code,
      cleanedData.chapter_facebook,
      cleanedData.chapter_instagram,
      cleanedData.chapter_linkedin,
      cleanedData.chapter_youtube,
      cleanedData.chapter_website,
      cleanedData.chapter_logo,
      cleanedData.date_of_publishing,
      cleanedData.chapter_launched_by,
      cleanedData.chapter_late_fees,
      cleanedData.chapter_membership_fee_two_year,
      cleanedData.chapter_membership_fee_five_year,
      cleanedData.billing_frequency,
      cleanedData.chapter_available_fund,
      chapter_id, // Ensure the chapter_id is used for the WHERE clause
    ];

    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Chapter not found:", chapter_id);
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Return the updated chapter data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating chapter:", error);
    res.status(500).json({ message: "Error updating chapter" });
  }
};

const updateMember = async (req, res) => {
  const { member_id } = req.params;
  const memberData = req.body;

  console.log("Updating member with ID:", member_id);
  console.log("Received data:", memberData);
  console.log("Received file:", req.file);

  try {
    // Handle the photo file if it exists
    if (req.file) {
      console.log('Photo file received:', req.file.filename);
      memberData.member_photo = req.file.filename; // Store only the filename
    }

    // Handle empty accolades_id - convert empty string to empty array
    if (memberData.accolades_id === '') {
      memberData.accolades_id = '{}'; // PostgreSQL empty array syntax
    }

    // Construct the SQL query for updating the member
    const query = `
      UPDATE member
      SET
        member_first_name = $1,
        member_last_name = $2,
        member_date_of_birth = $3,
        member_phone_number = $4,
        member_alternate_mobile_number = $5,
        member_email_address = $6,
        street_address_line_1 = $7,
        street_address_line_2 = $8,
        address_pincode = $9,
        address_city = $10,
        address_state = $11,
        region_id = $12,
        chapter_id = $13,
        accolades_id = $14::integer[], -- Cast explicitly to integer array
        category_id = $15,
        member_current_membership = $16,
        member_renewal_date = $17,
        member_gst_number = $18,
        member_company_name = $19,
        member_company_address = $20,
        member_company_state = $21,
        member_company_city = $22,
        member_company_pincode = $23,
        member_photo = $24,
        member_website = $25,
        member_facebook = $26,
        member_instagram = $27,
        member_linkedin = $28,
        member_youtube = $29,
        member_sponsored_by = $30,
        date_of_publishing = $31,
        member_status = $32,
        meeting_opening_balance = $33
      WHERE member_id = $34
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      memberData.member_first_name,
      memberData.member_last_name,
      memberData.member_date_of_birth,
      memberData.member_phone_number,
      memberData.member_alternate_mobile_number,
      memberData.member_email_address,
      memberData.street_address_line_1,
      memberData.street_address_line_2,
      memberData.address_pincode,
      memberData.address_city,
      memberData.address_state,
      memberData.region_id,
      memberData.chapter_id,
      memberData.accolades_id, // Now properly handled for empty case
      memberData.category_id,
      memberData.member_current_membership,
      memberData.member_renewal_date,
      memberData.member_gst_number,
      memberData.member_company_name,
      memberData.member_company_address,
      memberData.member_company_state,
      memberData.member_company_city,
      memberData.member_company_pincode || null, // Handle 'null' string
      memberData.member_photo,
      memberData.member_website,
      memberData.member_facebook,
      memberData.member_instagram,
      memberData.member_linkedin,
      memberData.member_youtube,
      memberData.member_sponsored_by,
      memberData.date_of_publishing,
      memberData.member_status,
      memberData.meeting_opening_balance,
      member_id,
    ];

    console.log('Executing query with values:', values);

    // Execute the query with the provided member data
    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Member not found:", member_id);
      return res.status(404).json({ message: "Member not found" });
    }

    console.log('Member updated successfully:', rows[0]);

    // Return the updated member data
    res.status(200).json({
      message: "Member updated successfully",
      data: rows[0],
      photo_path: req.file ? `/uploads/memberPhotos/${req.file.filename}` : null
    });
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ 
      message: "Error updating member", 
      error: error.message,
      details: error.detail || 'No additional details available'
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
  try {
    const result = await con.query(
      `UPDATE region SET delete_status = 1 WHERE region_id = $1 RETURNING *`,
      [region_id]
    );
    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ message: "Region marked as deleted successfully" });
    } else {
      res.status(404).json({ message: "Region not found" });
    }
  } catch (error) {
    console.error("Error deleting region:", error);
    res.status(500).json({ message: "Error deleting region" });
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
        eligibility_and_condition = $9
      WHERE accolade_id = $10
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
          accolade_name, accolade_published_by, accolade_publish_date, accolade_availability, accolade_price, accolade_status, stock_available, item_type, accolade_type
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
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
       training_published_by = $7
      WHERE training_id = $8
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      linkData.training_name,
      linkData.training_status,
      linkData.training_venue,
      linkData.training_price,
      linkData.training_date,
      linkData.training_note,
      linkData.training_published_by,
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
        training_published_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *`,
      [
        training_name,
        billing_company_id, // Using the parsed integer value
        training_status,
        training_venue,
        training_ticket_price,
        training_date,
        training_note,
        training_published_by,
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
    console.error("Error fetching settlement transactions:", error);
    res.status(500).send("Error fetching settlement transactions");
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
          WHERE chapter_id = $2
      `;

    await con.query(updateMemberQuery, [total_bill_amount, chapter_id]);
    console.log(updateMemberQuery);

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
        console.log('📎 File Details:', req.file);

        if (!req.file) {
            console.error('❌ No file uploaded');
            return res.status(400).json({ message: "Bill file is required" });
        }

        // Store the original filename
        const originalFilename = req.file.filename;
        
        // Insert expense record first
        const result = await con.query(
            `INSERT INTO expenses (
                expense_type, submitted_by, description, amount, 
                payment_status, bill_date, upload_bill, 
                transaction_no, bill_no, chapter_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`,
            [
                req.body.expense_type,
                req.body.submitted_by,
                req.body.description,
                req.body.amount,
                req.body.payment_status,
                req.body.bill_date,
                originalFilename,  // Store original filename temporarily
                req.body.transaction_no,
                req.body.bill_no,
                req.body.chapter_id
            ]
        );

        // Get the expense_id from the inserted record
        const expense_id = result.rows[0].expense_id;

        // Rename the file to include expense_id
        const fileExt = path.extname(originalFilename);
        const newFilename = `expense_${expense_id}${fileExt}`;
        const oldPath = path.join(__dirname, 'uploads', 'expenses', originalFilename);
        const newPath = path.join(__dirname, 'uploads', 'expenses', newFilename);

        // Rename the file
        fs.renameSync(oldPath, newPath);

        // Update the filename in database
        await con.query(
            'UPDATE expenses SET upload_bill = $1 WHERE expense_id = $2',
            [newFilename, expense_id]
        );

        console.log('✅ Expense added successfully:', {
            id: expense_id,
            filename: newFilename
        });

        res.status(201).json({
            message: "Expense added successfully!",
            data: {...result.rows[0], upload_bill: newFilename}
        });

    } catch (error) {
        console.error('❌ Error adding expense:', error);
        res.status(500).json({ message: "Error adding expense" });
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
const updateExpense = async (req, res) => {
  const {
    expense_type,
    submitted_by,
    description,
    amount,
    payment_status,
    bill_date,
    transaction_no,
    bill_no,
  } = req.body;

  const { expense_id } = req.params; // Get expense_id from URL params

  try {
    // Log data for debugging
    console.log("Expense ID:", expense_id);
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    // Validate expense_id
    if (!expense_id) {
      return res.status(400).json({ message: "Expense ID is required" });
    }

    // Initialize file path
    let uploadBillPath = null;

    // If a new file is uploaded, construct the file path
    if (req.file) {
      uploadBillPath = `/uploads/expenses/${req.file.filename}`;
    }

    // Dynamically build the query and values array
    const query = [];
    const values = [];
    let index = 1;

    if (expense_type) {
      query.push(`expense_type = $${index++}`);
      values.push(expense_type);
    }
    if (submitted_by) {
      query.push(`submitted_by = $${index++}`);
      values.push(submitted_by);
    }
    if (description) {
      query.push(`description = $${index++}`);
      values.push(description);
    }
    if (amount) {
      query.push(`amount = $${index++}`);
      values.push(amount);
    }
    if (payment_status) {
      query.push(`payment_status = $${index++}`);
      values.push(payment_status);
    }
    if (bill_date) {
      query.push(`bill_date = $${index++}`);
      values.push(bill_date);
    }
    if (uploadBillPath) {
      query.push(`upload_bill = $${index++}`);
      values.push(uploadBillPath);
    }
    if (transaction_no) {
      query.push(`transaction_no = $${index++}`);
      values.push(transaction_no);
    }
    if (bill_no) {
      query.push(`bill_no = $${index++}`);
      values.push(bill_no);
    }

    // Add expense_id to the values array for the WHERE clause
    values.push(expense_id);

    // Build the update query
    const updateQuery = `
      UPDATE expenses
      SET ${query.join(", ")}
      WHERE expense_id = $${index}
      RETURNING *;
    `;

    // Execute the query
    const result = await con.query(updateQuery, values);

    // Handle case where no rows are updated
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Respond with the updated data
    res.status(200).json({
      message: "Expense updated successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating Expense:", error);
    res.status(500).json({
      message: "Error updating Expense",
      error: error.message,
    });
  }
};
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
    console.log("Received update request:", req.body);
    console.log("Received file:", req.file);

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

    // Get just the original filename if a file was uploaded
    let photoPath = null;
    if (req.file) {
      // Use the original filename directly
      photoPath = req.file.originalname;
    }

    // Update query
    const query = `
      UPDATE member 
      SET 
        member_phone_number = $1,
        member_company_address = $2,
        member_company_name = $3,
        member_gst_number = $4,
        member_facebook = $5,
        member_instagram = $6,
        member_linkedin = $7,
        member_youtube = $8
        ${photoPath ? ', member_photo = $9' : ''}
      WHERE member_email_address = ${photoPath ? '$10' : '$9'}
      RETURNING *`;

    const values = [
      member_phone_number,
      member_company_address,
      member_company_name,
      member_gst_number,
      member_facebook || '',
      member_instagram || '',
      member_linkedin || '',
      member_youtube || ''
    ];

    if (photoPath) {
      values.push(photoPath);
    }
    values.push(member_email_address);

    const result = await con.query(query, values);

    if (result.rows.length === 0) {
      console.log("No member found with email:", member_email_address);
      return res.status(404).json({ message: "Member not found with this email" });
    }

    console.log("Update successful");
    res.json({
      message: "Member settings updated successfully",
      data: result.rows[0],
      photo_path: photoPath
    });
  } catch (error) {
    console.error("Error in updateMemberSettings:", error);
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
      `https://bni-data-backend.onrender.com/api/allOrders`
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
        service: "gmail", // Use your email service
        auth: {
          user: "as9467665000@gmail.com", // Your email
          pass: "ddle kjkt haxu vfmz", // Your email password
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
        from: "as9467665000@gmail.com",
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
            meeting_hotel_name,
            street_address_line,
            postal_code,
            chapter_facebook,
            chapter_instagram,
            chapter_linkedin,
            chapter_youtube
        } = req.body;
        console.log(email_id, contact_number, contact_person, chapter_mission, chapter_vision, meeting_hotel_name, street_address_line, postal_code, chapter_facebook, chapter_instagram, chapter_linkedin, chapter_youtube);

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
                meeting_hotel_name = COALESCE($5, meeting_hotel_name),
                street_address_line = COALESCE($6, street_address_line),
                postal_code = COALESCE($7, postal_code),
                chapter_facebook = COALESCE($8, chapter_facebook),
                chapter_instagram = COALESCE($9, chapter_instagram),
                chapter_linkedin = COALESCE($10, chapter_linkedin),
                chapter_youtube = COALESCE($11, chapter_youtube)
        `;

        const queryParams = [
            contact_number,
            contact_person,
            chapter_mission,
            chapter_vision,
            meeting_hotel_name,
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
            updateQuery += `, chapter_logo = $12`;
            queryParams.push(photoPath);
        }

        updateQuery += ` WHERE email_id = $${queryParams.length + 1} RETURNING *`;
        queryParams.push(email_id);

        console.log('Executing update query:', {
            query: updateQuery,
            params: queryParams
        });

        const result = await con.query(updateQuery, queryParams);

        if (result.rows.length === 0) {
            console.error('No chapter found with email:', email_id);
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        console.log('Chapter updated successfully:', result.rows[0]);
        res.status(200).json({
            success: true,
            message: 'Chapter settings updated successfully',
            data: result.rows[0]
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
    
    for (const id of member_id) {
      const values = [parseInt(id), chapter_id, credit_amount, credit_date, false, credit_type]; // Ensure member_id is an integer
      const result = await con.query(query, values);
      insertedRecords.push(result.rows[0]);
    }

    res.status(201).json({ message: "Credit added successfully!", data: insertedRecords });
  } catch (error) {
    console.error("Error adding credit:", error);
    res.status(500).send("Error adding credit");
  }
};

const getInterviewSheet = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM interviewsheet");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching interview sheet data:", error);
    res.status(500).send("Error fetching interview sheet");
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

const addMemberWriteOff = async (req, res) => {
  let { member_id, chapter_id, rightoff_date, total_pending_amount } = req.body;

  // Ensure member_id is always an array
  if (!Array.isArray(member_id)) {
    member_id = [member_id]; // Convert single member_id to array
  }

  try {
    const query = `
      INSERT INTO rightoff_member (member_id, chapter_id, rightoff_date, total_pending_amount) 
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    let insertedRecords = [];
    
    for (const id of member_id) {
      const values = [parseInt(id), chapter_id, rightoff_date, total_pending_amount]; // Ensure member_id is an integer
      const result = await con.query(query, values);
      insertedRecords.push(result.rows[0]);
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
      grandTotal,
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

    // Generate order and transaction IDs
    const order_id = uuidv4();
    const transaction_id = uuidv4();
    const session_id = `session_${uuidv4()}`;
    const created_at = new Date().toISOString();

    // Insert data into orders table
    const insertOrderQuery = `
      INSERT INTO orders (
        order_id, order_amount, order_currency, payment_gateway_id,
        customer_id, chapter_id, region_id, universal_link_id, ulid,
        order_status, payment_session_id, created_at, tax,
        member_name, customer_email, customer_phone, gstin,
        company, mobile_number, payment_note, training_id
      ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10, $11, $12, $13, $14, $15, $16, $17, 'All Training Payments for all', $18)
    `;

    const orderValues = [
      order_id,
      grandTotal,
      "INR",
      member_id,
      chapter_id,
      region_id,
      universal_link_id,
      ulid,
      session_id,
      created_at,
      (grandTotal * 0.18).toFixed(2), // 18% tax
      `${member_first_name} ${member_last_name}`,
      member_email_address,
      member_phone_number,
      member_gst_number,
      member_company_name,
      member_phone_number,
      training_id,
    ];

    await db.query(insertOrderQuery, orderValues);

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
      grandTotal,
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

    await db.query(insertTransactionQuery, transactionValues);

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
  getInterviewSheet,
  getCommitmentSheet,
  addMemberWriteOff,
  getAllMemberWriteOff,
  getAllVisitors,
  createInvoice,
};
