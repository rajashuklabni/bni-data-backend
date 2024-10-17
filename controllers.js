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
    addMembershipFee
};
