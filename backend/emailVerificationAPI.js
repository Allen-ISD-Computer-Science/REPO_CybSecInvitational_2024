//@ts-check
require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "ahsinvitational@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

function sendVerificationEmail(email, code) {
  const message = {
    from: "ahsinvitational@gmail.com",
    to: [email],
    subject: "Hello from Nodemailer",
    text: `This is a test email sent using Nodemailer. Your code it ${code}`,
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
}

let pendingGroups = {};

class VerificationGroup {
  constructor(emails) {
    this.tokens = {};
    for (let email of emails) {
      if (!validateEmail(email)) throw "Invalid Email Format";
      if (pendingGroups[email]) throw "Email Already Pending Verification";

      let token = new VerificationToken(email);
      if (token) this.tokens[email] = token;
      sendVerificationEmail(email, token.code);
      pendingGroups[email] = this;
    }

    this._timeout = setTimeout(() => {
      console.log("session ended");
      this.remove();
    }, 10000);
  }

  remove() {
    clearTimeout(this._timeout);

    for (const key of Object.keys(this.tokens)) {
      delete pendingGroups[key];
    }
  }

  onGroupResolved() {
    console.log("resolved group verification");
    this.remove();
  }

  attemptValidation(email, code) {
    console.log("attempting validation", email, code);
    let token = this.tokens[email];
    if (!token) return false;
    if (token.code !== code) return false;
    token.verified = true;

    let resolved = true;
    for (const [key, token] of Object.entries(this.tokens)) {
      if (!token.verified) {
        resolved = false;
        break;
      }
    }
    if (resolved) {
      this.onGroupResolved();
    }
    return true;
  }
}

class VerificationToken {
  constructor(email) {
    this.email = email;
    this.code = Math.floor(100000 + Math.random() * 900000);
    this.verified = false;
  }
}

module.exports = { sendVerificationEmail };
