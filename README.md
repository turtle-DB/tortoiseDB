<p align="center"><img width=100% src="/tortoiseDB-logo-1.png"></p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#features">Features</a> •
  <a href="#contributors">Contributors</a> •
  <a href="#license">License</a> •
</p>

# Overview

An easy to set-up NodeJS server and mongoDB wrapper for clients to sync to when using [turtleDB](https://github.com/turtle-DB/turtleDB). Enables offline-first applications built with turtleDB to be fully collaborative with automated document versioning, history merging, and synchonization management.

Built using [Express](https://github.com/expressjs/express) and [Mongo DB Native NodeJS Driver](https://github.com/mongodb/node-mongodb-native).

# Getting Started

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
// Create a new instance
const app = new TortoiseDB({
  // Choose database name  - defaults to 'default' if not provided
  name: 'demo',
  // Set server port - defaults to process.env.PORT if not provided
  port: 3000,
  // Provide mongodb URI - defaults to process.env.MONGODB_URI if not provided
  mongoURI: 'mongodb://localhost:27017',
  // Set batch limit - defaults to 1000 if not provided
  batchLimit: 1000
});

// Start up server
app.start();
```

# Features

- One-line simple setup
- Automatic integration with mongoDB and turtleDB
- Batching during synchronization

# Contributors

<img width=150px src="https://turtle-db.github.io/images/andrew.png">
<p><strong>Andrew Houston-Floyd - NYC</strong> - <a href="https://turtle-db.github.io">Website</a></p>
<img width=150px src="https://turtle-db.github.io/images/max.png">
<p><strong>Max Appleton - SF/Bay Area</strong> - <a href="https://maxiappleton.github.io/">Website</a></p>
<img width=150px src="https://turtle-db.github.io/images/steven.png">
<p><strong>Steven Shen - Toronto</strong> - <a href="https://rockdinosaur.github.io/">Website</a></p>

# License

This project is licensed under the MIT License.


