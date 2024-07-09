const { subDays } = require ("date-fns")

const  { StatusCodes, getReasonPhrase } = ("http-status-codes");
const  AppError = ("../middlewares/errors/BaseError");
const   {
  MessageServiceLayer,
} = ("../services/messageService");
const  AppResponse = ("../utils/helpers/AppResponse");
const  { ChatServiceLayer } = ("../services/chatService")
const  { retryTransaction } = ("../utils/helpers/retryTransaction");
const  { sortRequest } = ("../utils/helpers/sortQuery");
const  { isNotAuthorizedToPerformAction } = ("../utils/helpers/isAuthorizedForAction");
const  { readJSON } = ("../../responsehandler");
// const  redisClient = ("../services/redis";

class MessageController {

  constructor(service) {
    this.message = service;
  }
  //TODO Move to websocket server
  async createMessage(res, req) {

    const data = readJSON(res)
    const user = req.user
    const role = req.role

    //Check that user is part of this chat , otherwise throw error

    //TODO : Cache the users within a chat so we can easily validate a request against the user

  
    // let chatData =  IChat[] 

    //  const data = await redisClient.get(`${chatId}`) {

     
    //The transaction function
    const createMessageSession = async (
      args,
      session
    ) => {
      const response = await session.withTransaction(async () => {
        const { chatId } = args.data;

        const chat = await ChatServiceLayer.getSingleChat({
          query: { _id: chatId },
          select: "users",
        });


        if (!chat)
          throw new AppError(
            getReasonPhrase(StatusCodes.NOT_FOUND),
            StatusCodes.NOT_FOUND
          );

        if (
          !chat?.users?.includes(new Types.ObjectId(user?.toString())) &&
          isNotAuthorizedToPerformAction(req)
        )
          throw new AppError(
            getReasonPhrase(StatusCodes.FORBIDDEN),
            StatusCodes.FORBIDDEN
          );

        const createdMessage = await this.Message.createMessage(
          {
            chatId: new Types.ObjectId(args.data.chatId),
            body: args.data.body,
            sentBy: new Types.ObjectId(args.data.sentBy),
          },
          session
        );

        //Update the chat with the newly created message as latest message

        const updatedChat = await ChatServiceLayer.updateChat({
          docToUpdate: {
            _id: data.chatId,
          },
          updateData: {
            $set: {
              latestMessage: createdMessage[0]._id,
            },
          },
          options: { session, new: false },
        });

        if (!updatedChat)
          throw new AppError(
            getReasonPhrase(StatusCodes.BAD_REQUEST),
            StatusCodes.BAD_REQUEST
          );

        return createdMessage[0];
      });

      return response;
    };

    const response = await retryTransaction(createMessageSession, 1, {
      data,
      role,
      user
    });

    return AppResponse(req, res, StatusCodes.CREATED, {
      message: "Message created successfully",
      data: response,
    });
  }

  async getMessages(req,  res) {
    const data  = readJSON(res);

    const matchQuery = {};

    if (data?.chatId) {
      matchQuery.chatId = { $eq: data.chatId };
    }

    if (data?.userId) {
      matchQuery.sentBy = { $eq: data.userId }
    }

    if (data?.dateFrom) {
      matchQuery.createdAt = { $gte: new Date(data.dateFrom ?? subDays(new Date(), 7)), $lte: data?.dateTo ?? new Date(Date.now()) };
    }

    const sortQuery  = sortRequest(data?.sort);

  

    if (data?.cursor) {
      const orderValue = Object.values(sortQuery)[0] 

      const order =
        orderValue === 1 ? { $gt: data.cursor } : { $lt: data?.cursor };

      matchQuery._id = order;
    }

    const query = {
      query: matchQuery,
      aggregatePipeline: [
        sortQuery,
        { $limit: 101 },
        {
          $lookup: {
            from : "users",
            localField: "sentBy",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  avatar: 1,
                  _id: 1,
                },
              },
            ],
            as: "$sender",
          },
        },
        {
          $unwind: "$$sender",
        },
        {
          $unset: "$sentBy",
        },
      ],
      pagination: { pageSize: 100 },
    };

    const result = await this.Message.findMessages(query);

    const hasData = result?.data?.length === 0;

    return AppResponse(
 
      hasData ? StatusCodes.OK : StatusCodes.NOT_FOUND,
      {
        message: hasData
          ? `Messages  retrieved succesfully`
          : `No messages were found for this request `,
        data: result,
      }
    );
  }

  //TODO Move to websocket server
  // async updateMessageDeliveryStatus(messageId: string) {
  

  //   const updatedMessage = await this.Message.updateMessage({
  //     docToUpdate: { _id: messageId },
  //     updateData: {
  //       $set: {
  //         deliveredAt: new Date(),
  //       },
  //     },
  //     options: { new: true, select: "_id" },
  //   });

  //   if (!updatedMessage)
  //     throw new AppError(
  //       getReasonPhrase(StatusCodes.BAD_REQUEST),
  //       StatusCodes.BAD_REQUEST
  //     );

  //   return updatedMessage;
  // }




  async deleteMessages(res, req) {
    const data  = readJSON(res);

    const { messageIds } = data;

    if (messageIds.length === 0)
      throw new AppError(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );

    const deletedMessages = await this.Message.deleteMessages (messageIds);

    return AppResponse( StatusCodes.OK, {
      message: `${deletedMessages.deletedCount} chats deleted.`,
    });
  }
}

const Message = new MessageController(MessageServiceLayer);

module.exports=  Message;
