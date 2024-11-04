const asyncHandler=(requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export {asyncHandler}



// const asyn =()=>{}
// const asyn =(fun)=>()=>{}
// const asyn =(fun)=> async()=>{}
/*

//    Using try-catch
const asyncHandler=(fn)=> async(req,res,next)=>{
    try{
        await fn(req,res,next)
    }catch(error){
        res.status(err.code||500).json({
            success:false,
            message: err.message
        })
    }
}
*/ 