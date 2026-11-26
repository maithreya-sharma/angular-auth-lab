import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { users } from './users.js';

const app = express();
app.use(cors({ origin: 'http://localhost:4200' })); // only our Angular app; not '*'
app.use(express.json());                            // parses JSON bodies into req.body

const signAccess  = (u) => jwt.sign({ sub: u.id, role: u.role, email: u.email }, process.env.ACCESS_SECRET,  { expiresIn: '5m' });
const signRefresh = (u) => jwt.sign({ sub: u.id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

app.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};            // ?? {} → no crash if the body is missing

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' }); // 400 = bad request
  }

  const user = users.find((u) => u.email === email);     // look up the user by email

  // compare() re-hashes the typed password with the salt stored inside the hash
  const ok = user && (await bcrypt.compare(password, user.passwordHash));

  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' }); // same message for wrong email OR wrong password
  }

  res.json({
    accessToken: signAccess(user),    // 5 min, sent on every API call
    refreshToken: signRefresh(user),  // 7 days, only sent to /refresh
  });
});

function auth(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' '); // "Bearer eyJ..." → ["Bearer", "eyJ..."]
  if (type !== 'Bearer' || !token) return res.sendStatus(401);         // no token = not authenticated
  try {
    req.user = jwt.verify(token, process.env.ACCESS_SECRET);           // checks signature AND exp; throws if bad
    next();                                                            // token OK → continue to the route
  } catch {
    return res.sendStatus(401);                                        // expired or tampered
  }
}

app.post('/refresh', (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.sendStatus(401);

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.sendStatus(401);
    res.json({accessToken: signAccess(user)});
  } catch {
    return res.sendStatus(401);
  }
});

const requireRole = (role) => (req, res, next) =>
  req.user.role === role ? next() : res.sendStatus(403);               // logged in, but not allowed

app.get('/me', auth, (req, res) => res.json(req.user));                // auth runs first, then this

app.get('/admin/stats', auth, requireRole('admin'), (req, res) =>
  res.json({ users: 2, claimsToday: 42 }));                            // fake data; the point is the 403

app.listen(process.env.PORT, () => console.log('API on', process.env.PORT));