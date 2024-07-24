
const admin = require("firebase-admin")

const serviceAccount =  process.env.GOOGLE_SERVICE_ACCOUNT_FILE_ADDRESS 


admin.initializeApp({

    credential: admin.credential.cert(serviceAccount)

});

const notificationFCM =  admin.messaging()

module.exports  =  notificationFCM