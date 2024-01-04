module.exports = async (construct, serverId, data) => {
  await construct.publish(`channel:${serverId}`, message);
};
