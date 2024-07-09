
const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const { model } = require('mongoose');
const { decryptData  } =  require("./decrypt")



  if(workerData && workerData?.data &&  workerData?.key){

    const { data, key } = workerData;

    console.log("decryptDataKey", data, key)
    const decrypted = decryptData(data, key);
    parentPort.postMessage(decrypted);
  }



module.exports = { decryptData }