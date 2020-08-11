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
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    const data = await JSON.parse(ctx.request.body);
    if (ctx.is('multipart')) {
      const {data, files} = parseMultipartData(ctx);
      entity = await strapi.services["join-application"].create(data, {files});
    } else {
      const userWithSameEmail = await strapi.services["join-application"].find({email: data.email});
      if (userWithSameEmail) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.email.taken',
            message: 'Email already taken.',
            field: ['email'],
          })
        );
      }
      entity = await strapi.services["join-application"].create(data);
    }
    return sanitizeEntity(entity, {model: strapi.models["join-application"]});
    }
  };
