import express, { type Express } from 'express'
import * as call from '../controller/call.controller.js'
import auth from '../middleware/auth.middleware.ts'

export default (app: Express) => {
    const router = express.Router();

    router.post("/token", auth, call.getToken);

    //calling route
    router.post("/make-call", call.makeCall);
    router.post("/status", call.status);
    router.post("/incoming", call.incoming);
    router.post("/telnyx", call.telnyx);
    router.post("/status/telnyx", call.statusTelnyx);
    
    app.use('/api/call', router);
};
