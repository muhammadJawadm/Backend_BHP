const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
// app.use(cors({
//   origin: 'http://localhost:3000',
//   credentials: true, // optional: only if using cookies or auth headers
// }));

app.use(bodyParser.json({ limit: '10mb' }));

app.get('/api/test', (req, res) => res.send('API is working!'));


mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.log("MongoDB error:", err);
});

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(cors());