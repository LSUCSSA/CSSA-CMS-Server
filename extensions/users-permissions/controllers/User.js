'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */
const generator = require('generate-password');
const _ = require('lodash');
const {sanitizeEntity} = require('strapi-utils');
const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const {setNotification2DB} = require('../../../utils/notification');
const moment = require('moment');
const toArray = require('stream-to-array');

const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });

const formatError = error => [
  {messages: [{id: error.id, message: error.message, field: error.field}]},
];

module.exports = {
  /**
   * Fetch Rosters not include admins
   */
  async fetchRoster(ctx, next, {populate} = {}) {
    let users;

    if (_.has(ctx.query, '_q')) {
      // use core strapi query to search for users
      users = await strapi
        .query('user', 'users-permissions')
        .search(ctx.query, populate);
    } else {
      users = await strapi.plugins['users-permissions'].services.user.fetchAll(
        ctx.query,
        populate
      );
    }
    const data = users.map(u => {
      const users = sanitizeUser(u);
      if(users.publicPhoto){
        return {
          id: u.id,
          name: users.name,
          email: users.email,
          department: users.department,
          position: users.position,
          points: users.points,
          publicPhoto: users.publicPhoto.url,
        }
      }
      return {
        id: u.id,
        name: users.name,
        email: users.email,
        department: users.department,
        position: users.position,
        points: users.points,
      }
    });

    ctx.send(data)
  },
  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx) {
    const advanced = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const { email, username, password, role } = ctx.request.body;

    if (!email) return ctx.badRequest('missing.email');

    // const userWithSameUsername = await strapi
    //   .query('user', 'users-permissions')
    //   .findOne({ username });
    //
    // if (userWithSameUsername) {
    //   return ctx.badRequest(
    //     null,
    //     formatError({
    //       id: 'Auth.form.error.username.taken',
    //       message: 'Username already taken.',
    //       field: ['username'],
    //     })
    //   );
    // }

    if (advanced.unique_email) {
      const userWithSameEmail = await strapi.query('user', 'users-permissions').findOne({ email });

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
    }
    let user = {
      ...ctx.request.body,
      provider: 'local',
    };
    if(!password){
      const tempPass = await generator.generate({
        length: 10,
        numbers: true,
        excludeSimilarCharacters: true
      });
      user = {
        ...ctx.request.body,
        password: tempPass,
        provider: 'local',
      };
    }


    if (!role) {
      const defaultRole = await strapi
        .query('role', 'users-permissions')
        .findOne({ type: advanced.default_role }, []);

      user.role = defaultRole.id;
    }

    try {
      const data = await strapi.plugins['users-permissions'].services.user.add(user);

      ctx.created(sanitizeUser(data));
    } catch (error) {
      ctx.badRequest(null, formatError(error));
    }
  },
  /**
   * Bulk create users
   */
  async bulkCreate(ctx) {
    const advanced = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const rosterFile = ctx.request.files.file;
    if (rosterFile.size !== 0) {
      const rosterBuffer = await toArray(fs.createReadStream(rosterFile.path));
      const rosterCsv = parse(rosterBuffer[0], {from_line: 4});
      if (!rosterCsv) {
        return ctx.badRequest({
          status: 'fail',
          message: "error reading csv file"
        })
      }
      if (!rosterCsv[0] || rosterCsv[0].indexOf('First Name') <= -1 || rosterCsv[0].indexOf('Last Name') <= -1) {
        return ctx.send({status: 'fail', message: '文件格式不正确, 缺少First Name或Last Name列'})
      }
      const userData = rosterCsv.slice(1, rosterCsv.length);
      const firstNameIndex = rosterCsv[0].indexOf('First Name');
      const lastNameIndex = rosterCsv[0].indexOf('Last Name');
      const emailIndex = rosterCsv[0].indexOf('Campus Email');
      let bulkData = [];

      const defaultRole = await strapi
        .query('role', 'users-permissions')
        .findOne({type: advanced.default_role}, []);

      for (const user of userData) {
        const email = user[emailIndex];
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        const isValidEmail = re.test(String(email).toLowerCase());
        if(!isValidEmail) continue;

        const userWithSameEmail = await strapi
          .query('user', 'users-permissions')
          .findOne({email});
        if (!userWithSameEmail) {
          try {
            const tempPass = await generator.generate({
              length: 10,
              numbers: true,
              excludeSimilarCharacters: true
            });
            let data = await strapi.plugins['users-permissions'].services.user.add(
              {
                email,
                password: tempPass,
                role: defaultRole.id,
                provider: 'local',
                username: user[firstNameIndex] + user[lastNameIndex],
                name: `${user[firstNameIndex]} ${user[lastNameIndex]}`,
                position: 'member'
              }
            );
            if (data) {
              data = sanitizeUser(data);
              //TODO sub out the fixed email
              // await strapi.plugins['email'].services.email.send({
              //   to: data.email,
              //   from: 'contact@lsucsssa.org',
              //
              // });
              bulkData.push(data)
            }
          } catch (error) {
            console.log(error);
            ctx.badRequest({
              status: 'fail'
            })
          }
        }
      }
      if (bulkData) {
        ctx.send({status: "success", data: bulkData})
      }
    } else {
      ctx.badRequest({
        status: 'fail'
      })
    }
  },
  async bulkDestroy(ctx){
    const { ids } = ctx.request.body;
    const data = await ids.map(async id=>{
      const user = await strapi.plugins['users-permissions'].services.user.remove({ id });
      return sanitizeUser(user);
    });
    ctx.send(data);
  },
  async getPositionList(ctx) {
    const contentType = strapi.contentTypes['plugins::users-permissions.user'];
    if (!contentType) {
      return ctx.send({error: 'contentType.notFound'}, 404);
    }
    const contentTypeService = strapi.plugins['content-type-builder'].services.contenttypes;
    const userAttributes = contentTypeService.formatContentType(contentType).schema.attributes;
    ctx.send({position: userAttributes.position.enum, department: userAttributes.department.enum})
  },
  /**
   * Update a/an user record.
   * @return {Object}
   */
  async update(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const { id } = ctx.params;
    const { email, username, password } = ctx.request.body;

    const user = await strapi.plugins['users-permissions'].services.user.fetch({
      id,
    });

    if (_.has(ctx.request.body, 'email') && !email) {
      return ctx.badRequest('email.notNull');
    }

    if (_.has(ctx.request.body, 'username') && !username) {
      return ctx.badRequest('username.notNull');
    }

    if (_.has(ctx.request.body, 'password') && !password && user.provider === 'local') {
      return ctx.badRequest('password.notNull');
    }

    if (_.has(ctx.request.body, 'username')) {
      const userWithSameUsername = await strapi
        .query('user', 'users-permissions')
        .findOne({ username });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.username.taken',
            message: 'username.alreadyTaken.',
            field: ['username'],
          })
        );
      }
    }

    if (_.has(ctx.request.body, 'email') && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi.query('user', 'users-permissions').findOne({ email });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.email.taken',
            message: 'Email already taken',
            field: ['email'],
          })
        );
      }
    }

    let updateData = {
      ...ctx.request.body,
    };

    if (_.has(ctx.request.body, 'password') && password === user.password) {
      delete updateData.password;
    }

    // check weather should promote
    if(user.position === "member" && updateData.position !== "member"){
      const translate = {
        chair: '部长',
        viceChair: '副部长',
        member: '成员',
        Presidents: '主席',
        IT: '网络技术部',
        Media: '新闻媒体部',
        PR: '外联公关部',
        EP: '活动策划部',
        Treasure: '财务部',
        Secretary: '秘书团',
      };
      const message = {title: `你已被提升为${translate[updateData.department]+translate[updateData.position]}!`};
      const data = {user:sanitizeUser(user), type: "notification", datetime: moment(), ...message, read: false};

      await setNotification2DB(data);
    }

    const data = await strapi.plugins['users-permissions'].services.user.edit({ id }, updateData);

    ctx.send(sanitizeUser(data));
  },

};
