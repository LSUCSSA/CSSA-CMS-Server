
module.exports = {
  async sendNotification(data){

  },
  async setNotification2DB(uid, data){
      const notification = await strapi.query("notification").create(data);
      this.sendNotification(notification);
  }
};
