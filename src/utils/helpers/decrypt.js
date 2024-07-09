function decryptData(encryptedData, key, iv) {

    console.log("Mixas")
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
      let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      return decrypted;
    }
    

    module.exports =  { decryptData}