const userModel = require("../model/user");
const sharedModel = require("./shared/index");

class UserRepository {
  constructor(model) {
    this.model = model;
  }

  async createUser(userData, session) {
    const { avatar, phone_number, first_name, last_name, birthDate } = userData;

    const createdUser = await sharedModel.createDoc(
      { avatar, phone_number, first_name, last_name, birthDate },
      session
    );

    return createdUser;
  }

  async findUsers(query, select, session, populatedQuery) {
    const users = await sharedModel.findDocs(
      {
        body: query,
        select,
      },
      this.model,
      session,
      populatedQuery
    );

    return users;
  }
}

module.exports = new UserRepository(userModel);
