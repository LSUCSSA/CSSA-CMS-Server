
module.exports = async() =>{
  const io = require('socket.io')(strapi.server);
  const cssaIO = io.of('/cssa');
  const publicIO = io.of('/public');
  io.on('connection', s => {
    strapi.io = io;
  });
  cssaIO.on('connection', async socket => {
    console.log("cssa connect")
    try{
      const uid = socket.handshake.query.userID;
      const user = await strapi.plugins['users-permissions'].services.user.fetch({
        id: uid,
      });
      if("client_socket_id" in user && user.client_socket_id){
        await strapi.query('client-Socket-ID').update({id: user.client_socket_id.id}, {socketID: socket.id})
      }else{
        await strapi.query('client-Socket-ID').create({socketID: socket.id, user: uid});
      }
    }catch (e) {
      console.log(e.stack)
    }
    strapi.cssaIO = cssaIO;

  });
  publicIO.on('connection', s => {
    strapi.publicIO = publicIO;
  });
};
