const express = require("express");
const app = express();
const {pool} = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require('express-session');
const flash = require('express-flash');
var path = require('path');

const kenx = require("knex");
const db = kenx({
  client: "pg",
  connection: {
    host: process.env.DB_Host,
    user: process.env.DB_User,
    password: process.env.DB_Password,
    database: process.env.DB_Database
  }
});

const bodyParser = require("body-parser");

const passport = require("passport");
const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.use(express.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended:true}));

app.use(session ({
    secret: 'secret',
    resave: false,

    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.set("view engine", "ejs");

app.get("/", (req, res) =>
{
  res.render("login");
});

app.get("/users/login", checkAuthenticated, (req,res)=>
{
    res.render("login");
});

app.get("/users/register", checkAuthenticated, (req,res)=>
{
    res.render("register");
});

app.get("/dashboard", checkNotAuthenticated, (req,res)=> {
    console.log(req.query.sort);
    if (req.query.sort === undefined)
    {
      db.select('*').from('todo').where({responsible: global.idUser}).orderByRaw('refreshing').then(data=> {
        res.render("dashboard", {todo: data, user: req.user.login});
        })
    }
     else {
    switch (req.query.sort)
    {
      case 'Week':
        {
          db('todo').where(db.raw('responsible =? and ending between Current_Date and Current_date +7', [global.idUser])).then(data=> 
            {
            res.render("dashboard", {todo: data, user: req.user.login});
            })
        };

      case 'Future':
        {
          db.select('*').from('todo').where(db.raw('responsible =? and ending > Current_date + 7', [global.idUser])).then(data=> 
            {
            res.render("dashboard", {todo: data, user: req.user.login});
            })};
  }
  }  
  })

app.get("/users/add", checkNotAuthenticated, (req,res)=>
{
    res.render("add" );

});

app.get('/users/logout', (req,res) => {
  req.logOut();
  req.flash('success', 'You have logged out!');
  res.redirect('/users/login');
});

app.post('/users/register', async (req,res) => {
  let {fname,sname,tname,login,password, password2} = req.body;

  console.log({
      fname,sname,tname,login,password,password2
    });

  let errors = [];  

  if (!fname || !sname || !tname || !password || !password2)
  {
    errors.push({message:"Enter all fields!"});
  } 

  if (password.length < 8)
  {
    errors.push({message:"{Password at least 8 symbols!}"});
  }

  if (password != password2)
  {
    errors.push({message:"{Passwords don't match}"});
  }

  if (errors.length > 0) {
    res.render("register", {errors});
  } else {

    //Прошла валидация
    let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);


    pool.query(
      `SELECT * FROM users WHERE login = $1;`,
      [login],
      (err,results) => {
        if (err)
        {
          throw err;
        }

        if (results.rows.length >0)
        {
          errors.push({message: "User already exists with this login!"})
          res.render('./register', {errors});
        } else {
          pool.query(
            `Insert into users (fname, sname, tname, login , password, whois)
             values($1, $2, $3, $4, $5 , $6)
             returning id, password`, [fname, sname, tname, login, hashedPassword, false] ,
             (err, results => {
               if (err){
                 throw err
               }
               req.flash('success', "You are registered now!");
               res.redirect("/users/login");
             })
          )
        }
      }
    )
  }
});


app.post('/addtask', function(req,res) {
  console.log(global.idUser);
  let {header, text, starting, ending,priority, responsible  } = req.body;
  console.log(header, text, starting, ending,priority, responsible);
  console.log("IDDD", global.idUser);
  pool.query(
    `Insert into todo (header,
      text, starting, ending, refreshing,
      priority, status, creater, responsible) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [header, text, starting, ending, starting, priority, '0', global.idUser, responsible])
      req.flash('success', "Tasks inserted!");
  res.redirect("/users/add");
});

app.post('/updatetask', function(req,res) {
  let {text, ending, priority, status, refreshing, id} = req.body;
  console.log(text, ending, priority, status, refreshing, id);
  db('todo').where('id', '=', id)
  .update({text: text,
    ending: ending, 
    priority: priority,
    status: status,
    refreshing: refreshing
  }).then(res => console.log("result:", res))
  res.redirect("/dashboard");
});

app.post('/users/login', passport.authenticate('local',{
  successRedirect: "/dashboard",
  failureRedirect: "/users/login",
  failureFlash: true
})
);

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/dashboard");
    }
    next();
}

function checkNotAuthenticated(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}


app.listen(PORT, ()=>{
    console.log(`Сервер запущен на ${PORT}`);
})
