/**
 * Send an error JSON
 *  - response object
 * @param code - status code
 * @param message - error message
 * @returns {Object} - JSON response
 */
const errorResMsg = (code, message) => {
  error : true, 
  message,
  code
};

/**
 * Success JSON to be sent
 * @param code - status code
 * @param responseData - data to be sent, it requires a message object
 * @returns {Object} - JSON response
 */
const successResMsg = (code, responseData) => {
  const { message, data } = responseData;
  return{
    code,
    message,
    data
};
}
/**
 * Success JSON to be sent

 * @param code - status code
 * @param responseData - data to be sent, it requires a message object
 * @returns {Object} - JSON response
 */
const customResMsg = ( code,  responseData) => {
  const { message, data } = responseData;
return {
    message,
    data,
    code
  }
};

const redirect = (res, url) => res.status(302).redirect(url);

module.exports = {
  errorResMsg, successResMsg, customResMsg, redirect
};
