
const z =  require("zod")

const chatSchema  =  z.object({ 
    latestMessage :z.string().optional(), 
    users : z.array(z.string()), 
    status : z.union([z.literal("completed"),  z.literal("open")]).optional(), 
    tripId : z.string(), 
    rideId : z.string()
})
 
const getChatSchema =  z.object({
userId : z.string().optional(), 
dateFrom : z.date().optional(),
dateTo : z.date().optional(),
cursor : z.string().optional(), 
sort : z.string().optional()
})


 const getChatByRideIdSchema =  z.object({
    id : z.string()
})


 const getChatByIdSchema =  z.object({ 
    id : z.string()
})

 const endChatSchema =  z.object({
    chatId : z.string()
}) 


 const deleteChatSchema = z.object({
    chatIds : z.array(z.string())
})

module.exports =  {
    chatSchema, 
    deleteChatSchema, 
    getChatByIdSchema,
    getChatByRideIdSchema,
    endChatSchema,
    getChatSchema
}
