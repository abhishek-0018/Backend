import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {Video} from "../models/video.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const uploadVideo=asyncHandler(async(req,res)=>{
    const {title,description}=req.body;

    if(!title){
        throw new ApiError(404,"Title is required");
    }

    if(!description){
        throw new ApiError(404,"Description is required");
    }

    const thumbnailLocalPath= req.files?.thumbnail[0]?.path;
    if(!thumbnailLocalPath){
        throw new ApiError(404,"Thumbnail is required");
    }

    const uploadedVideoLocalPath= req.files?.videoFile[0]?.path;
    if(!uploadedVideoLocalPath){
        throw new ApiError(404,"Video is required")
    }

    const currentUserId=req.user._id;
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);
    const uploadedVideo=await uploadOnCloudinary(uploadedVideoLocalPath);
    
    const video= await Video.create({
       title,
       description,
       thumbnail: thumbnail.url,
       videoFile: uploadedVideo.url,
       duration: uploadedVideo.duration,
       owner:currentUserId
    })

    return res.status(201).json(
        new ApiResponse(200, video, "Video uploaded Successfully")
    )
}
)

const getVideos=asyncHandler(async(req,res)=>{
    const owner=req.user._id;
    const videos= await Video.find({owner:owner});
    return res.status(200).json(
        new ApiResponse(200, videos, "Video fetched Successfully")
    )
})

export {uploadVideo,getVideos}