# OpenCap Share Backend

A simple, free backend service for storing and sharing OpenCap visualization data.

## Features

- **Free hosting** on Render
- **In-memory storage** (no database needed)
- **Auto-cleanup** (shares expire after 7 days)
- **CORS enabled** for frontend integration
- **Compression** for faster responses

## Quick Deploy to Render

1. Push this `share-backend` folder to a GitHub repository
2. Go to [render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repository
4. Set the root directory to `share-backend`
5. Render will automatically detect the `render.yaml` configuration
6. Deploy! (it's free)

## API Endpoints

### Store Share Data
```
POST /api/share
Content-Type: application/json

{
  "shareId": "unique-id",
  "data": { ... visualization data ... }
}
```

### Retrieve Share Data
```
GET /api/share/:shareId

Response:
{
  "success": true,
  "data": { ... visualization data ... },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Health Check
```
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeShares": 42
}
```

## Local Development

```bash
cd share-backend
npm install
npm start
```

The server will run on `http://localhost:3001`

## Frontend Integration

The OpenCap Visualizer automatically uses this backend when generating share URLs. It falls back to localStorage if the backend is unavailable.

## Limitations

- **In-memory storage**: Shares are lost when the server restarts
- **7-day expiration**: Automatic cleanup to prevent storage overflow
- **No authentication**: Anyone can store/retrieve data (intended for temporary sharing)

For production use with persistent storage, consider upgrading to use a PostgreSQL database on Render. 