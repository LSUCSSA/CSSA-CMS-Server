'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const {parseMultipartData, sanitizeEntity} = require('strapi-utils');
const formatError = error => [
  {messages: [{id: error.id, message: error.message, field: error.field}]},
];

module.exports = {
  async create(ctx) {
    const {id} = ctx.state.user;
    const request = await strapi.services["pickup-requests"].create({...ctx.request.body});
    const role = await strapi
      .query('role', 'users-permissions')
      .findOne({type: "requester"}, []);

    if (!role) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.role.notFound',
          message: 'Impossible to find the default role.',
        })
      );
    }
    const user = await strapi.query("user", "users-permissions").update({id}, {
      ...ctx.request.body,
      pickup_requests: [request.id],
      role: role.id
    })
    ctx.send({
      message: '系统已收到你的接机请求, 请耐心等待志愿者接受你的请求',
      name: user.name,
    })
  },
  async requestStatus(ctx) {
    const request = await strapi.services["pickup-requests"].findOne({user: ctx.state.user})
    if(!request){
      ctx.send({message: "No ongoing request."})
    }else{
      ctx.send({status : request.status});
    }

  },
  async cancelRequest(ctx) {
    const request = await strapi.services["pickup-requests"].find({user: ctx.state.user});
    const isAllCompleted = request.every((e) => request.isCompleted);
    if (isAllCompleted) {
      ctx.send({message: "No ongoing request."});
    }
    const {name} = ctx.state.user;
    const status = await JSON.parse(request[0].status);
    await strapi.services["pickup-requests"].update({id: request[0].id}, {
      ...request[0],
      isCompleted: true,
      status: JSON.stringify([`您已取消了本次接机申请 ${new Date().toLocaleString()}`].concat(status))
    })
    ctx.send({message: "success"});
  }
};
