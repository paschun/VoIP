import User from '../model/user.model.js'
import { jwtVerify } from 'jose'
import { env } from '../../config/env.ts'
const joseSecret = new TextEncoder().encode(env.COOKIE_KEY);
// const salt = process.env.COOKIE_KEY
export default async (req, res, next) => {
    try {
        if(req.headers.token){
            const token = req.headers.token;
            var condition = {token:token};
            /* User.findOne(condition).then(data => {
                if(data){ */
                    try {
                        const { payload } = await jwtVerify(token, joseSecret);
                        //console.log(payload)
                        req.user = payload;
                        next();
                      } catch(err) {
                        res.status(401).json({
                            error: 'Unauthorized Access!'
                        });
                      }
                    
               /* }else{
                    res.status(401).json({
                        error: 'Unauthorized Access!'
                    });
                }
             }).catch(err => {
                res.status(500).send({
                  message:
                    err.message || "Error occurred while logging in."
                });
            });  */
        }else{
            res.status(401).json({
                error: 'Unauthorized Access!'
            });
        }
    } catch (e) {
      res.status(401).json({
        error: 'Unauthorized Access!'
      });
    }
};