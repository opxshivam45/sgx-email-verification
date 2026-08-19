require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the frontend folder (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Mount API routes under /api
app.use('/api', apiRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
