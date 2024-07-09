
const{ ChatDataLayer } = require("../repository/chats")


class ChatService {

  constructor(service) {
    this.chat = service;
  }

  async createChat(request, session) {
    const createdChat = await this.chat.createChat(request, session);

    return createdChat;
  }

  async getSingleChat(request) {
    const chat = await this.chat.findChatById(request);

    return chat;
  }

  async getPaginatedChats(request) {
    return this.chat.returnPaginatedChats(request);
  }

  async updateChat(request) {
    const updatedChat = await this.chat.updateChat(request);
    return updatedChat;
  }

  async deleteChats(request) {
    const deletedChats = await this.chat.deleteChats(request);

    return deletedChats;
  }
}

const ChatServiceLayer = new ChatService(ChatDataLayer);

module.exports =   ChatServiceLayer
