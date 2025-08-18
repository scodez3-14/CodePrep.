
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import User from './models/User.js';
import nodemailer from 'nodemailer';
// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // set in .env
    pass: process.env.EMAIL_PASS  // set in .env
  }
});


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

// Register with OTP
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    const user = new User({ email, password, solved: [], solvedDates: [], recent: [], otp, otpExpires });
    await user.save();

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your CodePrep Signup OTP',
      text: `Your OTP for CodePrep signup is: ${otp}. It is valid for 10 minutes.`
    });

    res.status(201).json({ message: 'OTP sent to email', user: { email: user.email }, otpRequired: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login (no OTP)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    // Check if user has unverified OTP (not completed signup)
    if (user.otp && user.otpExpires && user.otpExpires > new Date()) {
      return res.status(403).json({ error: 'Please verify your email with the OTP sent during signup.' });
    }
    res.json({ message: 'Login successful', user: { email: user.email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// OTP verification endpoint (for signup)
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.otp || !user.otpExpires) return res.status(400).json({ error: 'No OTP requested' });
    if (user.otp !== otp) return res.status(401).json({ error: 'Invalid OTP' });
    if (user.otpExpires < new Date()) return res.status(401).json({ error: 'OTP expired' });

    // OTP is valid, clear it
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'OTP verified, signup successful', user: { email: user.email } });
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
