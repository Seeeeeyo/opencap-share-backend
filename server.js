const express = require('express');
const cors = require('cors');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors());

// Enable compression
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// In-memory storage (for simplicity - in production you'd use a database)
const shareStorage = new Map();

// Auto-cleanup old shares (keep for 7 days)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

setInterval(() => {
  const now = Date.now();
  for (const [shareId, data] of shareStorage.entries()) {
    if (now - data.timestamp > MAX_AGE) {
      shareStorage.delete(shareId);
      console.log(`Cleaned up expired share: ${shareId}`);
    }
  }
}, CLEANUP_INTERVAL);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeShares: shareStorage.size
  });
});

// Store share data
app.post('/api/share', (req, res) => {
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
}); 