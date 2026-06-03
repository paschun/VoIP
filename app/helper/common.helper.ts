import nodemailer, { type SendMailOptions } from 'nodemailer'
import { openpgpEncrypt } from 'nodemailer-openpgp'
import twilio from 'twilio'

export const uploadFolderFormat = 'YYYYMMDD'

// todo: check this against email model
interface SendEmailSetting {
    host: string
    port: number | string // why is this number | string
    secure: boolean
    email: string
    password: string
    sender_email: string
    to_email: string
    pgpEncryptEnabled?: boolean
    pgpPublicKey?: string | null
}

interface SendEmailContent {
    subject: string
    text: string
    html: string
}

// nodemailer-openpgp adds these two options on top of the standard mail options; the package ships no types.
type EncryptableMailOptions = SendMailOptions & { encryptionKeys?: unknown[]; shouldEncrypt?: boolean }

const sendEmail = (setting: SendEmailSetting, email: SendEmailContent): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const transporter = nodemailer.createTransport({
                host: setting.host, // "smtp.gmail.com",
                port: Number(setting.port), // 587,
                secure: setting.secure, // true for 465, false for other ports
                auth: {
                    user:  setting.email, // process.env.EMAIL, // generated ethereal user
                    pass: setting.password, // process.env.PASSWORD, // generated ethereal password
                },
            });

            const mailOptions: EncryptableMailOptions = {
                from: setting.sender_email, // sender address
                to: setting.to_email, // list of receivers
                subject: email.subject, // Subject line
                text:  email.text, // plain text body
                html: email.html,
            };

            if (setting.pgpEncryptEnabled === true) {
                transporter.use('stream', openpgpEncrypt());
                mailOptions.encryptionKeys = [setting.pgpPublicKey]
                mailOptions.shouldEncrypt = true
            }

            transporter.sendMail(mailOptions);
            resolve(true);
        }catch (e){
            console.error(e);
            resolve(false);
        }
    });
}

const creatTwiml = async (sid: string, token: string): Promise<string | false> => {
    try {
        const client = twilio(sid, token);
        const twiml = await client.applications.create({
            voiceMethod: 'POST',
            voiceUrl: '',
            friendlyName: 'Operation Privacy VoIPSuite'
        })
        return twiml.sid
    }catch (e){
        console.error(e);
        return false;
    }
}

const combineURLs = (...urls: string[]): string  => {
    let output = urls[0] ?? '';
    for (let i = 1; i < urls.length; i++) {
        output = output.replace(/\/+$/, '') + '/' + (urls[i] ?? '').replace(/^\/+/, '');
    }
    return output;
}

export {
    sendEmail, creatTwiml, combineURLs,
}
