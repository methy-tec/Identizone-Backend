import { Sequelize } from 'sequelize';

// ⚠️ Remplace ces valeurs par les tiennes
const DB_NAME = 'identizone';
const DB_USER = 'root';
const DB_PASSWORD = '';
const DB_HOST = 'localhost'; // ou 'localhost'
const DB_PORT = 3306;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: console.log, // pour voir les requêtes SQL dans la console
});

export default sequelize;
