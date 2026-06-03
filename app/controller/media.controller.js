import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'
import multer from 'multer'
import moment from 'moment'
import cron from 'node-cron'
import Media from '../model/media.model.js'
import { combineURLs, uploadFolderFormat } from '../helper/common.helper.js'
import { env } from '../../config/env.ts'

const storage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
        const date = moment().format(uploadFolderFormat);
        try {
            await fs.promises.access("./uploads/" + date);
        } catch (e) {
            await fs.promises.mkdir('./uploads/' + date)
        }
        // resolves relative to process.cwd()
        // Uploads is the Upload_folder_name
        cb(null, `./uploads/${date}/`)
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = crypto.randomBytes(24).toString('hex');
        cb(null, filename + ext);
        // cb(null, new Date().toISOString().replace(/:/g, '-')+".jpg")
    }
})

const maxSize = 1000 * 1000 * 1000;

const upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {

        // Set the filetypes, it is optional
        const filetypes = /jpeg|jpg|gif|png/;
        const mimetype = filetypes.test(file.mimetype);

        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }

        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }

    // mypic is the name of file attribute
}).single("file");


export const fileUpload = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                res.send(err)
            }
            else {
                const date = moment().format(uploadFolderFormat);
                const mediaData = { media: `uploads/${date}/${req.file.filename}`, user: req.user.id };

                const media = await Media.create(mediaData);
                if (media) {
                    media.media = combineURLs(
                      env.BASE_URL,
                      media.media
                    );
                    res.send({ status: true, message: 'Media upload!', data: media });
                } else {
                    res.status(400).json({ status: 'false', message: 'Media not uploaded!' });
                }
            }
        })
    } catch (error) {
        res.status(400).json({ status: 'false', message: 'something is wrong' });
    }
};

function pruneOldUploads() {
    const startdate = moment().subtract(7, 'days').format(uploadFolderFormat);
    try {
        fs.rmSync('./uploads/' + startdate, { recursive: true });
    } catch (e) {
        console.log('folder not found:', startdate);
    }
}
// cron job runs every day at 01:00
cron.schedule('0 1 * * *', () => {
    console.log('running a cron job daily at 01:00 to delete mms folder older than 7 days');
    pruneOldUploads();
});

export const deleteMedia = async (_req, res) => {
    try {
        pruneOldUploads();
        res.send({ status: true, message: 'Old MMS folder deleted' });
    } catch (error) {
        res.status(400).json({ status: 'false', message: 'something is wrong' });
    }
};
