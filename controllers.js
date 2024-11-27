const { Client } = require("pg");

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
    if (filter === 'deleted') {
      query = "SELECT * FROM region WHERE delete_status = 1"; // Query for deleted regions
    } else if (filter === 'inactive') {
      query = "SELECT * FROM region WHERE region_status = 'inactive' AND delete_status = 0";
    } else if (filter === 'active') {
      query = "SELECT * FROM region WHERE region_status = 'active' AND delete_status = 0";
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
    const result = await con.query(
      `INSERT INTO region (
          region_name, contact_person, contact_number, email_id, days_of_chapter, region_status,
          accolades_config, chapter_status, chapter_type, mission, vision, region_logo, 
          one_time_registration_fee, one_year_fee, two_year_fee, five_year_fee, late_fees, 
          country, state, city, street_address_line_1, street_address_line_2, social_facebook, 
          social_instagram, social_linkedin, social_youtube, website_link, region_launched_by, 
          date_of_publishing
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
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
                date_of_publishing, member_sponsored_by, member_status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26,
                $27, $28, $29, $30, $31, $32, $33, $34,
                $35, $36
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
    const result = await con.query(
      "SELECT * FROM otp_verification "
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching otp code:", error);
    res.status(500).send("Error fetching otp code");
  }
};

const getLoginLogs = async (req, res) => {
  try {
    const result = await con.query(
      "SELECT * FROM login_logs "
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching login logs:", error);
    res.status(500).send("Error fetching login logs");
  }
};

// Fetch all active members
const getMembers = async (req, res) => {
  try {
    const result = await con.query("SELECT * FROM member WHERE delete_status = 0");
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
      "SELECT * FROM accolades WHERE accolade_status = $1",
      ["active"]
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
    const result = await con.query("SELECT * FROM events");
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
    // Construct the SQL query for updating the chapter
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
        chapter_membership_fee_five_year = $33
      WHERE chapter_id = $34
      RETURNING *;`;

    // Execute the query with the provided chapter data
    const values = [
      chapterData.chapter_name,
      chapterData.region_id,
      chapterData.chapter_meeting_day,
      chapterData.chapter_type,
      chapterData.chapter_status,
      chapterData.chapter_membership_fee,
      chapterData.chapter_kitty_fees,
      chapterData.chapter_visitor_fees,
      chapterData.one_time_registration_fee,
      chapterData.eoi_link,
      chapterData.member_app_link,
      chapterData.meeting_hotel_name,
      chapterData.chapter_mission,
      chapterData.chapter_vision,
      chapterData.contact_person,
      chapterData.contact_number,
      chapterData.email_id,
      chapterData.country,
      chapterData.state,
      chapterData.city,
      chapterData.street_address_line,
      chapterData.postal_code,
      chapterData.chapter_facebook,
      chapterData.chapter_instagram,
      chapterData.chapter_linkedin,
      chapterData.chapter_youtube,
      chapterData.chapter_website,
      chapterData.chapter_logo,
      chapterData.date_of_publishing,
      chapterData.chapter_launched_by,
      chapterData.chapter_late_fees,
      chapterData.chapter_membership_fee_two_year,
      chapterData.chapter_membership_fee_five_year,
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
        member_status = $32
      WHERE member_id = $33
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
        member_first_name = $1,
        member_last_name = $2,
        member_date_of_birth = $3,
        member_phone_number = $4,
        member_alternate_mobile_number = $5,
      WHERE id = $6
      RETURNING *;`;

    // Prepare the values for the SQL query
    const values = [
      memberData.member_first_name,
      memberData.member_last_name,
      memberData.member_date_of_birth,
      memberData.member_phone_number,
      memberData.member_alternate_mobile_number,
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
      res.status(200).json({ message: 'Region marked as deleted successfully' });
  } else {
      res.status(404).json({ message: 'Region not found' });
  }
  } catch (error) {
    console.error('Error deleting region:', error);
        res.status(500).json({ message: 'Error deleting region' });
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
      res.status(200).json({ message: 'Chapter marked as deleted successfully' });
  } else {
      res.status(404).json({ message: 'Chapter not found' });
  }
  } catch (error) {
    console.error('Error deleting Chapter:', error);
        res.status(500).json({ message: 'Error deleting Chapter' });
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
      res.status(200).json({ message: 'Member marked as deleted successfully' });
  } else {
      res.status(404).json({ message: 'Member not found' });
  }
  } catch (error) {
    console.error('Error deleting Member:', error);
        res.status(500).json({ message: 'Error deleting Member' });
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
      res.status(200).json({ message: 'Universal Link marked as deleted successfully' });
  } else {
      res.status(404).json({ message: 'Universal Link not found' });
  }
  } catch (error) {
    console.error('Error deleting Universal Link', error);
        res.status(500).json({ message: 'Error deleting Universal Link' });
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
};
