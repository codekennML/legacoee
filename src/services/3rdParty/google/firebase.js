
import * as admin from "firebase-admin"
import { GOOGLESERVICEACCOUNTFILE } from '../../../config/constants/notification';

const serviceAccount = GOOGLESERVICEACCOUNTFILE

admin.initializeApp({

    credential: admin.credential.cert(serviceAccount)

});


export const notificationFCM = admin.messaging()