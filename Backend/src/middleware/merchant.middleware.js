const authorize = (...authorizeRoles)=>{
return (req,res,next)=>{
    if(!authorizeRoles){
        return res.status(401).json({
            success:false,
            message:"plz login first"
        })
    }

    if(!authorizeRoles.includes(req.user.role)){
        return res.status(403).json({
            success:false,
            message:"you are not authorize for this action"
        })
    }
    next();
 }
}

export{authorize};