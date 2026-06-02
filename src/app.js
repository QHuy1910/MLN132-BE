const express = require("express");
const cors = require("cors");
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
const roomRoutes = require("./routes/roomRoutes");

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// simple request logger to help debug API calls from the front-end
app.use((req, res, next) => {
	console.log(new Date().toISOString(), req.method, req.originalUrl);
	next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// expose raw swagger JSON for debugging
app.get('/api-docs.json', (req, res) => {
	res.json(swaggerDocument);
});

// Serve simple test UI
app.use(express.static(path.join(__dirname, 'public')));

app.use("/api/rooms", roomRoutes);

// provide server config to clients (client can call to get actual server URL)
app.get('/server-config', (req, res) => {
	const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
	res.json({ serverUrl });
});

module.exports = app;
