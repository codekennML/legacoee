const { StatusCodes, getReasonPhrase } = require("http-status-codes")
const { ROLES } = require( "../../config/enums" )
const jwt =  require("jsonwebtoken")
const AppError = require("../errors/BaseError")

const driver_app_id =  process.env.DRIVER_APP_ID 
const rider_app_id =  process.env.RIDER_APP_ID 

const AuthGuard = async(res, req ) => { 
    const mobileId = req.getHeader("mobile-device-id") 
    const app_id  =  req.getHeader("app_id")
    const ACCESS_TOKEN_ID = process.env.ACCESS_TOKEN_ID
    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
    
if (!ACCESS_TOKEN_ID )
        throw new AppError(
    getReasonPhrase(StatusCodes.UNAUTHORIZED),
    StatusCodes.UNAUTHORIZED
);

const accessToken = req.getHeader[ACCESS_TOKEN_ID]

if (!accessToken)
    throw new AppError(
getReasonPhrase(StatusCodes.UNAUTHORIZED),
StatusCodes.UNAUTHORIZED
); 
     
jwt.verify(accessToken, ACCESS_TOKEN_SECRET, async(err,  decoded)=> {
     
     if (err)  throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED),
     StatusCodes.UNAUTHORIZED)

     const {mobileId  : userMobileId, user,  role, subRole } =  decoded 

  if (mobileId &&  mobileId !== userMobileId) 
  {

    throw new AppError(
      getReasonPhrase(StatusCodes.UNAUTHORIZED),
      StatusCodes.UNAUTHORIZED
    );
  }

     if(app_id === rider_app_id && role !== ROLES.RIDER) throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED), StatusCodes.UNAUTHORIZED)

    if(app_id === driver_app_id && role !== ROLES.DRIVER) throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED), StatusCodes.UNAUTHORIZED)
      
    if(!app_id && [ROLES.DRIVER, ROLES.RIDER].includes(req.role))throw new AppError(getReasonPhrase(StatusCodes.UNAUTHORIZED), StatusCodes.UNAUTHORIZED) 
       
      req.user = user
      req.role = role
      req.subRole =  subRole
      res.user =  user
      res.role = role 
      res.subRole = subRole
})


}

module.exports  = { AuthGuard }
