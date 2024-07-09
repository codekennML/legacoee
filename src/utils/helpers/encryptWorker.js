
const { parentPort, workerData } = require('worker_threads');

const { encryptData } =  require("./encrypt")

if(workerData && workerData?.data &&  workerData?.key){

  try {
    const { data, key } = workerData;
    console.log("dataKey", data, key)
    const encrypted = encryptData(data, key);
    console.log(encrypted, "encrypted")
    parentPort.postMessage(encrypted);
} catch (error) {
    parentPort.postMessage({ error: error.message });
    throw error; // Re-throw the error to ensure the worker exits with an error
}

  

}



// Function to decrypt data


