const { MessageDataLayer } = require("../repository/message")


class MessageService {

  constructor(service) {
    this.message = service;
  }

  async createMessage(request, session) {
    const message = await this.message.createMessage(request, session);

    return message; //tThis should return an array of one message only
  }

  async findMessages(request) {
    return this.message.returnPaginatedMessages(request);
  }

  async getMessageById(request) {
    const message = await this.message.findMessageById(request);

    return message;
  }

  async updateMessage(request) {
    return await this.message.updateMessage(request);
  }

  async deleteMessages(request) {

    const deletedMessages = await this.message.deleteMessages(request)

    return deletedMessages

  }
}

const MessageServiceLayer = new MessageService(MessageDataLayer);

module.exports = MessageServiceLayer;
