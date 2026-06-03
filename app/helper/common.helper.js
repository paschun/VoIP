import nodemailer from 'nodemailer'
import { openpgpEncrypt } from 'nodemailer-openpgp'
import twilio from 'twilio'

export const uploadFolderFormat = 'YYYYMMDD'

const sendEmail = (setting, email) => {
    return new Promise((resolve) => {
        try {
            const transporter = nodemailer.createTransport({
                host: setting.host, // "smtp.gmail.com",
                port: setting.port, // 587,
                secure: setting.secure, // true for 465, false for other ports
                auth: {
                    user:  setting.email, // process.env.EMAIL, // generated ethereal user
                    pass: setting.password, // process.env.PASSWORD, // generated ethereal password
                },
            });

            const mailOptions = {
                from: setting.sender_email, // sender address
                to: setting.to_email, // list of receivers
                subject: email.subject, // Subject line
                text:  email.email, // plain text body
                html: email.html
            };

            if (setting.pgpEncryptEnabled === true) {
                transporter.use('stream', openpgpEncrypt());
                mailOptions.encryptionKeys = [setting.pgpPublicKey]
                mailOptions.shouldEncrypt = true
            }

            transporter.sendMail(mailOptions);
            resolve(true);
        }catch (e){
            console.log(e);
            resolve(false);
        }
    });
}

const creatTwiml = async (sid, token) => {
    try {
        const client = twilio(sid, token);
        const twiml = await client.applications.create({
            voiceMethod: 'POST',
            voiceUrl: '',
            friendlyName: 'Operation Privacy VoIPSuite'
        })
        return twiml.sid
    }catch (e){
        console.log(e);
        return false;
    }
}

const combineURLs = (...urls)  => {
    let output = urls[0];
    for (let i = 1; i < urls.length; i++) {
        output = output.replace(/\/+$/, '') + '/' + urls[i].replace(/^\/+/, '');
    }
    return output;
}

export {
    sendEmail, creatTwiml, combineURLs,
}
