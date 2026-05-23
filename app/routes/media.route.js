module.exports = app => {
    const media = require('../controller/media.controller');
    const router = require("express").Router();
    const auth = require('../middleware/auth.middleware');
    router.post("/upload-files", auth, media.fileUpload);

    app.use('/api/media', router);
};