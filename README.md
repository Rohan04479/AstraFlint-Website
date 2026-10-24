# AstraFlint Full-Stack Website

This project includes:
- Responsive AstraFlint company website
- Express/Node.js backend API
- MongoDB storage for contact enquiries and internship applications
- Protected admin dashboard at `/admin`
- Admin login, password hash verification, JWT sessions, input validation, request size limit, rate limiting and Helmet security headers

## Requirements
- Node.js 20 or newer
- A MongoDB database (MongoDB Atlas has a free tier; check current limits and terms)

## Run locally on Windows

1. Install Node.js LTS from https://nodejs.org/ and restart your terminal.
2. Extract this ZIP into a folder.
3. Open that folder in VS Code.
4. Open **Terminal → New Terminal**.
5. Run:

   ```bash
   npm install
   ```

6. Copy `.env.example` and rename the copy to `.env`.
7. Create a MongoDB Atlas database, create a database user, allow your current IP in Network Access, and paste the connection string into `MONGODB_URI`. Replace the placeholders and URL-encode special characters in the database password.
8. Create an admin password hash. In the VS Code terminal, run this command, replacing the example password with a strong unique password:

   ```bash
   node -e "require('bcryptjs').hash('YourStrongPasswordHere', 12).then(console.log)"
   ```

   Copy the output into `ADMIN_PASSWORD_HASH`. Do not put the plain password in `.env`.
9. Replace `ADMIN_EMAIL` with your preferred admin email and set `JWT_SECRET` to a long random secret (at least 32 characters).
10. Run:

   ```bash
   npm start
   ```

11. Open `http://localhost:3000` for the company website.
12. Open `http://localhost:3000/admin` for the admin panel.

## API endpoints
- `GET /api/health`
- `POST /api/contact`
- `POST /api/internships`
- `POST /api/admin/login`
- `GET /api/admin/summary` (admin token required)
- `GET /api/admin/contacts` (admin token required)
- `PATCH /api/admin/contacts/:id` (admin token required)
- `GET /api/admin/internships` (admin token required)
- `PATCH /api/admin/internships/:id` (admin token required)

## Important before public launch
- This is a starter project, not a completed security audit.
- Keep `.env` private and never upload it to GitHub. `.gitignore` is included.
- Use HTTPS in production, restrict MongoDB network access, use a strong unique admin password and rotate secrets if exposed.
- Configure backups, monitoring and an appropriate privacy notice/consent for collecting personal data.
- Review internship roles, eligibility, compensation and terms transparently before accepting applications.
- The website currently uses Google Fonts from an external host; remove those links if you prefer a fully self-hosted site.
- The admin login token is held in page memory and expires after two hours. For a production deployment, consider a reviewed secure-cookie session approach and additional security testing.
