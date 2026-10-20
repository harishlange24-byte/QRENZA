import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const protect = async(req,res,next)=>{

    try{
        const token = req.cookies?.token;

        if(!token){
            return res.status(401).json({
                success:false,
                message:"Please Login First"
            })
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.sub);

        if(!user || !user.isActive){
            return res.status(401).json({
                success:false,
                message:"Invalid User"
            })
        }

        req.user = user;
        next();

        
    }catch(error){
        return res.status(401).json({
            success:false,
            message:"Invalid or Expired login session"
        })
    }

  
}
// Customer facing routes are also reachable by guests, so a missing or broken
// session must not block the request. Handlers check req.user themselves.
const optionalProtect = async(req,res,next)=>{

    try{
        const token = req.cookies?.token;

        if(!token){
            return next();
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.sub);

        if(user && user.isActive){
            req.user = user;
        }

        next();

    }catch(error){
        next();
    }
}

  export {protect, optionalProtect};