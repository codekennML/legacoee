const userRepository = require("../repository/User");

class UserService {
  constructor(config) {
    this.user = config;
  }

  async createUser(userData, session) {
    const user = await this.user.createUser(userData, session);

    return user;
  }

  async findUsersData(request, session) {
    const { body, select, populatedQuery } = request;

    const usersArray = await this.user.findDocs(
      body,
      select,
      session,
      populatedQuery
    );

    return usersArray;
  }
}

module.exports = new UserService(userRepository);
