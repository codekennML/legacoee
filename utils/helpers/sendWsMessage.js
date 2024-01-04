module.exports = (ws, topic, data) => {
  const message = {
    topic,
    data,
  };

  ws.send(JSON.stringify(message));
};
