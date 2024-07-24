const { StatusCodes, getReasonPhrase } = require("http-status-codes")
const { ROLES } = require( "../../config/enums" )
const jwt =  require("jsonwebtoken")
const AppError = require("../errors/BaseError")

const driver_app_id =  process.env.DRIVER_APP_ID 
const rider_app_id =  process.env.RIDER_APP_ID 

const AuthGuard = async(res, req, token, mobile_device_id ) => { 
    const mobileId = req.getHeader("mobile_device_id")  ?? mobile_device_id
    const app_id  =  req.getHeader("app_id") ?? null
    const ACCESS_TOKEN_ID = process.env.ACCESS_TOKEN_ID
    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

   
    
if (!ACCESS_TOKEN_ID )
        throw new AppError(
    getReasonPhrase(StatusCodes.UNAUTHORIZED),
    StatusCodes.UNAUTHORIZED
);

console.log(token)
console.log(req.getHeader[ACCESS_TOKEN_ID])

const accessToken = req.getHeader[ACCESS_TOKEN_ID] ?? token
console.log(accessToken, "Nimahah")
if (!accessToken)
    throw new AppError(
getReasonPhrase(StatusCodes.UNAUTHORIZED),
StatusCodes.UNAUTHORIZED
);  

console.log("bluee")

jwt.verify(accessToken ?? token, ACCESS_TOKEN_SECRET, async(err,  decoded)=> {
  console.log("greeee")   

     if (err) {

       console.log("greeee")  
       throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED),
        StatusCodes.UNAUTHORIZED)
    }

     const {mobileId  : userMobileId, user,  role, subRole } =  decoded 

     console.log("freee")  

  if (mobileId &&  mobileId !== userMobileId) 
  {
    console.log("jhheeee")  
    throw new AppError(
      getReasonPhrase(StatusCodes.UNAUTHORIZED),
      StatusCodes.UNAUTHORIZED
    );
  }

if(!token){

  console.log("kkdkdkeeee")  
//Only do this check for http connections
  if(app_id === rider_app_id && role !== ROLES.RIDER) throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED), StatusCodes.UNAUTHORIZED)

 if(app_id === driver_app_id && role !== ROLES.DRIVER) throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED), StatusCodes.UNAUTHORIZED)
   
 if(!app_id && [ROLES.DRIVER, ROLES.RIDER].includes(req.role))throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED), StatusCodes.UNAUTHORIZED) 
    

}
      req.user = user
      req.role = role
      req.subRole =  subRole
      res.user =  user
      res.role = role 
      res.subRole = subRole
})


}

module.exports  = { AuthGuard }
