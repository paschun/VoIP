import express from 'express'
import * as profileController from '../controller/profile.controller.js'
import auth from '../middleware/auth.middleware.ts'

export default app => {
    const router = express.Router();
    //router.post("/register",auth, user.login);
    router.post("/create",auth, profileController.crateProfile);
    router.post("/getdata",auth, profileController.getProfile);
    router.post("/delete-profile",auth, profileController.deleteProfile);
    
    router.post("/getdata-one",auth, profileController.getOneProfile);
    
    app.use('/api/profile', router);
};
