'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async update(ctx){
    let entities;
    const data = ctx.request.body;
    entities = await strapi.services.sponsors.createOrUpdate({sponsorsList: JSON.stringify(data)});
    ctx.send(entities)
  }
};
