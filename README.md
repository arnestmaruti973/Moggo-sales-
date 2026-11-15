# Vehicle Sales Website

A full-stack responsive car and motorbike sales website with a customer application form, WhatsApp click-to-chat handoff, SQLite storage, and password-protected admin dashboard.

## Requirements
- Node.js 20+
- npm

## Run locally
1. Extract the project ZIP.
2. Open the project folder in a terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Generate a bcrypt password hash:
   `node -e "require('bcryptjs').hash('ChooseYourOwnStrongPassword',12).then(console.log)"`
6. Paste the generated hash into `ADMIN_PASSWORD_HASH` in `.env`. Set your own `ADMIN_USERNAME`, `SESSION_SECRET`, and `BUSINESS_WHATSAPP`.
7. Set `BUSINESS_WHATSAPP` to the business WhatsApp number in international digits only, e.g. `2547XXXXXXXX` (do not include `+`, spaces or dashes).
8. Run `npm start`.
9. Open `http://localhost:3000`. Admin: `http://localhost:3000/admin`.

## How it works
- Customer applications are validated and saved in `data/vehicles.db`.
- On successful save, the browser opens WhatsApp with the application prefilled. The customer must press Send.
- Admin can see applications, change application status, manage vehicle listings and edit company details/WhatsApp number.
- Vehicle listings and company settings are stored in SQLite.

## Deployment
Deploy to a Node.js host that supports persistent disk storage. Set the environment variables from `.env.example` in the host's environment settings. Use HTTPS and set `NODE_ENV=production`. Ensure the `data/` directory is on persistent storage; otherwise SQLite data may be lost when the host restarts or redeploys. Never commit `.env`, the database, or password hashes to a public repository.

## Important production notes
- The included Express session store is the default in-memory store and is suitable only for testing/small single-process deployments. For production, configure a persistent session store such as connect-sqlite3 or Redis.
- Configure HTTPS, backups, monitoring, and a privacy notice before collecting real customer data.
- Replace sample vehicle images and the default company name/contact details with your actual approved business information.
- The default WhatsApp number is a placeholder. Set a valid business number before launch.
- The site does not approve financing or process payments. It collects an enquiry and sends the details to the business WhatsApp account.
