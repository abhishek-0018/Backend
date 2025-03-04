import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { getVideos, uploadVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router=Router()

router.route("/upload").post(
    // for giving files
    upload.fields([
        {
            name: "thumbnail",
            maxCount:1
        },
        {
            name:"videoFile",
            maxCount:1
        }
    ]),verifyJWT,
    uploadVideo)
router.route("/getVideos").get(verifyJWT,getVideos)
export default router