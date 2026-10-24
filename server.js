const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!MONGODB_URI || !JWT_SECRET || JWT_SECRET.length < 32 || !ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
  console.error('Missing configuration. Copy .env.example to .env and set all required values.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled because this template uses Google Fonts and inline style attributes.
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }));

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  service: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['new', 'in_progress', 'closed'], default: 'new' }
}, { timestamps: true });

const internshipSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  track: { type: String, required: true, trim: true, maxlength: 100 },
  skills: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ['new', 'reviewing', 'contacted', 'closed'], default: 'new' }
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);
const Internship = mongoose.model('Internship', internshipSchema);

const cleanString = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'AstraFlint API' }));

app.post('/api/contact', asyncRoute(async (req, res) => {
  const name = cleanString(req.body.name, 100);
  const email = cleanString(req.body.email, 254).toLowerCase();
  const service = cleanString(req.body.service, 100);
  const message = cleanString(req.body.message, 5000);
  if (name.length < 2 || !validEmail(email) || service.length < 2 || message.length < 5) {
    return res.status(400).json({ message: 'Please provide a valid name, email, service and project message.' });
  }
  await Contact.create({ name, email, service, message });
  return res.status(201).json({ message: 'Enquiry saved successfully.' });
}));

app.post('/api/internships', asyncRoute(async (req, res) => {
  const name = cleanString(req.body.name, 100);
  const email = cleanString(req.body.email, 254).toLowerCase();
  const track = cleanString(req.body.track, 100);
  const skills = cleanString(req.body.skills, 3000);
  if (name.length < 2 || !validEmail(email) || track.length < 2 || skills.length < 3) {
    return res.status(400).json({ message: 'Please complete all application fields with valid information.' });
  }
  await Internship.create({ name, email, track, skills });
  return res.status(201).json({ message: 'Application saved successfully.' });
}));

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Admin login required.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' || decoded.sub !== ADMIN_EMAIL) throw new Error('Invalid role');
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

app.post('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), asyncRoute(async (req, res) => {
  const email = cleanString(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const ok = email === ADMIN_EMAIL && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ message: 'Incorrect email or password.' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { subject: ADMIN_EMAIL, expiresIn: '2h', issuer: 'astraflint' });
  res.json({ token, expiresIn: 7200 });
}));

app.get('/api/admin/summary', requireAdmin, asyncRoute(async (req, res) => {
  const [contacts, internships, newContacts, newInternships] = await Promise.all([
    Contact.countDocuments(), Internship.countDocuments(),
    Contact.countDocuments({ status: 'new' }), Internship.countDocuments({ status: 'new' })
  ]);
  res.json({ contacts, internships, newContacts, newInternships });
}));

app.get('/api/admin/contacts', requireAdmin, asyncRoute(async (req, res) => {
  const items = await Contact.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items });
}));
app.patch('/api/admin/contacts/:id', requireAdmin, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
  const status = cleanString(req.body.status, 30);
  if (!['new', 'in_progress', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const item = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Record not found.' });
  res.json({ item });
}));
app.get('/api/admin/internships', requireAdmin, asyncRoute(async (req, res) => {
  const items = await Internship.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items });
}));
app.patch('/api/admin/internships/:id', requireAdmin, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
  const status = cleanString(req.body.status, 30);
  if (!['new', 'reviewing', 'contacted', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const item = await Internship.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Record not found.' });
  res.json({ item });
}));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, req, res, next) => {
  const id = crypto.randomUUID();
  console.error(`[${id}]`, err);
  res.status(500).json({ message: 'Server error. Please try again later.', reference: id });
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`AstraFlint running at http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
