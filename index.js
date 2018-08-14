const { TortoiseDB } = require('./tortoiseDB');

const db = new TortoiseDB({
  name: 'demo',
  port: 3000,
  mongoURI: 'mongodb://localhost:27017'
});

db.start();