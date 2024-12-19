const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = require("../../database/db"); // Ensure this is correctly configured for PostgreSQL

// Create a transporter for Hostinger's SMTP service
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',  // Hostinger SMTP server
  port: 465,                   // SSL port
  secure: true,                // Use true for SSL
  auth: {
      user: 'sprince@nationalmarketingprojects.com',  // Your email
      pass: '#@%/Sprince9708'   // Your app password or correct email password
  }
});

const sendOtpEmail = (email, otp) => {
  const mailOptions = {
      from: 'sprince@nationalmarketingprojects.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
  };

  return transporter.sendMail(mailOptions);
};

const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString(); // Generates a 6-digit OTP
};

const loginController = async (req, res) => {
    const { login_type, email, password } = req.body;
    console.log(req.body);

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

                // Generate OTP for 'ro_admin'
                const otp = generateOtp();
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

                // Store OTP in the database
                await db.query(
                    "INSERT INTO otp (login_type, email, password, user_id, otp, generated_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [
                        login_type,
                        email,
                        password,
                        user.rows[0].user_id,
                        otp,
                        new Date(),
                        expiresAt,
                    ]
                );

                // Send OTP email
                await sendOtpEmail(email, otp);
                return res.status(200).json({
                    success: true,
                    message: "OTP sent successfully",
                });

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

                // Generate OTP for 'chapter'
                const otpChapter = generateOtp();
                const expiresAtChapter = new Date();
                expiresAtChapter.setMinutes(expiresAtChapter.getMinutes() + 10);

                await db.query(
                    "INSERT INTO otp (login_type, email, otp, generated_at, expires_at) VALUES ($1, $2, $3, $4, $5)",
                    [
                        login_type,
                        email,
                        otpChapter,
                        new Date(),
                        expiresAtChapter,
                    ]
                );

                await sendOtpEmail(email, otpChapter);
                return res.status(200).json({
                    success: true,
                    message: "OTP sent successfully",
                });

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

                // Generate OTP for 'member'
                const otpMember = generateOtp();
                const expiresAtMember = new Date();
                expiresAtMember.setMinutes(expiresAtMember.getMinutes() + 10);

                await db.query(
                    "INSERT INTO otp (login_type, email, otp, generated_at, expires_at) VALUES ($1, $2, $3, $4, $5)",
                    [
                        login_type,
                        email,
                        otpMember,
                        new Date(),
                        expiresAtMember,
                    ]
                );

                await sendOtpEmail(email, otpMember);
                return res.status(200).json({
                    success: true,
                    message: "OTP sent successfully",
                });

            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid login type",
                });
        }
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
