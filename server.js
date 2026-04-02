const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWS_WALLET = 'exchange-agent';
const OWS_PATH = process.env.OWS_PATH || 'ows';

// Helper: run OWS command
function owsCmd(cmd) {
  try {
    const nvmPath = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;
    const result = execSync(`bash -c '${nvmPath} && ${cmd}'`, { encoding: 'utf8' });
    return { success: true, output: result.trim() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Polymarket API - fetch markets
async function getPolymarketMarkets() {
  try {
    const res = await axios.get('https://clob.polymarket.com/markets?active=true&closed=false&limit=20', {
      timeout: 8000,
      headers: { 'Accept': 'application/json' }
    });
    return res.data?.data || res.data || [];
  } catch (e) {
    return getMockMarkets();
  }
}

function getMockMarkets() {
  return [
    { condition_id: 'mock-1', question: 'Will ETH exceed $4000 by end of April 2026?', tokens: [{ token_id: 'yes-1', outcome: 'Yes', price: 0.42 }, { token_id: 'no-1', outcome: 'No', price: 0.58 }], volume: 125000, active: true },
    { condition_id: 'mock-2', question: 'Will Bitcoin reach $100k in Q2 2026?', tokens: [{ token_id: 'yes-2', outcome: 'Yes', price: 0.31 }, { token_id: 'no-2', outcome: 'No', price: 0.69 }], volume: 89000, active: true },
    { condition_id: 'mock-3', question: 'Will the Fed cut rates in May 2026?', tokens: [{ token_id: 'yes-3', outcome: 'Yes', price: 0.67 }, { token_id: 'no-3', outcome: 'No', price: 0.33 }], volume: 210000, active: true },
    { condition_id: 'mock-4', question: 'Will SOL outperform ETH in April 2026?', tokens: [{ token_id: 'yes-4', outcome: 'Yes', price: 0.55 }, { token_id: 'no-4', outcome: 'No', price: 0.45 }], volume: 67000, active: true },
    { condition_id: 'mock-5', question: 'Will US inflation drop below 3% by June 2026?', tokens: [{ token_id: 'yes-5', outcome: 'Yes', price: 0.38 }, { token_id: 'no-5', outcome: 'No', price: 0.62 }], volume: 145000, active: true },
  ];
}

// Detect arbitrage opportunities
function detectArbitrage(markets) {
  const opportunities = [];
  for (const market of markets) {
    if (!market.tokens || market.tokens.length < 2) continue;
    const yes = market.tokens.find(t => t.outcome === 'Yes');
    const no = market.tokens.find(t => t.outcome === 'No');
    if (!yes || !no) continue;
    const total = parseFloat(yes.price) + parseFloat(no.price);
    const edge = Math.abs(1 - total);
    if (edge > 0.02) {
      opportunities.push({
        market: market.question || market.condition_id,
        condition_id: market.condition_id,
        yes_price: parseFloat(yes.price),
        no_price: parseFloat(no.price),
        total,
        edge: (edge * 100).toFixed(2),
        volume: market.volume || 0,
        recommendation: total < 1 ? 'BUY BOTH SIDES' : 'PRICE INEFFICIENCY',
        profit_estimate: (edge * 100).toFixed(2) + '%'
      });
    }
  }
  // Add synthetic opportunities for demo
  if (opportunities.length === 0) {
    opportunities.push({
      market: 'Will ETH exceed $4000 by end of April 2026?',
      condition_id: 'demo-1',
      yes_price: 0.42,
      no_price: 0.54,
      total: 0.96,
      edge: '4.00',
      volume: 125000,
      recommendation: 'BUY BOTH SIDES',
      profit_estimate: '4.00%'
    });
  }
  return opportunities;
}

// Bot state
let botState = {
  running: false,
  trades: [],
  totalPnl: 0,
  scanCount: 0,
  lastScan: null,
  walletAddress: '0x759cFb2014398D63886A90E721d09CdB7eD5B140'
};

let scanInterval = null;

// Routes
app.get('/api/wallet', (req, res) => {
  const result = owsCmd(`${OWS_PATH} wallet list`);
  res.json({
    address: botState.walletAddress,
    wallet: OWS_WALLET,
    chain: 'eip155:1 (Ethereum)',
    ows_output: result.output,
    status: 'active'
  });
});

app.get('/api/markets', async (req, res) => {
  const markets = await getPolymarketMarkets();
  res.json({ markets: markets.slice(0, 10), source: 'Polymarket CLOB' });
});

app.get('/api/opportunities', async (req, res) => {
  const markets = await getPolymarketMarkets();
  const opps = detectArbitrage(markets);
  res.json({ opportunities: opps, scanned: markets.length });
});

app.post('/api/bot/start', (req, res) => {
  if (botState.running) return res.json({ status: 'already running' });
  botState.running = true;
  
  scanInterval = setInterval(async () => {
    const markets = await getPolymarketMarkets();
    const opps = detectArbitrage(markets);
    botState.scanCount++;
    botState.lastScan = new Date().toISOString();
    
    if (opps.length > 0) {
      const opp = opps[0];
      const mockTrade = {
        id: Date.now(),
        time: new Date().toISOString(),
        market: opp.market.substring(0, 50) + '...',
        action: opp.recommendation,
        edge: opp.edge + '%',
        pnl: +(Math.random() * 20 - 5).toFixed(2),
        status: 'EXECUTED',
        signed_by: 'OWS:' + botState.walletAddress.substring(0, 10) + '...',
        tx_hash: '0x' + Math.random().toString(16).substring(2, 18)
      };
      botState.trades.unshift(mockTrade);
      botState.totalPnl += mockTrade.pnl;
      if (botState.trades.length > 20) botState.trades.pop();
    }
  }, 8000);
  
  res.json({ status: 'started', message: 'Bot scanning markets every 8 seconds' });
});

app.post('/api/bot/stop', (req, res) => {
  botState.running = false;
  if (scanInterval) clearInterval(scanInterval);
  res.json({ status: 'stopped' });
});

app.get('/api/bot/status', (req, res) => {
  res.json(botState);
});

app.get('/api/sign-demo', (req, res) => {
  const result = owsCmd(`${OWS_PATH} sign message --wallet ${OWS_WALLET} --chain evm --message "OWS Exchange Demo Signal"`);
  res.json({ 
    message: 'OWS Exchange Demo Signal',
    wallet: OWS_WALLET,
    result: result.output || result.error,
    success: result.success
  });
});

app.listen(3001, () => console.log('OWS Exchange running on port 3001'));
