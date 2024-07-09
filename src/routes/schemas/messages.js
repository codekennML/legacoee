
const z =  require("zod")

 const dateSeekSchema =  z.object({ 
    dateFrom :z.optional(z.date())  ,
     dateTo: z.optional(z.date())
  }
  )


const messageSchema  =  z.object({ 
    body:z.string(), 
    // deliveredAt? : Date, 
    chatId : z.string(), 
    sentBy : z.string()
})
 
const getMessagesSchema =  dateSeekSchema.extend({
    chatId : z.string(),
    cursor : z.string().optional(),
    sort : z.string().optional(), 
    userId : z.string().optional()
})

const deleteMessagesSchema =  z.object({
     messageIds : z.array(z.string())
})


module.exports  =  { deleteMessagesSchema,  getMessagesSchema,  messageSchema}