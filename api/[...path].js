const serverless = require('serverless-http');
const { initDb } = require('../backend/db/schema');
const { createApp } = require('../backend/app');

initDb();

const app = createApp();

module.exports = serverless(app);