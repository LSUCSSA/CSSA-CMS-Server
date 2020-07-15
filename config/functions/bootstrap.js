'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/3.0.0-beta.x/concepts/configurations.html#bootstrap
 */
module.exports = async () => {
  await strapi.config.functions["wechatToken"]();
  await strapi.config.functions["fetchLatestNews"]();
  setTimeout(()=>{
    const io = require('socket.io')(strapi.server);
    io.on('connection', s => {
      // console.log("socket connect");
      s.on('volunteer accepted', msg => {
        io.emit('volunteer accepted', msg);
        // console.log("accepted?: " + msg);
      });
      s.on('pickup request', msg => {
        io.emit('pickup request', msg);
        // console.log('accepted?: ' + msg);
      });
      strapi.io = io;
    });
  }, 2000)
};
