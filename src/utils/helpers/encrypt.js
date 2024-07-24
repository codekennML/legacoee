const crypto = require('crypto');
const { decryptData } = require('./decrypt');


function encryptData(data, key, hash) {

  //  const data =  JSON.parse(info)

  const decryptedData = Array.isArray(data.encryptedRouteArray) ? "[]" : decryptData(data.encryptedRouteArray, key)

  const newDataToEncrypt =
    JSON.stringify(JSON.parse(
      decryptedData).push(data.location)
    )
  console.log(newDataToEncrypt, "Siagabbs")

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(newDataToEncrypt, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  console.log(iv)
  return { iv: iv.toString('hex'), encryptedData: encrypted };
}

module.exports = { encryptData }