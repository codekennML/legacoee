const axios = require("axios");

const createAxiosInstance = (config) => {
  //config = {
  //baseURL , timeout , headers
  //   }

  return axios.create(config);
};

module.exports = createAxiosInstance;
