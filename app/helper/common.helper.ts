import nodemailer, { type SendMailOptions } from 'nodemailer'
import { openpgpEncrypt } from 'nodemailer-openpgp'

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

function sendEmail(setting: SendEmailSetting, email: SendEmailContent): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            // todo: dont cast to number, ideally handled in validation
            const transporter = nodemailer.createTransport({
                host: setting.host, // "smtp.gmail.com",
                port: Number(setting.port), // 587,
                secure: setting.secure, // true for 465, false for other ports
                auth: {
                    user: setting.email, // process.env.EMAIL, // generated ethereal user
                    pass: setting.password, // process.env.PASSWORD, // generated ethereal password
                },
            });

            const mailOptions: EncryptableMailOptions = {
                from: setting.sender_email, // sender address
                to: setting.to_email, // list of receivers
                subject: email.subject, // Subject line
                text: email.text, // plain text body
                html: email.html,
            };

            if (setting.pgpEncryptEnabled) {
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

// Join path segments into one URL, trimming the slashes at each seam so there are no doubles.
// The first segment keeps any leading slash and the last keeps any trailing slash.
const combineURLs = (...urls: string[]): string => {
    if (urls.length === 0) return '';
    return urls.reduce((base, segment) => {
        const left = base.replace(/\/+$/, '');     // strip any trailing slash(es) from the accumulated left side
        const right = segment.replace(/^\/+/, ''); // strip any leading slash(es) from the next segment
        return `${left}/${right}`;                 // rejoin with exactly one slash at the seam
    });
}

export {
    sendEmail, combineURLs,
}
