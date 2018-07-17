const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Hello world!'));

// This gets one object
app.get('/store/:id', (req, res) => {

});

app.route('/store')
  .get((req, res) => {

  })
  .post((req, res) => {
    
  })
  .put((req, res) => {

  })

//Node env object's production port or local 3000
app.listen(process.env.PORT || 3000);
