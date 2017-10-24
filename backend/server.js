const Express = require('express');
const Datastore = require('nedb');
const bodyParser = require('body-parser');
const fetchStock = require('./stockFetcher');

const app = Express();

class user {
  constructor(name, pass) {
    this.username = name;
    this.password = pass;
    this.balance = 10000;
    this.history = [];
    this.ownedStocks = [];
  }
}

class appResponse {
  constructor() {
    this.type = null;
    this.message = null;
  }
  setType(type){
    this.type = type;
  }
  setMessage(msg){
    this.message = msg;
  }
}

class transcation {
  constructor(type, company, amount, price) {
    this.type = type;
    this.company = company;
    this.amount = amount;
    this.price = price;
  }
}
/*
  Middleware for handling POST body data
*/
app.use(bodyParser.json({extended: false}));

const db = new Datastore({filename: './database', autoload: true});

app.post('/register', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  db.find({
    username
  }, (err, doc) => {
    let responseText;
    if (doc.length === 0) {
      responseText = 'registered user';
      const newUser = new user(username, password);
      db.insert(newUser);
    } else {
      responseText = 'user already exists';
    }
    res.send(responseText);
  })
});

app.post('/login', (req, res) => {
  const {username,  password} = req.body;

  db.find({
    username
  }, (err, doc)=>{
    const response = {
      type: '',
      data: ''
    }
    if(doc.length === 0 ||doc[0].password !== password ) {
      response.type = 'error';
      response.data = 'Invalid username or password';
    } else {
      response.type = 'id';
      response.data = doc[0]._id;
    }
    res.send(response);
  })
})

app.post('/quote', (req,res)=>{
  fetchStock(req.body.symbol, (sym, price)=>{
    console.log(sym,price);
    res.send({
      sym,
      price
    })
  })
});

app.post('/buy', (req,res)=>{
  const {id, symbol, amount} = req.body;
  fetchStock(symbol, (sym, price)=>{
    const cost = price * amount;
    db.find({
      _id: id
    },(err, doc)=>{
      const userCash = doc[0].balance;
      const leftoverAmount = userCash - cost;
      const response = new appResponse();
      if(leftoverAmount < 0) {
        response.setType('Error');
        response.setMessage('Insufficient funds');
      } else {
        response.setType('Success');
        response.setMessage(`Transcation successful`);
        const transcationInfo = new transcation('BUY', sym, amount, cost);
        db.update({
          _id: id
        }, { $set: {
          balance: leftoverAmount,
        }, $push: {
          history: transcationInfo,
          ownedStocks: {
            company: sym,
            stock: amount
          }
        }}, {}, (err, numReplaced)=>{
          console.log(`Updated data ${numReplaced}`);
        })
      }
      res.send(response);
    })
  });

})
app.listen(3000);

console.log('App is listening on port 3000');
