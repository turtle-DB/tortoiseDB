# tortoiseDB

!(https://path-to-logo.png)

Some short description of our project. For example: A simple Node server and mongoDB wrapper for clients to sync to when using [TurtleDB](https://link-to-turtle-DB-github.com).

## Install

Install

```javascript
npm i tortoisedb
```

## Usage

```javascript
import TortoiseDB from 'tortoisedb';
// or
const TortoiseDB = require('tortoisedb');
```

```javascript
const TortoiseDB = require('./tortoiseDB');

// Create a new instance
const app = new TortoiseDB({
  // Choose database name
  name: 'demo',
  // Set server port
  port: 3000,
  // Provide mongodb URI
  mongoURI: 'mongodb://localhost:27017',
  // Set batch limit
  batchLimit: 1000
});

// Start up server
app.start();
```

## Features

- Many features
- So many
- The best

