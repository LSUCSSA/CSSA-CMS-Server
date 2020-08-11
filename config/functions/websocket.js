
module.exports = () =>{
  const io = require('socket.io')(strapi.server);
  const cssaIO = io.of('/cssa');
  const publicIO = io.of('/public');
  io.on('connection', s => {
    strapi.io = io;
  });
  cssaIO.on('connection', socket => {
    console.log("cssa connect")
    strapi.cssaIO = socket;

  });
  publicIO.on('connection', s => {
    strapi.publicIO = publicIO;
  });
};
