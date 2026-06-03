import express, { type Express } from 'express'
import * as contact from '../controller/contact.controller.js'
import auth from '../middleware/auth.middleware.ts'

export default (app: Express) => {
    const router = express.Router();

    router.post("/get-one", auth, contact.getOne);
    router.post("/create", auth, contact.crate);
    router.post("/update", auth, contact.update);
    router.post("/delete", auth, contact.delete);
    router.get("/get-all", auth, contact.getAllContact);
    router.post("/multiple-add", auth, contact.multipleUpload);
    router.post("/deleteall", auth, contact.deleteall);
    

    app.use('/api/contact', router);
};
