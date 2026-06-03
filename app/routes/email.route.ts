import express, { type Express } from 'express'
import * as email from '../controller/email.controller.js'
import auth from '../middleware/auth.middleware.ts'

export default (app: Express) => {
    const router = express.Router();

    router.post("/create", auth, email.create);
    router.get("/setting-get", auth, email.getEmail);
    router.post("/save/setting", auth, email.saveSetting);
    
    app.use('/api/email', router);
};
