import type { Request, Response } from 'express'
import Validator from 'validatorjs'
import * as openpgp from 'openpgp'
import Email from '../model/email.model.ts'
import Setting from '../model/setting.model.ts'

const _validPgpKey = (keyString: string) => openpgp.readKey({ armoredKey: keyString });

export const create = async (req: Request, res: Response) => {
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
                    res.send({status:true, message:'Email settings updated!', data:checkemail});
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
                    res.send({status:true, message:'Email settings saved!', data:isSave});
                }else{
                    res.status(400).json({status:false,message:'Email settings not saved!'});
                }
            }
        }else{
            res.status(419).send({status: false, errors:validation.errors, data: []});
        }
    }catch{
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};

export const getEmail = async (req: Request, res: Response) => {
    try{
        // no validation on input here
        const emailSettings = await Email.findOne({ user: req.user.id })
        res.send({status:true, message:'Get Email Settings!', data: emailSettings});
    }catch{
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};

export const saveSetting = async (req: Request, res: Response) => {
    try{
        // $eq is "NoSQL-injection-hardened", defends against attacker-provided `{ "$gt": "" }`
        // if input is validated, use `findById`
        const setting = await Setting.findOne({_id: { $eq: req.body.setting_id}})
        if(setting){
            setting.emailnotification = req.body.status
            await setting.save()
            // this data isnt used by client, can omit
            res.send({status:true, message:'settings updated!', data:null});
        }else{
            res.status(400).json({status:'false',message:'settings not updated!'});
        }
    }catch{
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};
