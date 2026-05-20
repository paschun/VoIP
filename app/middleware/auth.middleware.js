var User = require('../model/user.model');
const { jwtVerify } = require('jose');
const joseSecret = new TextEncoder().encode(process.env.COOKIE_KEY);
// const salt = process.env.COOKIE_KEY
module.exports = async (req, res, next) => {
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