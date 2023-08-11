const express = require('express');
const app = express();
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

require('dotenv').config()

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors())

const db = mysql.createPool({
      connectionLimit : 10,
      host            : process.env.DBHOST,
      user            : process.env.DBUSER,
      password        : process.env.DBPASSWORD,
      database        : process.env.DBNAME
    });

const saltRounds = 10;

app.post('/signup', (req, res) => {
      const username = req.body.username;
      const password = req.body.password;
      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
                  res.status(418).send(`Couldn't hash password..`)
            } else {
                  db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], 
                  (err, result) => {
                        if (err) {
                              res.status(418).send(`Couldn't save password...`)
                        } else {
                              res.send({username})
                        }
                  })
            }
      })
})

app.post('/signin', (req, res) => {
      const username = req.body.username
      const password = req.body.password
      db.query("SELECT * FROM users WHERE username = ?", [username], (err, result) => {
            if (err) {
                  res.status(418).send(err.message)
            } else if (result.length < 1) {
                  res.status(418).send(`Username doesn't match 😬`)
            } else {
                  bcrypt.compare(password, result[0].password, (err, match) => {
                        if (match) {
                              res.send({username})
                        } 
                        if (!match) {
                              res.status(418).send(`Password doesn't match 😬`)
                        }
                  })
            }
      })
})

app.get('/find-friends', (req, res) => {
      const username = req.query.user
      // select all users != friend of user or user
      db.query("SELECT u.username FROM users u WHERE u.user_id NOT IN (SELECT f.friend FROM friends f WHERE user = (SELECT u.user_id FROM users u WHERE username = ?)) AND username != ?",
      [username, username], (err, result) => {
            if (err) {
                  res.status(418).send(`An error occurred 😬`)
            }
            if (result) {
                  res.send(result)
            }
      })
})

app.post('/:id/add-friend', (req, res) => {
      const user = req.params.id
      const friend = req.body.username
      console.log({user})
      console.log({friend})
      db.query("INSERT INTO friends (user, friend) VALUES ((SELECT user_id FROM users WHERE username = ?), (SELECT user_id FROM users WHERE username = ?))",
      [user, friend], (err, result) => {
            if (err) {
                  console.log(err)
                  res.status(418).send(`An error occurred 😬`)
            }
            if (result) {
                  res.send({added: true})
            }
      })
})

app.get('/your-friends', (req, res) => {
      const user = req.query.user
      db.query("SELECT u.username FROM friends f INNER JOIN users u ON f.friend = u.user_id WHERE f.user = (SELECT user_id FROM users WHERE username = ?)",
      [user], (err, result) => {
            if (err) {
                  console.log(err)
                  res.status(418).send(`An error occurred 😬`)
            }
            if (result) {
                  res.send(result)
            }
      })
})

app.listen(8080, () => {
      console.log('server listening on port 8080')
})