import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import User from './models/User.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
// Allow requests from the frontend dev server or elsewhere
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected!'))
.catch(err => console.error('MongoDB connection error:', err));

/* ----------------------- ROUTES ----------------------- */

// Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = new User({ email, password, solved: [], solvedDates: [], recent: [] });
    await user.save();
    res.status(201).json({ message: 'User registered!', user: { email: user.email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', user: { email: user.email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user data
app.post('/api/user', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      email: user.email,
      solved: user.solved || [],
      solvedDates: user.solvedDates || [],
      recent: user.recent || []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update solved problems
app.post('/api/solved', async (req, res) => {
  const { email, problemId, action } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().slice(0, 10);

    if (action === 'add') {
      if (!user.solved.includes(problemId)) user.solved.push(problemId);
      if (!user.solvedDates.includes(today)) user.solvedDates.push(today);

      // Avoid duplicates in recent
      const exists = user.recent.find(r => r.name === problemId && r.date === today);
      if (!exists) user.recent.push({ name: problemId, date: today });
    } 
    else if (action === 'remove') {
      user.solved = user.solved.filter(p => p !== problemId);
      user.recent = user.recent.filter(r => r.name !== problemId);
    }

    await user.save();
    res.json({ 
      message: 'Solved data updated', 
      user: { email: user.email, solved: user.solved, solvedDates: user.solvedDates, recent: user.recent }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Use http server so we can attach an error handler for listen errors
const server = http.createServer(app);

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Make sure no other server is running on this port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
