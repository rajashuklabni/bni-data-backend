const bcrypt = require("bcrypt");
const db = require("../../database/db"); // Ensure this is correctly configured for PostgreSQL

const loginController = async (req, res) => {
    const { login_type, email, password } = req.body;
    console.log(req.body);

    // Ensure login type and email are provided
    if (!login_type || !email) {
        return res.status(400).json({
            success: false,
            message: "Login type and email are required",
        });
    }

    try {
        let user;

        switch (login_type) {
            case "ro_admin":
                if (!password) {
                    return res.status(400).json({
                        success: false,
                        message: "Password is required for RO Admin login",
                    });
                }
                user = await db.query(
                    "SELECT * FROM users WHERE email = $1",
                    [email]
                );
                if (!user.rows.length) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid email or password",
                    });
                }

                // Compare password hash
                const validPassword = await bcrypt.compare(
                    password,
                    user.rows[0].password_hash
                );
                if (!validPassword) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid email or password",
                    });
                }
                break;

            case "chapter":
                user = await db.query(
                    "SELECT * FROM chapter WHERE email_id = $1",
                    [email]
                );
                if (!user.rows.length) {
                    return res.status(404).json({
                        success: false,
                        message: "Chapter email ID not found",
                    });
                }
                break;

            case "member":
                user = await db.query(
                    "SELECT * FROM member WHERE member_email_address = $1",
                    [email]
                );
                if (!user.rows.length) {
                    return res.status(404).json({
                        success: false,
                        message: "Member email ID not found",
                    });
                }
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid login type",
                });
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: user.rows[0],
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

module.exports = {
    loginController,
};
