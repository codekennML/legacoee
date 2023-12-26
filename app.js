// require("dotenv")
const uWS = require('uWebSockets.js');


/* Minimal SSL/non-SSL example */

// const uWS = require('../dist/uws.js');
const port = 9001;

const app = uWS./*SSL*/App()

 
module.exports = { app, port, uWS }


