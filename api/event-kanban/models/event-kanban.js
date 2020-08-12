'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#life-cycle-callbacks)
 * to customize this model
 */

module.exports = {
  lifecycles :{
    async afterUpdate(result){
      strapi.cssaIO.broadcast.emit('newKanbanData', JSON.stringify(result.kanbanData));
    }
  }
};
