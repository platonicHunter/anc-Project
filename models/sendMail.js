const nodemailer = require("nodemailer");

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "aungnyeinchann416@gmail.com", // Replace with your Gmail address
    pass: "zlxrdjqaixexupqz", // Replace with your Gmail password or app-specific password
  },
});

// Function to send reset email
function sendResetEmail(email, resetToken) {
  let mailOptions = {
    from: '"Admin Kolar" <aungnyeinchann416@gmail.com>',
    to: email,
    subject: "Password Reset",
    text:
      `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
      `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
      `http://localhost:3000/reset/${resetToken}\n\n` +
      `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  // Return a promise to handle success or failure
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email: ", error);
        reject(error);
      } else {
        console.log("Email sent: " + info.response);
        resolve(info);
      }
    });
  });
}

function sendActivationEmail(email, activationToken) {
  const mailOptions = {
    from: `"Admin Kolar" <${process.env.EMAIL_USER}>`, // Use environment variable
    to: email,
    subject: "Account Activation",
    text: `
      You are receiving this email because you (or someone else) have created an account with us.

      Please click on the following link, or paste this into your browser to activate your account:

      http://localhost:3000/activate/${activationToken}

      If you did not create an account, please ignore this email and no action will be required.
    `,
  };
  // Return a promise to handle success or failure
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email: ", error);
        reject(error);
      } else {
        console.log("Email sent: " + info.response);
        resolve(info);
      }
    });
  });
}

module.exports = { sendResetEmail , sendActivationEmail};
