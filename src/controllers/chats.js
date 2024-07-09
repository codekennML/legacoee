
const  { ChatServiceLayer } = require("../services/chatService")
const  AppResponse = require("../utils/helpers/AppResponse");
const  { StatusCodes, getReasonPhrase } = require("http-status-codes");
const  User = require("../model/user");
const  AppError = require("../middlewares/errors/BaseError");
const  { Types } = require("mongoose");
const  Message = require("../model/message");
const  { sortRequest } = require("../utils/helpers/sortQuery");
const  { readJSON } = require("../../responsehandler");
const  { subDays } = require("date-fns");
const { ROLES } = require("../config/enums");

class ChatController {


  constructor(chat) {
    this.chat = chat;
  }

  async createNewChat(res, req) {
    //create  a chat immediately for a live trip or ride , create a chat once the trip has started for a scheduled trip/ride, this is because a trip scheduled in 7 days should not have a chat 7 days prior
    const data = readJSON(res);

    const createdChat = await this.chat.createChat({
      ...data,
      status: "open",
    });

    return AppResponse(req, res, StatusCodes.CREATED, {
      message: "Chat created successfully",
      data: createdChat,
    });
  }

  async getChatByRideId(res, req) {
    const rideId = req.params.rideId;
    const user = req.user;
 

    const chat = await this.chat.getSingleChat({
      query: { rideId },
      select: "users latestMessage",
      populatedQuery: [
        {
          path: "users",
          select: "firstname lastname avatar _id ",
          model: User,
        },
        {
          path: "latestMessage",
          select: "body createdAt",
          model: Message,
        },
      ],
    });

    if (!chat)
      throw new AppError(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );

    const chatUsers = chat.users.map((user) => user);
 
 

    if (
      !chatUsers.includes(new Types.ObjectId(user.toString()) && Object.values(ROLES).includes(role))
    )
      throw new AppError(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );

    return AppResponse(StatusCodes.OK, {
      message: "Chat retrieved successfully",
      data: chat,
    });
  }

  async getChats(res, req) {

    const data  = readJSON(res);

    const matchQuery = {};


    if(data?.userId) {
       matchQuery.users  =  {  $in : data.userId}
    }

    if (data?.dateFrom) {
      matchQuery.createdAt = { $gte: new Date(data.dateFrom ?? subDays(new Date(),  7)), $lte: new Date(data?.dateTo) ?? new Date(Date.now()) };
    }

 
    const sortQuery = sortRequest(data?.sort);

    if (data?.cursor) {
      const orderValue = Object.values(sortQuery)[0] 

      const order =
        orderValue === 1 ? { $gt: data.cursor } : { $lt: data?.cursor };

      matchQuery._id = order;
    }

    const query = {
      query: matchQuery,
      aggregatePipeline: [{ $limit: 101 }, sortQuery],
      pagination: { pageSize: 100 },
    };

    const result = await this.chat.getPaginatedChats(query)

    const hasData = result?.data?.length && result.data.length > 0;

    return AppResponse(
     
      hasData ? StatusCodes.OK : StatusCodes.NOT_FOUND,
      {
        message: hasData
          ? `Chats retrieved succesfully`
          : `No chats were found for this request `,
        data: result,
      }
    );
  }

  async getChatById(res, req ) {
    const { id } = req.params;
    const user = req.user;
 

    const chat = await this.chat.getSingleChat({
      query: { _id: id },
      select: "users latestMessage status",
      populatedQuery: [
        {
          path: "users",
          select: "firstname lastname avatar _id ",
          model: User,
        },
        {
          path: "latestMessage",
          select: "body createdAt",
          model: Message,
        },
      ],
    });

    if (!chat)
      throw new AppError(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );

    const chatUsers = chat.users.map((user) => user._id);

    const isImpostor =  isNotAuthorizedToPerformAction(req)

    if (
      !chatUsers.includes(new Types.ObjectId(user.toString())) &&
      isImpostor
    )
      throw new AppError(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );

    return AppResponse(StatusCodes.OK, {
      message: "Chat retrieved successfully",
      data: chat,
    });
  }

  async endChat(res, req) {
    const { chatId } = readJSON(res);
    const user = req.user;

    const chat = await this.chat.getSingleChat({
      query: { _id: chatId },
      select: "users",
    });

    const isImpostor =  isNotAuthorizedToPerformAction(req)

    if (
      !chat?.users.includes(new Types.ObjectId(user.toString())) &&
     isImpostor
    )
      throw new AppError(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );

    const endedChat = await this.chat.updateChat({
      docToUpdate: {
        _id: chatId,
      },
      updateData: {
        $set: {
          status: "closed",
        },
      },
      options: {
        new: true,
        select: "_id status",
      },
    });

    if (!chat)
      throw new AppError(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );

    return AppResponse(StatusCodes.OK, {
      message: `Chat ${chatId} ended successfully`,
      data: endedChat,
    });
  }

  async deleteChats(res,  req ) {
    const data  = readJSON(res);

    const { chatIds } = data;

    if (chatIds.length === 0)
      throw new AppError(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );

    const deletedChats = await this.chat.deleteChats(chatIds);

    return AppResponse(StatusCodes.OK, {
      message: `${deletedChats.deletedCount} chats deleted.`,
    });
  }

}

const Chats = new ChatController(ChatServiceLayer);

module.exports =  Chats;
