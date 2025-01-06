const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = require("../../database/db"); // Ensure this is correctly configured for PostgreSQL

// Create a transporter for Hostinger's SMTP service
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port:  587,
  secure: false, // Use true for port 465, false for all other ports
  auth: {
    user: "as9467665000@gmail.com",
    pass: "ddle kjkt haxu vfmz",
  },
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

const verifyOtpController = async (req, res) => {
  try {
    const { email, otp, login_type } = req.body;
    console.log('Step 1 - Incoming verification request:', {
      email,
      typedOtp: otp,
      login_type,
    });

    if (!otp || !email) {
      console.log('Step 2 - Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Get the most recent valid OTP
    const storedOtpResult = await db.query(
      `SELECT * FROM otp 
       WHERE email = $1 
       AND expires_at > NOW()  /* Only get non-expired OTPs */
       ORDER BY generated_at DESC 
       LIMIT 1`,
      [email]
    );

    const storedOtp = storedOtpResult.rows[0];

    // Log OTP comparison
    console.log('Step 3 - Latest OTP Comparison:', {
      typedOtp: otp,
      storedOtp: storedOtp?.otp,
      isMatch: storedOtp?.otp === otp,
      generatedAt: storedOtp?.generated_at,
      expiresAt: storedOtp?.expires_at,
      currentTime: new Date()
    });

    if (!storedOtp) {
      console.log('Step 4 - No valid OTP found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'No valid OTP found. Please request a new OTP.',
      });
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
      console.log('Step 4 - OTP mismatch:', {
        typedOtp: otp,
        storedOtp: storedOtp.otp,
        email: email,
        expiresAt: storedOtp.expires_at
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.',
      });
    }

    // Clean up all expired and old OTPs for this email
    await db.query(
      `DELETE FROM otp 
       WHERE email = $1 
       AND (expires_at <= NOW() OR generated_at < $2)`,
      [email, storedOtp.generated_at]
    );

    // Success!
    console.log('Step 5 - OTP verified successfully:', {
      email: email,
      login_type: storedOtp.login_type
    });
    
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      login_type: storedOtp.login_type
    });

  } catch (error) {
    console.error('Error in verification:', {
      error: error.message,
      typedOtp: req.body.otp
    });
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
};

module.exports = {
    loginController,
    verifyOtpController,
};
