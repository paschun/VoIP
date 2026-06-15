import type { Request, Response } from 'express'
import Validator from 'validatorjs'
import * as openpgp from 'openpgp'
import Email from '../model/email.model.ts'
import Setting from '../model/setting.model.ts'
import { sendDoc } from '../util/respond.ts'
import type { EmailDoc } from '../../shared/schema/email.ts'
import type { EmailSettingsResponse, SaveEmailSettingsResponse, SaveEmailSettingResponse } from '../../shared/contracts/email.ts'

const _validPgpKey = (keyString: string) => openpgp.readKey({ armoredKey: keyString });

export async function create(req: Request, res: Response<SaveEmailSettingsResponse>) {
    try{
        const rules = {
            email: 'required',
            password: 'required',
            to_email: 'required',
            host: 'required',
            port: 'required',
            sender_email: 'required'
        };
        const validation = new Validator(req.body, rules);
        if(validation.passes()){
            const storeData = {user: req.user.id};
            const checkemail = await Email.findOne(storeData)
            if (req.body.pgpEncryptEnabled === true) {
                try {
                    await _validPgpKey(req.body.pgpPublicKey);
                } catch {
                    res.status(400).json({status:false, message:'Email settings not saved! Invalid PGP Key.'});
                    return;
                }
            }
            if(checkemail){
                checkemail.email = req.body.email
                checkemail.password = req.body.password
                checkemail.to_email = req.body.to_email
                checkemail.host = req.body.host
                checkemail.port = req.body.port
                checkemail.secure = req.body.secure
                checkemail.sender_email = req.body.sender_email
                checkemail.pgpPublicKey = req.body.pgpPublicKey
                checkemail.pgpEncryptEnabled = req.body.pgpEncryptEnabled
                const saveData = await checkemail.save()
                if(saveData){
                    sendDoc<EmailDoc>(res, checkemail, 'Email settings updated!');
                }else{
                    res.status(400).json({status:'false',message:'Email settings not updated!'});
                }
            }else{
                const createData = {
                    user: req.user.id,
                    email:req.body.email,
                    password: req.body.password,
                    to_email:req.body.to_email,
                    host:req.body.host,
                    port: req.body.port,
                    secure:req.body.secure,
                    sender_email: req.body.sender_email
                };
                const isSave = await Email.create(createData);
                if(isSave){
                    sendDoc<EmailDoc>(res, isSave, 'Email settings saved!');
                }else{
                    res.status(400).json({status:false,message:'Email settings not saved!'});
                }
            }
        }else{
            res.status(419).send({status: false, errors: validation.errors.all()});
        }
    }catch{
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}

export async function getEmail(req: Request, res: Response<EmailSettingsResponse>) {
    try{
        // no validation on input here
        const emailSettings = await Email.findOne({ user: req.user.id })
        sendDoc<EmailDoc | null>(res, emailSettings, 'Get Email Settings!')
    }catch{
        res.status(400).json({status:'false', message:'something is wrong'});
    }
}

export async function saveSetting(req: Request, res: Response<SaveEmailSettingResponse>) {
    try{
        // $eq is "NoSQL-injection-hardened", defends against attacker-provided `{ "$gt": "" }`
        // if input is validated, use `findById`
        const setting = await Setting.findOne({_id: { $eq: req.body.setting_id}})
        if(setting){
            setting.emailnotification = req.body.status
            await setting.save()
            res.send({status:true, message:'settings updated!', data:null});
        }else{
            res.status(400).json({status:'false',message:'settings not updated!'});
        }
    }catch{
        res.status(400).json({status:'false',message:'something is wrong'});
    }
}
