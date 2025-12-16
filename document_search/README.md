# Netkathir AI Tool - Unified Platform

A comprehensive AI-powered platform combining document search, vendor database management, and transport vendor CRUD operations.

## 🎯 Features

- 🔐 **User Authentication**: Email/UserId registration with OTP verification
- 📄 **Document AI Search**: Upload and semantically search documents
- 🔍 **Vendor DB Search**: AI-powered semantic search
- 📊 **Vendor Management**: Full CRUD + Excel import/export
- 👤 **Per-User Data**: Isolated data storage per user

## 🚀 Quick Start

### 1. Install MongoDB (if not already installed)
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
mongosh --eval "db.version()"  # Verify
```

### 2. Install Dependencies
```bash
cd /path/to/file_search_ai_tool
npm run install-all
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, SMTP, OpenAI key
```

### 4. Run Development Servers
```bash
npm run dev
```

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

## 📦 Tech Stack

**Backend:** Node.js, Express, MongoDB, JWT, OpenAI  
**Frontend:** React 18, Axios  
**Features:** OTP verification, file uploads, AI embeddings, Excel import/export

## 📖 Full Documentation

See detailed setup, API endpoints, and architecture in sections below.

---

## Environment Variables

Create `.env` file with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/netkathir_ai_tool

# JWT
JWT_SECRET=your_secret_key_min_32_characters

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=noreply@netkathir.com

# OpenAI
OPENAI_API_KEY=sk-your_key_here

# Optional
PORT=5000
CLIENT_URL=http://localhost:3000
OTP_EXPIRY_MINUTES=10
MAX_FILE_SIZE=10485760
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register + send OTP
- `POST /api/auth/verify-signup-otp` - Verify OTP + create account
- `POST /api/auth/login` - Login with email/userId
- `POST /api/auth/forgot-password` - Send reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP

### Vendors
- `GET /api/vendors` - List user's vendors
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor
- `POST /api/vendors/import` - Import Excel file
- `GET /api/vendors/export/excel` - Export to Excel

### Documents (Coming Soon)
- `POST /api/documents/upload` - Upload files
- `POST /api/documents/search` - AI semantic search
- `GET /api/documents` - List documents

## Project Structure

```
├── server/              # Node.js backend
│   ├── models/         # MongoDB schemas (User, Vendor, Document, OTP)
│   ├── routes/         # API routes (auth, vendors, documents)
│   ├── middleware/     # Auth middleware
│   ├── utils/          # Email service, file parsers
│   └── config/         # Database connection
├── client/             # React frontend (to be built)
├── data/               # Per-user file storage
│   └── {userId}/
│       ├── documents/
│       └── embeddings/
└── package.json
```

## Development

### Install & Run
```bash
npm run install-all    # Install all dependencies
npm run dev            # Run both servers
npm run server         # Backend only
npm run client         # Frontend only
```

### Database Setup
```bash
# Create MongoDB database
mongosh
> use netkathir_ai_tool
> show dbs
```

## User Flow

1. **Sign Up** → Enter email, userId, password → Get OTP via email → Verify → Account created
2. **Login** → Use email/userId + password → Navigate to home
3. **Home** → 4 cards: Document Search, Vendor Search, Vendor Mgmt, Profile
4. **Document Search** → Upload files → AI semantic search
5. **Vendor Mgmt** → Add/Edit/Delete vendors → Import/Export Excel

## Troubleshooting

**MongoDB not connecting?**
```bash
brew services restart mongodb-community@7.0
```

**Port 5000 in use?**
```bash
lsof -ti:5000 | xargs kill -9
```

**Gmail SMTP not working?**
- Enable 2-Factor Authentication
- Create App Password: https://myaccount.google.com/apppasswords
- Use App Password in `SMTP_PASS`

## Next Steps

- [ ] Complete document upload/search routes
- [ ] Build React frontend
- [ ] Integrate OpenAI embeddings
- [ ] Add vendor semantic search
- [ ] Comprehensive testing

## License

MIT
