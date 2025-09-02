import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import handlebars from "handlebars";

dotenv.config()


export const sendOtpMailAdmin = async (email, otp, user) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  try {
    const emailTemplateSource = fs.readFileSync(
      path.join(__dirname, "otpTemplateAdmin.hbs"),
      "utf-8"
    );

    const template = handlebars.compile(emailTemplateSource);
    const digits = otp.toString().padStart(6, "0").split("");

    const htmlToSend = template({
      d1: digits[0],
      d2: digits[1],
      d3: digits[2],
      d4: digits[3],
      d5: digits[4],
      d6: digits[5],
      user: user || "Admin",       
      year:  new Date().getFullYear()
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_ADD,
        pass: process.env.APP_PASS,
      },
    });

    const mailConfiguration = {
      from: process.env.EMAIL_ADD,
      to: email,
      subject: "OTP for Admin Two Step Verification",
      text: `Your OTP is: ${otp}`,
      html: htmlToSend,
    };

    await transporter.sendMail(mailConfiguration);

  } catch (error) {
    throw error;
  }
};
