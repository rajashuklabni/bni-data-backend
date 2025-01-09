const { Client } = require("pg");
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');


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

con.connect().then(() => console.log("Connected to the database"));

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
  const { region_id } = req.params; // Get member_id from route parameters

  try {
    // Use a parameterized query to safely insert member_id into the SQL statement
    const result = await con.query(
      "SELECT * FROM region WHERE region_id = $1",
      [region_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Region not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching Region:", error);
    res.status(500).send("Error fetching Region");
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

const addRegion = async (req, res) => {
  const {
    region_name,
    contact_person,
    contact_number,
    email_id,
    chapterDays,
    chapterStatus,
    chapterType,
    accolades_config, // This should be an array of accolade IDs
    region_status,
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
  } = req.body;

  // Ensure accolades_config is handled as an array
  const chapterDaysArray = Array.isArray(chapterDays) ? chapterDays : [];
  const chapterStatusArray = Array.isArray(chapterStatus) ? chapterStatus : [];
  const chapterTypeArray = Array.isArray(chapterType) ? chapterType : [];
  const accoladesArray = Array.isArray(accolades_config)
    ? accolades_config
    : [];

  // Validate region name
  if (!region_name) {
    return res.status(400).json({ message: "Region name is required" });
  }

  try {

    const checkDuplicate = await con.query(
      `SELECT * FROM region WHERE region_name = $1`,
      [region_name]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Region name already exists",
      });
    }


    const result = await con.query(
      `INSERT INTO region (
          region_name, contact_person, contact_number, email_id, days_of_chapter, region_status,
          accolades_config, chapter_status, chapter_type, mission, vision, region_logo, 
          one_time_registration_fee, one_year_fee, two_year_fee, five_year_fee, late_fees, 
          country, state, city, street_address_line_1, street_address_line_2, social_facebook, 
          social_instagram, social_linkedin, social_youtube, website_link, region_launched_by, 
          date_of_publishing
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        ) RETURNING *`,
      [
        region_name,
        contact_person,
        contact_number,
        email_id,
        `{${chapterDaysArray.join(",")}}`, // Chapter days array
        region_status,
        `{${accoladesArray.join(",")}}`, // Handle accolades as an array for PostgreSQL
        `{${chapterStatusArray.join(",")}}`, // Chapter status array
        `{${chapterTypeArray.join(",")}}`, // Chapter type array
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
      ]
    );

    res
      .status(201)
      .json({ message: "Region added successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Error adding region:", error);
    res.status(500).send("Error adding region");
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
  } = req.body;

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
                chapter_launched_by, chapter_location_note, chapter_late_fees
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23,
                $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34
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
      ]
    );

    res
      .status(201)
      .json({ message: "Chapter added successfully!", data: result.rows[0] });
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
      "SELECT * FROM accolades WHERE delete_status = 0",
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
    const result = await con.query("SELECT * FROM events WHERE delete_status = 0");
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
  const { region_id } = req.params; // Get region_id from URL parameter
  const regionData = req.body; // Get the updated data from the request body

  console.log("Updating region with ID:", region_id);
  console.log("Received data:", regionData);

  try {
    // Construct the SQL query for updating the region
    const query = `
      UPDATE region
      SET
        region_name = $1,
        contact_person = $2,
        contact_number = $3,
        email_id = $4,
        mission = $5,
        vision = $6,
        region_logo = $7,
        region_status = $8,
        one_time_registration_fee = $9,
        one_year_fee = $10,
        two_year_fee = $11,
        five_year_fee = $12,
        late_fees = $13,
        country = $14,
        state = $15,
        city = $16,
        street_address_line_1 = $17,
        street_address_line_2 = $18,
        postal_code = $19,
        social_facebook = $20,
        social_instagram = $21,
        social_linkedin = $22,
        social_youtube = $23,
        website_link = $24,
        date_of_publishing = $25,
        region_launched_by = $26,
        days_of_chapter = $27,
        chapter_status = $28,
        chapter_type = $29,
        accolades_config = $30
      WHERE region_id = $31
      RETURNING *;`;

    // Execute the query with the provided region data
    const values = [
      regionData.region_name,
      regionData.contact_person,
      regionData.contact_number,
      regionData.email_id,
      regionData.mission,
      regionData.vision,
      regionData.region_logo,
      regionData.region_status,
      regionData.one_time_registration_fee,
      regionData.one_year_fee,
      regionData.two_year_fee,
      regionData.five_year_fee,
      regionData.late_fees,
      regionData.country,
      regionData.state,
      regionData.city,
      regionData.street_address_line_1,
      regionData.street_address_line_2,
      regionData.postal_code,
      regionData.social_facebook,
      regionData.social_instagram,
      regionData.social_linkedin,
      regionData.social_youtube,
      regionData.website_link,
      regionData.date_of_publishing,
      regionData.region_launched_by,
      regionData.chapter_days,
      regionData.chapter_status,
      regionData.chapter_type,
      regionData.accolades_config,
      region_id, // Ensure the region_id is used for the WHERE clause
    ];

    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Region not found:", region_id);
      return res.status(404).json({ message: "Region not found" });
    }

    // Return the updated region data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating region:", error);
    res.status(500).json({ message: "Error updating region" });
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
        kitty_billing_frequency = $34
      WHERE chapter_id = $35
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
  const { member_id } = req.params; // Get member_id from URL parameter
  const memberData = req.body; // Get the updated data from the request body

  console.log("Updating member with ID:", member_id);
  console.log("Received data:", memberData);

  try {
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
        accolades_id = $14,  -- Assuming accolades are stored in an array or JSON
        category_id = $15,
        member_current_membership = $16,
        member_renewal_date = $17,
        member_gst_number = $18,
        member_company_name = $19,
        member_company_address = $20,
        member_company_state = $21,
        member_company_city = $22,
        member_company_pincode = $23,
        member_photo = $24,  -- Assuming member photo is stored in the URL or path
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
      memberData.accolades_id, // Assuming accolades are stored as JSON
      memberData.category_id,
      memberData.member_current_membership,
      memberData.member_renewal_date,
      memberData.member_gst_number,
      memberData.member_company_name,
      memberData.member_company_address,
      memberData.member_company_state,
      memberData.member_company_city,
      memberData.member_company_pincode,
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
      member_id, // Ensure the member_id is used for the WHERE clause
    ];

    // Execute the query with the provided member data
    const { rows } = await con.query(query, values);

    if (rows.length === 0) {
      console.error("Member not found:", member_id);
      return res.status(404).json({ message: "Member not found" });
    }

    // Return the updated member data
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ message: "Error updating member" });
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
    const selectedItemType = typeof item_type === "object" && item_type.length > 0 ? item_type[0] : item_type;
    const selectedAccoladeType = typeof accolade_type === "object" && accolade_type.length > 0 ? accolade_type[0] : accolade_type;

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
      accolades_config: Array.isArray(region.accolades_config) ? region.accolades_config.join(', ') : region.accolades_config,
      chapter_status: Array.isArray(region.chapter_status) ? region.chapter_status.join(', ') : region.chapter_status,
      chapter_type: Array.isArray(region.chapter_type) ? region.chapter_type.join(', ') : region.chapter_type,
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
    xlsx.utils.book_append_sheet(wb, ws, 'Regions');

    // Set the file name for the Excel download
    const filename = 'regions.xlsx';

    // Set headers to prompt the download of the file
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Write the Excel file to the response
    const fileBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.end(fileBuffer);
  } catch (error) {
    console.error('Error exporting regions:', error);
    res.status(500).send('Error exporting regions');
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
      chapter_membership_fee_five_year: chapter.chapter_membership_fee_five_year,
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
    xlsx.utils.book_append_sheet(wb, ws, 'Chapters');

    // Set the file name for the Excel download
    const filename = 'chapters.xlsx';

    // Set headers to prompt the download of the file
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Write the Excel file to the response buffer
    const fileBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Send the file buffer in the response
    res.end(fileBuffer);
  } catch (error) {
    console.error('Error exporting chapters:', error);
    res.status(500).send('Error exporting chapters');
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
      accolades_id: member.accolades_id ? member.accolades_id.join(', ') : '',
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
    xlsx.utils.book_append_sheet(wb, ws, 'Members');

    // Set the file name for the Excel download
    const filename = 'members.xlsx';

    // Set headers to prompt the download of the file
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Write the Excel file to the response
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting members:', error);
    res.status(500).send('Error exporting members');
  }
};

const exportOrdersToExcel = async (req, res) => {
  try {
    // Fetch all orders from the database
    const result = await con.query('SELECT * FROM Orders');

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
    xlsx.utils.book_append_sheet(wb, ws, 'Orders');

    // Set the file name
    const filename = 'orders.xlsx';

    // Set headers for the file download
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    // Write the Excel file to the response
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).send('Error exporting orders');
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
          if (typeof value === 'string' && value.startsWith('{')) {
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
        payment_method: parseJSONSafely(transaction.payment_method),  // Safely parse JSON
        error_details: parseJSONSafely(transaction.error_details),  // Safely parse JSON
        gateway_order_id: transaction.gateway_order_id,
        gateway_payment_id: transaction.gateway_payment_id,
        payment_group: transaction.payment_group,
      };
    });

    // Create a new workbook and add a sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(transactions);

    // Append the sheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Transactions');

    // Set the file name for the Excel download
    const filename = 'transactions.xlsx';

    // Set headers to prompt the download of the file
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Write the Excel file to the response
    const excelFile = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.end(excelFile);
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).send('Error exporting transactions');
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
      res
        .status(200)
        .json({ message: "Event marked as deleted successfully" });
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
    const result = await con.query(
      "SELECT * FROM events WHERE event_id = $1",
      [event_id]
    );

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
    const result = await con.query("SELECT * FROM training WHERE delete_status = 0");
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
  const { training_id } = req.params; // Get id from URL parameter
  const linkData = req.body; // Get the updated data from the request body

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

  console.log(req.body);

  // Validate accolade_name
  if (!training_name) {
    return res.status(400).json({ message: "Training name is required" });
  }

  try {
    // Check if accolade_name already exists
    const checkDuplicate = await con.query(
      `SELECT * FROM training WHERE training_name = $1`,
      [training_name]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: "Training name already exists",
      });
    }

    // Insert new accolade
    const result = await con.query(
      `INSERT INTO training (
        training_name, billing_company, training_status, training_venue, training_price, training_date, training_note, training_published_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *`,
      [
        training_name,
        billing_company,
        training_status,
        training_venue,
        training_ticket_price,
        training_date,
        training_note,
        training_published_by,
      ]
    );

    res
      .status(201)
      .json({ message: "Training added successfully!", data: result.rows[0] });
  } catch (error) {
    console.error("Error adding Training:", error);
    res.status(500).json({ message: "Error adding Training" });
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
    const result = await con.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [order_id]
    );

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
      const { chapter_id, date, bill_type, description, total_weeks, total_bill_amount } = req.body;

      // Check if all required fields are provided
      if (!chapter_id || !date || !bill_type || !description || !total_weeks || !total_bill_amount) {
          return res.status(400).json({ message: 'All fields are required.' });
      }

      // Check if a payment has already been raised for this chapter_id with delete_status = 0
      const checkQuery = 'SELECT * FROM kittyPaymentChapter WHERE chapter_id = $1 AND delete_status = 0';
      const checkResult = await con.query(checkQuery, [chapter_id]);

      if (checkResult.rows.length > 0) {
          return res.status(400).json({ message: 'A bill has already been raised for this chapter.' });
      }

      // If no active payment exists for this chapter_id, proceed to insert the new record
      const query = `
          INSERT INTO kittyPaymentChapter 
          (chapter_id, payment_date, bill_type, description, total_weeks, total_bill_amount) 
          VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await con.query(query, [chapter_id, date, bill_type, description, total_weeks, total_bill_amount]);

      // Update the meeting_payable_amount field in the member table for the same chapter_id
      const updateMemberQuery = `
          UPDATE member
          SET meeting_payable_amount = meeting_payable_amount + $1
          WHERE chapter_id = $2
      `;

      await con.query(updateMemberQuery, [total_bill_amount, chapter_id]);

      res.status(201).json({ message: 'Kitty payment added successfully.' });
  } catch (error) {
      console.error('Error adding kitty payment:', error);
      res.status(500).json({ message: 'Internal server error.' });
  }
};



// Fetch all active members
const getKittyPayments = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM kittypaymentchapter where delete_status = 0");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching kitty payments:", error);
    res.status(500).send("Error fetching kitty payments");
  }
};

const deleteKittyBill = async (req, res) => {
  const { payment_id } = req.params;
  try {
    const result = await con.query(
      `UPDATE kittypaymentchapter SET delete_status = 1 WHERE payment_id = $1 RETURNING *`,
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
    const result = await con.query("SELECT * FROM expenses WHERE delete_status = 0");
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
  const validStatuses = ['active', 'inactive'];
  if (!validStatuses.includes(expense_status.toLowerCase())) {
    return res.status(400).json({
      message: 'Invalid expense_status. Allowed values are "active" or "inactive".',
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

  try {
    // Log request body and file for debugging
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    // Validate expense_type
    if (!expense_type) {
      return res.status(400).json({ message: "Expense Type is required" });
    }

    // Validate the uploaded file
    if (!req.file) {
      return res.status(400).json({ message: "Bill file is required" });
    }

    // Construct the file path
    const uploadBillPath = `/uploads/expenses/${req.file.filename}`;
    console.log("File Path to be Stored:", uploadBillPath);

    // Insert the new expense into the database
    const result = await con.query(
      `INSERT INTO expenses (
        expense_type, submitted_by, description, amount, payment_status, bill_date, upload_bill, transaction_no, bill_no
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *`,
      [
        expense_type,
        submitted_by,
        description,
        amount,
        payment_status,
        bill_date,
        uploadBillPath, // Store the file path as a string
        transaction_no,
        bill_no,
      ]
    );

    // Respond with success message and data
    res.status(201).json({
      message: "Expense added successfully!",
      data: result.rows[0],
    });
  } catch (error) {
    // Log the error for debugging
    console.error("Error adding Expense:", error);

    res.status(500).json({
      message: "Error adding Expense",
      error: error.message,
    });
  }
};


const getExpenseById = async (req, res) => {
  const { expense_id } = req.params;  // Extract expense_id from URL parameters

  try {
    // Query the database for the expense with the given expense_id
    const result = await con.query('SELECT * FROM expenses WHERE expense_id = $1', [expense_id]);

    if (result.rows.length === 0) {
      // If no expense found, return a 404
      return res.status(404).json({ message: 'Expense not found' });
    }

    // If expense is found, return the data
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    // Log any error and return a 500 response
    console.error('Error fetching expense:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
    bill_no 
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
      return res.status(404).json({ message: "Expense not found or already deleted" });
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
        console.log('Received update request:', req.body);
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
            member_photo      
        } = req.body;

        // Validate email
        if (!member_email_address) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        // Handle member photo
        let photoFileName = '';
        if (member_photo) {
            // Create directory if it doesn't exist
            const uploadDir = path.join(__dirname, '../bni/public/assets/memberProfileImage');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Generate filename (without full path for database storage)
            const timestamp = Date.now();
            photoFileName = `member_${timestamp}.jpg`;
            
            // Full path for saving the file
            const fullPath = path.join(uploadDir, photoFileName);
            
            // Remove the data:image/jpeg;base64 prefix if it exists
            const base64Data = member_photo.replace(/^data:image\/\w+;base64,/, '');
            
            // Save the file
            fs.writeFileSync(fullPath, base64Data, { encoding: 'base64' });
            
            console.log('Photo saved as:', photoFileName);
        }

        // Update query with relative path for member_photo
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
                member_youtube = $8,
                member_photo = $9
            WHERE member_email_address = $10
            RETURNING *`;

        const result = await con.query(query, [
            member_phone_number,
            member_company_address,
            member_company_name,
            member_gst_number,
            member_facebook,
            member_instagram,
            member_linkedin,
            member_youtube,
            photoFileName ? `/assets/memberProfileImage/${photoFileName}` : member_photo, // Store relative path
            member_email_address
        ]);

        if (result.rows.length === 0) {
            console.log('No member found with email:', member_email_address);
            return res.status(404).json({ message: 'Member not found with this email' });
        }

        console.log('Update successful');
        res.json({
            message: "Member settings updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error in updateMemberSettings:', error);
        res.status(500).json({ 
            message: "Error updating member settings",
            error: error.message 
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
            company_instagram
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
            company_facebook || null,    // If empty, save as null
            company_twitter || null,     // If empty, save as null
            company_youtube || null,     // If empty, save as null
            company_instagram || null    // If empty, save as null
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.json({
            message: 'Company settings updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(400).json({
            message: 'Error updating company settings',
            error: error.toString()
        });
    }
};

const updateLogo = async (req, res) => {
    try {
        console.log('Received logo update request:', req.body);
        const {
            display_image_name,
            display_status,
            added_by
        } = req.body;

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
            added_by
        ]);

        if (result.rows.length === 0) {
            console.log('No logo settings found');
            return res.status(404).json({ message: 'Logo settings not found' });
        }

        console.log('Logo update successful');
        res.json({
            message: "Logo settings updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error in updateLogo:', error);
        res.status(500).json({ 
            message: "Error updating logo settings",
            error: error.message 
        });
    }
};

const updateGstTypeValues = async (req, res) => {
    try {
        console.log('Received GST type values update request:', req.body);
        const { gst_value_id, vat_value_id } = req.body;

        // First, update all GST values (type_id = 1) to inactive
        await con.query(`
            UPDATE gst_type_values 
            SET active_status = 'inactive' 
            WHERE gst_type_name_id = 1
        `);

        // Then set only the selected GST value to active
        await con.query(`
            UPDATE gst_type_values 
            SET active_status = 'active' 
            WHERE gst_value_id = $1
        `, [gst_value_id]);

        // Next, update all VAT values (type_id = 2) to inactive
        await con.query(`
            UPDATE gst_type_values 
            SET active_status = 'inactive' 
            WHERE gst_type_name_id = 2
        `);

        // Finally, set only the selected VAT value to active
        await con.query(`
            UPDATE gst_type_values 
            SET active_status = 'active' 
            WHERE gst_value_id = $1
        `, [vat_value_id]);

        // Fetch the updated values to return in response
        const result = await con.query(`
            SELECT * FROM gst_type_values 
            WHERE gst_type_name_id IN (1, 2)
            ORDER BY gst_type_name_id, gst_value_id
        `);

        console.log('Update successful');
        res.json({
            message: "GST type values updated successfully",
            data: result.rows
        });

    } catch (error) {
        console.error('Error in updateGstTypeValues:', error);
        res.status(500).json({ 
            message: "Error updating GST type values",
            error: error.message 
        });
    }
};

const updateUserPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Get the current password hash
    const userResult = await con.query(
      'SELECT password_hash FROM users WHERE is_active = true'
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active user found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const saltRounds = 6;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password for active user
    await con.query(
      'UPDATE users SET password_hash = $1 WHERE is_active = true',
      [newPasswordHash]
    );

    res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
};

module.exports = {
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
};
