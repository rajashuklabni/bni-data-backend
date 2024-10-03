const { Client } = require('pg');

const con = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "princedjangoauth",
    database: "bnibackend"
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
        const result = await con.query('SELECT * FROM chapter');
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


module.exports = {
    getRegions,
    getChapters,
    getMembers
};
