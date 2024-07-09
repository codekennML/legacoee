

const AppError =  require('../errors/BaseError');
const { StatusCodes, getReasonPhrase } =  require('http-status-codes'
)

const validateRequest = (schema) => {
 return async (res, req) => {
    try {

        let request = {}; // Initialize request as an empty object

        const queries = [req.params, req.body, req.query];
        console.log(queries)
        // Filter to find the first non-empty object in queries
        const data = queries.find(info => Object.keys(info).length > 0);
        
        if (data) {
            // Merge properties of `data` into `request`
            request = { ...request, ...data };
        }
        

        // Assuming `schema` is defined somewhere and expects `request` as an object
        schema.parse(request);
   

    } catch (error  ) {

       
   
        throw new AppError(getReasonPhrase(StatusCodes.BAD_REQUEST), StatusCodes.BAD_REQUEST, "", error.errors)
   
    }
}
}


module.exports =  validateRequest;
