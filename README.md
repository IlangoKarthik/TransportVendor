# Transport Vendor Management App

A full-stack web application for managing transport vendor registrations with a React frontend and Node.js/Express backend.

## Features

- ✅ Vendor registration form
- ✅ View all vendors in a list
- ✅ Edit vendor details
- ✅ Delete vendors
- ✅ Responsive design
- ✅ Modern UI with beautiful styling

## Tech Stack

- **Frontend**: React 18, Axios
- **Backend**: Node.js, Express
- **Database**: MySQL/PostgreSQL
- **Styling**: CSS3 with modern gradients

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- MySQL/PostgreSQL
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd transport-vendor-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Setup Database**
   - Install MySQL and start the service
   - Create database using `server/database.sql`
   - Or let the app create it automatically

4. **Configure Environment Variables**
   
   Create `server/.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=transport_vendor_db
   PORT=5000
   ```

5. **Start the application**
   ```bash
   # From root directory
   npm run dev
   ```
   
   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend on `http://localhost:3001`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed cloud deployment instructions.

Quick steps:
1. Push code to GitHub
2. Deploy on Render.com (free tier available)
3. Set up environment variables
4. Your app is live! 🚀

## Project Structure

```
transport-vendor-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js
│   │   └── config.js      # API configuration
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Server entry point
│   ├── database.sql       # Database schema
│   └── package.json
└── package.json           # Root package.json
```

## API Endpoints

- `GET /api/vendors` - Get all vendors
- `GET /api/vendors/:id` - Get single vendor
- `POST /api/vendors` - Create new vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor
- `GET /api/health` - Health check

## Environment Variables

### Server (.env)
- `DB_HOST` - Database host
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `PORT` - Server port (default: 5000)
- `ALLOWED_ORIGINS` - Comma-separated allowed origins for CORS

### Client
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)

## License

ISC
