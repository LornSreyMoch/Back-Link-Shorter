const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const crudapi = require('./routes/crud-api');
const register = require('./routes/register'); 



const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/admin', crudapi);
app.use('/api/register', register);

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
module.exports = app;