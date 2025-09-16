import nodemailer from "nodemailer"
import  dotenv from 'dotenv'
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import handlebars from "handlebars"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mailVerification = async (token, email) => {
    
     const emailTemplateSource = fs.readFileSync(
        path.join(__dirname, "template.hbs"),
        "utf-8"
    )

    const template = handlebars.compile(emailTemplateSource)
    const htmlToSend = template({ url:process.env.FRONT_URL +"/verify/"+ encodeURIComponent(token) });


    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_ADD,
            pass: process.env.APP_PASS
        }
    });

    const mailConfiguration = {
        from: process.env.EMAIL_ADD,
        to: email,
        subject: "Email verification",
        text: "Plaintext version of the message",
        html: htmlToSend,
    }
    transporter.sendMail(mailConfiguration, function (error, info) {
        if (error) {
            throw new Error(error);
        }
        console.log("Email send");
    });

}
export default mailVerification;