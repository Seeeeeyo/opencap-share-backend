const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and anon key are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enable CORS for all origins
app.use(cors());

// Enable compression
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: 'supabase'
  });
});

// Store share data
app.post('/api/share', async (req, res) => {
  try {
    const { shareId, data } = req.body;

    if (!shareId || !data) {
      return res.status(400).json({ error: 'shareId and data are required' });
    }

    const { error } = await supabase
      .from('shares')
      .upsert({ share_id: shareId, data: data });

    if (error) {
      throw error;
    }

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
app.get('/api/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const { data, error } = await supabase
      .from('shares')
      .select('data, created_at')
      .eq('share_id', shareId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    // Supabase automatically sets created_at, let's check if it's older than 7 days
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (new Date() - new Date(data.created_at) > MAX_AGE) {
        // We can also set up a cron job in Supabase to delete old rows
        return res.status(404).json({ error: 'Share expired' });
    }


    console.log(`Retrieved share: ${shareId}`);

    res.json({
      success: true,
      data: data.data,
      createdAt: data.created_at
    });

  } catch (error) {
    console.error('Error retrieving share:', error);
    res.status(500).json({ error: 'Failed to retrieve share data' });
  }
});

// List all shares (for debugging) - This might be slow if you have many shares
app.get('/api/shares', async (req, res) => {
    const { data, error } = await supabase
        .from('shares')
        .select('share_id, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        return res.status(500).json({ error: 'Failed to retrieve shares' });
    }
    
    const shares = data.map(d => ({
        shareId: d.share_id,
        createdAt: d.created_at,
        // size cannot be easily computed here without fetching data
    }));

    res.json({ shares, total: shares.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`OpenCap Share Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
}); 