
const Client = require('./client.js');
const client = new Client(process.env.ENVIRONMENT);
client.bootstrap(process.env.NAMESPACE, process.env.ADMIN_GUID);

process.exit();
