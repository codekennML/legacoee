const { handlePostRequest } = require("../responsehandler");
const authService = require("../services/authService");
const { retryTransaction } = require("../utils/helpers/retryTransactions");

class AuthController {
  constructor(service) {
    this.authService = service;
  }

  async signup(res, req) {
    const body = handlePostRequest(res);

    const createdUser = await retryTransaction(this.authService, 1, body);

    return createdUser;
  }
}

module.exports = new AuthController(authService);
