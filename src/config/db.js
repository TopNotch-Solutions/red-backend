const Sequelize = require('sequelize');
require('dotenv').config();

const host = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.DB_HOST
    : process.env.DB_HOST_PROD;

const username = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.DB_USER
    : process.env.DB_USER_PROD;

const password = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.DB_PASSWORD 
    : process.env.DB_PASSWORD_PROD;

const db = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.DB 
    : process.env.DB_PROD;


const sequelize = new Sequelize({
    host: host,
    username: username,
    password: password,
    database: db,
    dialect: 'mysql',
    pool: {
        max: 30,
        min: 0,
        acquire: 60000, // 60 seconds
        idle: 10000     // 10 seconds
    }
});

// 🟢 Pool monitoring
function monitorPool(sequelize) {
    if (!sequelize.connectionManager.pool) {
        console.warn("⚠️ Sequelize pool not initialized yet.");
        return;
    }

    const pool = sequelize.connectionManager.pool;

    setInterval(() => {
        try {
            const used = pool.borrowed || pool._count?.borrowed || 0;
            const free = pool.available || pool._count?.available || 0;
            const pending = pool.pending || pool._count?.pending || 0;
            const size = pool.size || (used + free);

            console.log(
                `[POOL STATS] used: ${used}, free: ${free}, pending: ${pending}, size: ${size}`
            );
        } catch (err) {
            console.error("Error reading pool stats:", err.message);
        }
    }, 10000); // log every 10 seconds
}

monitorPool(sequelize);

module.exports = sequelize;
