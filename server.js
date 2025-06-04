const express = require('express');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors());

// Enable compression
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// File-based storage configuration
const STORAGE_FILE = path.join(__dirname, 'shares.json');
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Load shares from file on startup
let shareStorage = new Map();

async function loadShares() {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    const shares = JSON.parse(data);
    shareStorage = new Map(Object.entries(shares));
    console.log(`Loaded ${shareStorage.size} shares from storage`);
  } catch (error) {
    console.log('No existing shares file found, starting fresh');
  }
}

async function saveShares() {
  try {
    const sharesObj = Object.fromEntries(shareStorage);
    await fs.writeFile(STORAGE_FILE, JSON.stringify(sharesObj, null, 2));
  } catch (error) {
    console.error('Error saving shares:', error);
  }
}

// Auto-cleanup old shares and save periodically
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

setInterval(async () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [shareId, data] of shareStorage.entries()) {
    if (now - data.timestamp > MAX_AGE) {
      shareStorage.delete(shareId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired shares`);
    await saveShares();
  }
}, CLEANUP_INTERVAL);

// Initialize storage
loadShares();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeShares: shareStorage.size,
    storage: 'file-based'
  });
});

// Store share data
app.post('/api/share', async (req, res) => {
  try {
    const { shareId, data } = req.body;
    
    if (!shareId || !data) {
      return res.status(400).json({ error: 'shareId and data are required' });
    }
    
    // Store with timestamp
    shareStorage.set(shareId, {
      data: data,
      timestamp: Date.now()
    });
    
    // Save to file
    await saveShares();
    
    console.log(`Stored share: ${shareId}`);
    
    res.json({ 
      success: true, 
      shareId: shareId,
      expiresIn: '7 days'
    });
    
  } catch (error) {
    console.error('Error storing share:', error);
    res.status(500).json({ error: 'Failed to store share data' });
  }
});

// Retrieve share data
app.get('/api/share/:shareId', (req, res) => {
  try {
    const { shareId } = req.params;
    
    const storedData = shareStorage.get(shareId);
    
    if (!storedData) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }
    
    // Check if expired
    const now = Date.now();
    if (now - storedData.timestamp > MAX_AGE) {
      shareStorage.delete(shareId);
      saveShares(); // Clean up expired share
      return res.status(404).json({ error: 'Share expired' });
    }
    
    console.log(`Retrieved share: ${shareId}`);
    
    res.json({ 
      success: true, 
      data: storedData.data,
      createdAt: new Date(storedData.timestamp).toISOString()
    });
    
  } catch (error) {
    console.error('Error retrieving share:', error);
    res.status(500).json({ error: 'Failed to retrieve share data' });
  }
});

// List all shares (for debugging)
app.get('/api/shares', (req, res) => {
  const shares = Array.from(shareStorage.entries()).map(([shareId, data]) => ({
    shareId,
    timestamp: data.timestamp,
    createdAt: new Date(data.timestamp).toISOString(),
    size: JSON.stringify(data.data).length
  }));
  
  res.json({ shares, total: shares.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`OpenCap Share Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Using file-based storage: ${STORAGE_FILE}`);
}); 