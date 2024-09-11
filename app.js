const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const crudapiRouter = require('./routes/crud-api');
const registerRouter = require('./routes/register');
const customAliasesRouter = require('./routes/custom-aliases');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/admin', crudapiRouter);
app.use('/api/register', registerRouter);
app.use('/api', customAliasesRouter);
const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
