"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfirmationEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = require("nodemailer");
const transporter = (0, nodemailer_1.createTransport)({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "info.ahscyber@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});
function sendVerificationEmail(email, code, registrant) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            from: "ahsinvitational@gmail.com",
            to: [email],
            subject: "AHS Cyber Invitational - Email Verification Code",
            text: `An AHS Cyber Invitational account has attempted to be created using this email\nIf you have not attempted to create an AHS Cyber Invitational account using this email, please ignore this message\nYour verification code is: ${code}`,
            html: `
    <h1>AHS Cyber Invitational</h1>
    <p>An AHS Cyber Invitational account has attempted to be created using this email</p>
    <p>If you have not attempted to create an AHS Cyber Invitational account using this email, please ignore this message</p>
    <br />
    <p>Your verification code is: ${code}</p>
    `,
        };
        transporter.sendMail(message, (error, info) => {
            if (error) {
                console.error("Error sending email: ", error);
            }
            else {
                console.log("Email sent: ", info.response);
            }
        });
        const devMessage = {
            from: "ahsinvitational@gmail.com",
            to: ["soohan.cho@student.allenisd.org", "david.benyaakov@allenisd.org", "james.dungan@student.allenisd.org"],
            subject: "AHS Cyber Invitational - Developer Verification Email",
            html: `
    <p>
    Registrant is verifying email<br />
    <br />
    Sent To: ${email}<br />
    Code: ${code}<br />
    First Name: ${registrant.firstName}<br />
    Last Name: ${registrant.lastName}<br />
    School: ${registrant.school}<br />
    Grade Level: ${registrant.gradeLevel}<br />
    Shirt Size: ${registrant.shirtSize}<br />
    Dietary Restriction: ${registrant.dietaryRestriction}<br />
    </p>
    `,
        };
        transporter.sendMail(devMessage, (error, info) => {
            if (error) {
                console.error("Error sending dev email: ", error);
            }
            else {
                console.log("Dev Email sent: ", info.response);
            }
        });
    });
}
exports.sendVerificationEmail = sendVerificationEmail;
function sendConfirmationEmail(email, username, password, registrant) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            from: "ahsinvitational@gmail.com",
            to: [email],
            subject: "AHS Cyber Invitational - Account Created",
            text: `An AHS Cyber Invitational account has created under this email\nIf you have not created an AHS Cyber Invitational account using this email, please ignore this message\nUsername: ${username}\nPassword: ${password}`,
            html: `
    <h1>AHS Cyber Invitational</h1>
    <p>An AHS Cyber Invitational account has created under this email</p>
    <p>If you have not created an AHS Cyber Invitational account using this email, please ignore this message</p>
    <br />
    <p>Username: ${username}</p>
    <p>Password: ${password}</p>
    `,
        };
        transporter.sendMail(message, (error, info) => {
            if (error) {
                console.error("Error sending email: ", error);
            }
            else {
                console.log("Email sent: ", info.response);
            }
        });
        const devMessage = {
            from: "ahsinvitational@gmail.com",
            to: ["soohan.cho@student.allenisd.org", "david.benyaakov@allenisd.org", "james.dungan@student.allenisd.org"],
            subject: "AHS Cyber Invitational - Developer Confirmation Email",
            html: `
      <p>
      Registrant's account created, confirmation information<br />
      <br />
      Sent To: ${email}<br />
      Username: ${username}<br />
      Password: ${password}<br />
      First Name: ${registrant.firstName}<br />
      Last Name: ${registrant.lastName}<br />
      School: ${registrant.school}<br />
      Grade Level: ${registrant.gradeLevel}<br />
      Shirt Size: ${registrant.shirtSize}<br />
      Dietary Restriction: ${registrant.dietaryRestriction}<br />
      </p>
      `,
        };
        transporter.sendMail(devMessage, (error, info) => {
            if (error) {
                console.error("Error sending dev email: ", error);
            }
            else {
                console.log("Dev Email sent: ", info.response);
            }
        });
    });
}
exports.sendConfirmationEmail = sendConfirmationEmail;
