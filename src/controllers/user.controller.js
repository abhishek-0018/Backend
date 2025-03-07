import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt  from "jsonwebtoken";


const generateAccessAndRefreshTokens= async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken};

    } catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser =asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message:"ok"
    // })

    // get user detail from frontend
    const {fullName,email,username,password}=req.body

    //  validation
    if(fullName===""){
        throw new ApiError(400,"Fullname is required")
    }
    else if([email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }

    //  check if user already exist
   const existedUser= await User.findOne({
        $or: [{username},{email}]
    })
    if (existedUser){
        throw new ApiError(409,"User with email or Username already exist");
    }



    //  check for images
    const avatarLocalPath= req.files?.avatar[0]?.path;
    //const coverLocalPath= req.files?.coverImage[0]?.path;

    let coverLocalPath;
    if(!avatarLocalPath){
        throw new ApiError(404,"Avatar file required");
    }

    if(req.files&&Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
        coverLocalPath=req.files.coverImage[0].path
    }


    //  upload img to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverLocalPath);
    if(!avatar){
        throw new ApiError(404,"Avatar file is required");
    }



    //   create user object
    const user= await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })




    // remove password and request token field
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )



    // check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user.")
    }


    //  return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser =asyncHandler(async(req,res)=>{
    const {email,username,password}=req.body
    if(!email){
        throw new ApiError(400,"email is required");
    }
    if(!username){
        throw new ApiError(400,"username is required");
    }


    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPValid = await user.isPasswordCorrect(password);
    
    if(!isPValid){
        throw new ApiError(401,"Password incorrect");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    //  for cookies
    const options ={
        httponly:true,
        secure:true  // cookie can only be modified by server
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser, accessToken, refreshToken
        },
        "User logged In Successfully")
    )

})

const logoutUser =asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $unset:{
                refreshToken: 1// this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options={
        httponly:true,
        secure:true 
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{/*No data is send*/},"User logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken|| req.body.refreshToken

    try {
        if(!incomingRefreshToken){
            throw new ApiError(401,"unauthorized request")
        }
    
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user= await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token");
        }
    
        if(incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401,"Refresh token is used")
        }
    
        const options={
            httponly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,{accessToken,refreshToken: newRefreshToken},"Access token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message||"Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user =await User.findById(req.user?._id)
    const ispasswordcorrect=await user.isPasswordCorrect(oldPassword)
    if(!ispasswordcorrect){
        throw new ApiError(401,"Invalid old password")
    }
    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password change successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200,req.user,"Current user fetched successfully");
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName||!email){
        throw new ApiError(400,"All fields reqiure");
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Account detail updated successfully"))
})

const updateUserAvatar =asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar =await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiResponse(400,"Error while uploading avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
        ).select("-password")

        return res.status(200).json(
            new ApiResponse(200,user,"Avatar file updated successfully")
        )
})

const updateUserCoverImage =asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover file is required")
    }

    const coverImage =await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiResponse(400,"Error while uploading cover Image")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
        ).select("-password")

    return res.status(200).json(
            new ApiResponse(200,user,"Cover Image file updated successfully")
        )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    //const channel=await User.find({username}) or:
    const channel= await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:  {$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ]) 

    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist.")
    }

    return res.status(200).json(
        new ApiResponse(200,channel[0],"User channel fetched successfully.")
    )
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField: "_id",
                as:"watchHistort",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,user[0].watchHistory,"Watched history fetched successfully.")
    )
})

const searchUser=asyncHandler(async(req,res)=>{
    const {searchedUser}=req.query;
    if(!searchedUser){
        throw new ApiError(400,"Username is required");
    }
    const user = await User.findOne({username: searchedUser});
    if(!user){
        throw new ApiError(400,"Username doesn't exist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,{user},"User logged In Successfully")
    )
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory,searchUser}