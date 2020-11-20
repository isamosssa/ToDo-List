require("dotenv").config();

const {Pool} = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgres://${process.env.DB_user}:${process.env.DB_Password}@${process.env.DB_host}:${process.env.Db_Port}/${process.env.DB_database}`;

const pool = new Pool(
{
    connectionString: isProduction? process.env.DATABASE_URL:connectionString
});
console.log(connectionString)


module.exports = {pool};