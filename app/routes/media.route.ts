import express, { type Express } from 'express'
import * as media from '../controller/media.controller.js'
import auth from '../middleware/auth.middleware.ts'

export default (app: Express) => {
    const router = express.Router();
    router.post("/upload-files", auth, media.fileUpload);

    app.use('/api/media', router);
};
