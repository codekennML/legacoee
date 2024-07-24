const Chat = require("../model/chat")
const DBLayer = require("./index")


class ChatRepository {


  constructor(model) {
    console.log(model)
    this.chatDBLayer = new DBLayer(model);

  }

  async createChat(
    request,
    session
  ) {
    let createdChats = [];

    createdChats = await this.chatDBLayer.createDocs([request], session);

    return createdChats;
  }

  async returnPaginatedChats(request) {
    const paginatedChats = await this.chatDBLayer.paginateData(request);

    return paginatedChats;
  }

  async findChatById(request) {
    const chat = await this.chatDBLayer.findDocById(request);
    return chat;
  }

  async findChats(request) {
    const chatData = await this.chatDBLayer.findDocs(request);
    return chatData;
  }

  async updateChat(request) {
    console.log(this.chatDBLayer)
    const updatedChat = await this.chatDBLayer.updateDoc({
      docToUpdate: request.docToUpdate,
      updateData: request.updateData,
      options: request.options,
    });

    return updatedChat;
  }

  async updateManyChats(request) {
    const result = await this.chatDBLayer.updateManyDocs(request);

    return result;
  }

  async bulkUpdateChat(request) {
    const result = await this.chatDBLayer.bulkWriteDocs(request);

    return result;
  }

  async deleteChats(request) {
    return this.chatDBLayer.deleteDocs(request);
  }
}

const ChatDataLayer = new ChatRepository(Chat);
module.exports = { ChatDataLayer }


