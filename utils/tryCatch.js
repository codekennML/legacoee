const AppError = require("../middlewares/errors/BaseError")

const tryCatch = (controller) => async(res, req) => {
  try{
    // throw new AppError("Wrong account", "User supplies wrong account", "403" )
    // 
     const result  =  await controller(res, req)
  return result
  } 
  catch(error) {
    //Log error here , 

      return { error : true , message : error.message, statusCode : error?.statusCode }
   //return the error object
  
}
}

module.exports  =  tryCatch