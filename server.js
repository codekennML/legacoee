
require('dotenv').config()
const {app, port } =  require("./app");
const AppError = require("./middlewares/errors/BaseError");
const baseRoutesHandler  =  require("./routes/base")
const responseHandler =  require("./utils/responsehandler")

app
.get("/health", responseHandler(baseRoutesHandler.baseRoutes.checkHealth)).post("/polyline", responseHandler(baseRoutesHandler.baseRoutes.convertLocationS2cellId))


.listen(port, (token) => {
  if (token) {
    console.log("Hiiii", token)
    console.log('Listening to port ' + port);
  } else {
    console.log('Failed to listen to port ' + port);
  }
});