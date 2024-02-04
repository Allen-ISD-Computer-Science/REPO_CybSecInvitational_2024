//@ts-check
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "ahsinvitational@gmail.com",
    pass: "cogz sptu yryd nvtf",
  },
});

class VerificationGroup {
  constructor(emails) {
    this.tokens = {};
    this.verifiedEmails = {};
    emails.forEach((email) => {
      let token = new VerificationToken(email);
      if (token) this.tokens[email] = token;
    });
  }

  attemptValidation(email, code) {
    let token = this.tokens[email];
    if (!token) return false;
    if (token.code !== code) return false;

    this.verifiedEmails[email] = true;
    delete this.tokens[email];

    if (Object.keys(this.tokens).length <= 0) {
    }
    return true;
  }
}

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};
class VerificationToken {
  constructor(email) {
    if (!validateEmail(email)) return;
    this.email = email;
    this.code = Math.floor(100000 + Math.random() * 900000);
    this.verified = false;
  }
}

function sendEmail(code) {}

function onNewVerification(email1, email2) {
  let code2 = Math.floor(100000 + Math.random() * 900000);
  let token = new VerificationToken(email1, email2, code1, code2);
  pendingTokens[email1] = token;
  pendingTokens[email2] = token;
}

const message = {
  from: "ahsinvitational@gmail.com",
  to: ["neondenetro@gmail.com", "soohan.cho@student.allenisd.org", "james.dungan@student.allenisd.org"],
  subject: "Hello from Nodemailer",
  text: "This is a test email sent using Nodemailer.",
  attachments: [
    {
      path: "public/img/logo.png",
    },
  ],
};

transporter.sendMail(message, (error, info) => {
  if (error) {
    console.error("Error sending email: ", error);
  } else {
    console.log("Email sent: ", info.response);
  }
});

function sendVerificationEmail() {}

module.exports = { sendVerificationEmail };
