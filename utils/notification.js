const sendNotification = (socketID, data) =>{
  strapi.cssaIO.to(socketID).emit("notifications", data)
};
const setNotification2DB= async (data) =>{
  let notification = await strapi.query("notification").create(data);
  delete notification['user'];
  if ("client_socket_id" in data.user) {
    const socketID = data.user.client_socket_id.socketID;
    sendNotification(socketID, notification);
  }
};
module.exports = {
  sendNotification,
  setNotification2DB,
};
