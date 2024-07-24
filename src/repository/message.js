const Message = require("../model/message")
const DBLayer = require("./index")


class MessageRepository {


  constructor(model) {
    this.messageDBLayer = new DBLayer(model);
  }

  async createMessage(
    request,
    session
  ) {
    let createdMessages = [];

    createdMessages = await this.messageDBLayer.createDocs([request], session);

    return createdMessages;
  }

  async returnPaginatedMessages(request) {
    const paginatedMessages = await this.messageDBLayer.paginateData(request);

    return paginatedMessages;
  }

  async findMessageById(request) {
    const document = await this.messageDBLayer.findDocById(request);
    return document;
  }

  async updateMessage(request) {
    const updatedMessage = await this.messageDBLayer.updateDoc({
      docToUpdate: request.docToUpdate,
      updateData: request.updateData,
      options: request.options,
    });

    return updatedMessage;
  }


  async deleteMessages(request) {
    return await this.messageDBLayer.deleteDocs(request)
  }

  //   async updateManyMessages(request: updateManyQuery<MessageModel>) {
  //     const result = await this.messageDBLayer.updateManyDocs(request);

  //     return result;
  //   }


}

const MessageDataLayer = new MessageRepository(Message);

module.exports = { MessageDataLayer }

