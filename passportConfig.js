const LocalStrategy  = require("passport-local").Strategy;
const {pool} = require('./dbConfig');
const bcrypt = require('bcrypt');
const { authenticate } = require("passport");



function initialize (passport){
    console.log("Initilaized");

const authenticateUser = (login, password, done) =>{
    console.log(login, password);
    pool.query(
        `Select * from users where login = $1;`, [login], (err,results) => {
            if (err){
                throw err;
            }

            console.log(results.rows);

            if (results.rows.length>0) {
                const user = results.rows[0];
                global.idUser = user.id;
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err) {
                        throw err;
                    }

                    if (isMatch) {
                        //ауетенфикация пройдена, возварщаем пользователя!
                        return done(null, user);
                    } else {
                        return done(null, false, {message: "Password is incorrect"});
                    }
                });
            } else {
                return done(null, false, {message: "User with this login not registered!"});
            }
        }
    );
};


    passport.use(
        new LocalStrategy(
    {
        usernameField: "login",
        passwordField: "password"}, authenticateUser
    )
    );

    passport.serializeUser((user,done) =>{

     console.log("Serialize");   
     done(null, user.id);
    })

    passport.deserializeUser((id,done) => {
        console.log("Deserialize");   
        pool.query(
            `select * from users where id = $1;`, [id], (err,results) =>{

                if(err) {
                    return done(err);
                }
                console.log(`User ID is ${results.rows[0].id}`);
               
                return done(null,results.rows[0]);
            });


    })

}

module.exports = initialize;