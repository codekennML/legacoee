
const { StatusCodes, getReasonPhrase } = require("http-status-codes")
const AppError = require("../errors/BaseError")
const { ROLES} = require("../../config/enums")
 const verifyPermissions = (allowedRoles) => {

  return (res, req) => {


      if (!req.role || !allowedRoles.includes(req.role)) {
          throw new AppError(getReasonPhrase(StatusCodes.FORBIDDEN), StatusCodes.FORBIDDEN);
      }

      if ((req.role === ROLES.DRIVER || req.role === ROLES.RIDER) && req.subRole) {
        //IF this is a driver r=or roder and has a subRole
          throw new AppError(getReasonPhrase(StatusCodes.FORBIDDEN), StatusCodes.FORBIDDEN);
      }

      res.allowedRoles = allowedRoles;
  

  };
};

module.exports  =  { verifyPermissions }