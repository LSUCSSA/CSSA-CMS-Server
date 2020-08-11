'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const shortid = require("shortid");
const {normalize, schema} = require("normalizr");

module.exports = {
  async find(ctx) {
    const appendAttributes = list =>
      list.map(card => ({
        color: "white",
        _id: shortid.generate(),
        ...card
      }));
    let boards;
    boards = await strapi.services["event-kanban"].find();
    if (boards.kanbanData === null || boards.kanbanData === undefined) {
      boards = await strapi.services["event-kanban"].createOrUpdate({
        kanbanData: JSON.parse(JSON.stringify({
          "lanes": [
            {
              "id": "GOAL",
              "title": "目标",
              "style": {
                "width": 280,
                // "backgroundColor": "rgba(50,60,80,.75)"
              },
              "cards": [],
              "currentPage": 1
            },
            {
              "id": "TODO",
              "title": "代办",
              "style": {
                "width": 280,
                // "backgroundColor": "rgba(50,60,80,.75)"
              },
              "cards": [],
              "currentPage": 1
            },
            {
              "id": "WIP",
              "title": "进行中",
              "style": {
                "width": 280,
                // "backgroundColor": "rgba(50,60,80,.75)"
              },
              "cards": [],
              "currentPage": 1
            },
            {
              "id": "DONE",
              "title": "完成",
              "style": {
                "width": 280,
                // "backgroundColor": "rgba(50,60,80,.75)"
              },
              "cards": [],
              "currentPage": 1
            }
          ]
        }))
      });
      // strapi.cssaIO.emit('newKanbanData', JSON.stringify(boards.kanbanData));
    }
    ctx.send(boards);
  }
};
