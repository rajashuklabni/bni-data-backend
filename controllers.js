const { Client } = require('pg');

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

con.connect().then(() => console.log("Connected to the database"));

const getRegions = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM region');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching regions:", error);
        res.status(500).send("Error fetching regions");
    }
};

const getMember = async (req, res) => {
    const { member_id } = req.params; // Get member_id from route parameters

    try {
        // Use a parameterized query to safely insert member_id into the SQL statement
        const result = await con.query('SELECT * FROM member WHERE member_id = $1', [member_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Member not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching member:", error);
        res.status(500).send("Error fetching member");
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
      accolades_config,  // This should be an array of accolade IDs
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
      date_of_publishing
    } = req.body;

    // Ensure accolades_config is handled as an array
    const chapterDaysArray = Array.isArray(chapterDays) ? chapterDays : [];
    const chapterStatusArray = Array.isArray(chapterStatus) ? chapterStatus : [];
    const chapterTypeArray = Array.isArray(chapterType) ? chapterType : [];
    const accoladesArray = Array.isArray(accolades_config) ? accolades_config : [];

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
          `{${chapterDaysArray.join(',')}}`, // Chapter days array
          region_status,
          `{${accoladesArray.join(',')}}`,  // Handle accolades as an array for PostgreSQL
          `{${chapterStatusArray.join(',')}}`,  // Chapter status array
          `{${chapterTypeArray.join(',')}}`,    // Chapter type array
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
          date_of_publishing
        ]
      );

      res.status(201).json({ message: "Region added successfully!", data: result.rows[0] });
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
        chapter_late_fees
    } = req.body;

    // Validate required fields
    if (!chapter_name || !region_id) {
        return res.status(400).json({ message: "Chapter name and region ID are required." });
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
                chapter_late_fees
            ]
        );

        res.status(201).json({ message: "Chapter added successfully!", data: result.rows[0] });
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
        member_status
    } = req.body;

    // Validate required fields
    if (!member_first_name || !member_email_address || !region_id || !chapter_id) {
        return res.status(400).json({ message: "Member first name, email address, region ID, and chapter ID are required." });
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
                member_status
            ]
        );

        res.status(201).json({ message: "Member added successfully!", data: result.rows[0] });
    } catch (error) {
        console.error("Error adding member:", error);
        res.status(500).send("Error adding member");
    }
};



const getChapters = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM chapter ORDER BY chapter_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching chapters:", error);
        res.status(500).send("Error fetching chapters");
    }
};

// Fetch all active members
const getMembers = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM member WHERE member_status = $1', ['active']);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).send("Error fetching members");
    }
};

// Fetch all active members
const getAccolades = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM accolades WHERE accolade_status = $1', ['active']);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching accolades:", error);
        res.status(500).send("Error fetching accolades");
    }
};

// Fetch all active members
const getMemberCategory = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM category');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching members category:", error);
        res.status(500).send("Error fetching members category");
    }
};

// Fetch all active universal links
const getUniversalLinks = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM universal_link WHERE status = $1', ['active']);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching universal links:", error);
        res.status(500).send("Error fetching universal links");
    }
};


// Fetch all active members
const getCompany = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM company');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching company:", error);
        res.status(500).send("Error fetching company");
    }
};

// Fetch all active members
const getSupplier = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM supplier');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching supplier:", error);
        res.status(500).send("Error fetching supplier");
    }
};

// Fetch all active members
const getInventory = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM inventory');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).send("Error fetching inventory");
    }
};


// Fetch all active members
const getSupplies = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM supplies');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching supplies:", error);
        res.status(500).send("Error fetching supplies");
    }
};

// Fetch all active members
const getEvents = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM events');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send("Error fetching events");
    }
};

// Fetch all active members
const getMembershipFee = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM membership_fees');
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
        const result = await con.query('INSERT INTO membership_fees (years, fee) VALUES ($1, $2) RETURNING *', [years, fee]);
        res.status(201).json(result.rows[0]); // Return the newly created fee
    } catch (error) {
        console.error("Error adding membership fee:", error);
        res.status(500).send("Error adding membership fee");
    }
};

// Fetch all active members
const getPaymentGateway = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM paymentgateways');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching payment gateway:", error);
        res.status(500).send("Error fetching payment gateway");
    }
};

// Fetch all active members
const getOrders = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM orders');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Error fetching orders");
    }
};

// Fetch all active members
const getTransactions = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM transactions');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).send("Error fetching transactions");
    }
};

// Fetch all active members
const authTokens = async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM authTokens');
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching Auth Tokens:", error);
        res.status(500).send("Error fetching Auth Tokens");
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
    getMember
};
