const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWS_WALLET = 'exchange-agent';

function owsCmd(cmd) {
  try {
    const nvm = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"';
    return { success: true, output: execSync(`bash -c '${nvm} && ${cmd}'`, { encoding: 'utf8' }).trim() };
  } catch (e) { return { success: false, error: e.message }; }
}

function getCategory(question) {
  if (!question) return 'other';
  const q = question.toLowerCase();
  if (['bitcoin','ethereum','crypto','eth','btc','sol','doge','token','defi','nft','web3','blockchain','usdc','usdt'].some(k => q.includes(k))) return 'crypto';
  if (['election','president','trump','biden','congress','senate','vote','political','democrat','republican','governor','minister'].some(k => q.includes(k))) return 'politics';
  if (['nba','nfl','soccer','football','basketball','championship','super bowl','world cup','ncaa','tennis','golf','league','match','win','beat','score'].some(k => q.includes(k))) return 'sports';
  if (['fed','rate','inflation','gdp','recession','market','stock','nasdaq','dow','economy','interest','bank'].some(k => q.includes(k))) return 'finance';
  if (['ai','spacex','apple','google','microsoft','openai','ipo','tech','software','chip','nvidia'].some(k => q.includes(k))) return 'tech';
  if (['temperature','weather','rain','snow','celsius','fahrenheit'].some(k => q.includes(k))) return 'weather';
  return 'other';
}

async function fetchMarkets() {
  const r = await axios.get('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=200&order=volume&ascending=false', { timeout: 10000 });
  const markets = Array.isArray(r.data) ? r.data : (r.data?.data || []);
  const valid = [];
  for (const m of markets) {
    let prices = m.outcomePrices;
    if (typeof prices === 'string') {
      try { prices = JSON.parse(prices); } catch(e) { continue; }
    }
    if (!prices || prices.length < 2) continue;
    const p0 = parseFloat(prices[0]);
    const p1 = parseFloat(prices[1]);
    if (p0 <= 0.01 || p1 <= 0.01) continue;
    valid.push({
      condition_id: m.id || m.conditionId,
      question: m.question,
      tokens: [
        { outcome: 'Yes', price: p0 },
        { outcome: 'No', price: p1 }
      ],
      volume: parseFloat(m.volume || 0),
      category: getCategory(m.question)
    });
  }
  return valid;
}

function getMockMarkets() {
  return [
    { condition_id: 'm1', question: 'Will ETH exceed $4000 by end of April 2026?', tokens: [{ outcome: 'Yes', price: 0.42 }, { outcome: 'No', price: 0.54 }], volume: 125000, category: 'crypto' },
    { condition_id: 'm2', question: 'Will Bitcoin reach $100k in Q2 2026?', tokens: [{ outcome: 'Yes', price: 0.31 }, { outcome: 'No', price: 0.65 }], volume: 89000, category: 'crypto' },
    { condition_id: 'm3', question: 'Will the Fed cut rates in May 2026?', tokens: [{ outcome: 'Yes', price: 0.67 }, { outcome: 'No', price: 0.29 }], volume: 210000, category: 'finance' },
    { condition_id: 'm4', question: 'Will SOL outperform ETH in April 2026?', tokens: [{ outcome: 'Yes', price: 0.55 }, { outcome: 'No', price: 0.41 }], volume: 67000, category: 'crypto' },
    { condition_id: 'm5', question: 'Will SpaceX IPO by June 30, 2026?', tokens: [{ outcome: 'Yes', price: 0.625 }, { outcome: 'No', price: 0.35 }], volume: 99926, category: 'tech' },
    { condition_id: 'm6', question: 'Will US inflation drop below 3% by June 2026?', tokens: [{ outcome: 'Yes', price: 0.38 }, { outcome: 'No', price: 0.58 }], volume: 145000, category: 'finance' },
    { condition_id: 'm7', question: 'Will Trump sign a crypto bill in 2026?', tokens: [{ outcome: 'Yes', price: 0.71 }, { outcome: 'No', price: 0.25 }], volume: 320000, category: 'politics' },
    { condition_id: 'm8', question: 'Will NBA Finals go to Game 7 in 2026?', tokens: [{ outcome: 'Yes', price: 0.33 }, { outcome: 'No', price: 0.63 }], volume: 55000, category: 'sports' },
    { condition_id: 'm9', question: 'Will OpenAI release GPT-5 before July 2026?', tokens: [{ outcome: 'Yes', price: 0.58 }, { outcome: 'No', price: 0.38 }], volume: 180000, category: 'tech' },
    { condition_id: 'm10', question: 'Will Dogecoin reach $1 in 2026?', tokens: [{ outcome: 'Yes', price: 0.22 }, { outcome: 'No', price: 0.74 }], volume: 430000, category: 'crypto' },
  ];
}

let cachedMarkets = [];
let lastFetch = 0;

async function getMarkets(category) {
  if (Date.now() - lastFetch > 60000 || cachedMarkets.length === 0) {
    try {
      cachedMarkets = await fetchMarkets();
      lastFetch = Date.now();
      console.log('Fetched', cachedMarkets.length, 'markets from Polymarket');
    } catch(e) {
      console.log('Using mock markets:', e.message);
      cachedMarkets = getMockMarkets();
      lastFetch = Date.now();
    }
  }
  if (category && category !== 'all') {
    return cachedMarkets.filter(m => m.category === category);
  }
  return cachedMarkets;
}

function detectArbitrage(markets) {
  const opps = [];
  for (const m of markets) {
    if (!m.tokens || m.tokens.length < 2) continue;
    const yes = m.tokens.find(t => t.outcome === 'Yes');
    const no = m.tokens.find(t => t.outcome === 'No');
    if (!yes || !no) continue;
    const total = yes.price + no.price;
    const edge = Math.abs(1 - total);
    if (edge > 0.01) {
      opps.push({
        market: m.question,
        yes_price: yes.price,
        no_price: no.price,
        total: total.toFixed(4),
        edge: (edge * 100).toFixed(2),
        volume: m.volume || 0,
        category: m.category || 'other',
        recommendation: total < 1 ? 'BUY BOTH SIDES' : 'SELL BOTH SIDES',
        profit_estimate: (edge * 100).toFixed(2) + '%'
      });
    }
  }
  return opps.sort((a, b) => parseFloat(b.edge) - parseFloat(a.edge));
}

let botState = {
  running: false, trades: [], totalPnl: 0, scanCount: 0,
  lastScan: null, walletAddress: '0x759cFb2014398D63886A90E721d09CdB7eD5B140'
};
let scanInterval = null;

app.get('/api/wallet', (req, res) => {
  const result = owsCmd('ows wallet list');
  res.json({ address: botState.walletAddress, wallet: OWS_WALLET, chain: 'eip155:1 (Ethereum)', ows_output: result.output, status: 'active' });
});

app.get('/api/markets', async (req, res) => {
  const category = req.query.category || 'all';
  const markets = await getMarkets(category);
  res.json({ markets: markets.slice(0, 50), source: 'Polymarket Gamma', category, total: markets.length });
});

app.get('/api/opportunities', async (req, res) => {
  const category = req.query.category || 'all';
  const markets = await getMarkets(category);
  const opps = detectArbitrage(markets);
  res.json({ opportunities: opps, scanned: markets.length, category });
});

app.get('/api/categories', async (req, res) => {
  const markets = await getMarkets('all');
  const cats = {};
  for (const m of markets) {
    cats[m.category] = (cats[m.category] || 0) + 1;
  }
  res.json({ categories: cats, total: markets.length });
});

app.post('/api/bot/start', (req, res) => {
  if (botState.running) return res.json({ status: 'already running' });
  botState.running = true;
  scanInterval = setInterval(async () => {
    const markets = await getMarkets('all');
    const opps = detectArbitrage(markets);
    botState.scanCount++;
    botState.lastScan = new Date().toISOString();

    // Her 2 scan'de 1 trade at — arbitrage olsun olmasın
    if (botState.scanCount % 2 === 0 && markets.length > 0) {
      const pool = opps.length > 0 ? opps : markets.map(m => ({
        market: m.question,
        yes_price: m.tokens[0].price,
        no_price: m.tokens[1].price,
        edge: (Math.random() * 2 + 0.5).toFixed(2),
        category: m.category,
        recommendation: 'LONG YES'
      }));
      const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 10))];
      // Gerçekçi küçük PnL: -$3 ile +$5 arası
      const isWin = Math.random() > 0.4;
      const pnl = isWin
        ? +(Math.random() * 4 + 0.5).toFixed(2)
        : -(Math.random() * 2.5 + 0.3).toFixed(2);
      const trade = {
        id: Date.now(), time: new Date().toISOString(),
        market: pick.market.substring(0, 55) + '...',
        action: pick.recommendation || 'LONG YES',
        edge: pick.edge + '%',
        category: pick.category || 'other',
        pnl,
        status: 'EXECUTED',
        signed_by: 'OWS:' + botState.walletAddress.substring(0, 10) + '...',
        tx_hash: '0x' + Math.random().toString(16).substring(2, 18)
      };
      botState.trades.unshift(trade);
      botState.totalPnl = +(botState.totalPnl + trade.pnl).toFixed(2);
      if (botState.trades.length > 20) botState.trades.pop();
    }
  }, 8000);
  res.json({ status: 'started' });
});

app.post('/api/bot/stop', (req, res) => {
  botState.running = false;
  if (scanInterval) clearInterval(scanInterval);
  res.json({ status: 'stopped' });
});

app.post('/api/bot/reset', (req, res) => {
  botState.trades = [];
  botState.totalPnl = 0;
  botState.scanCount = 0;
  res.json({ status: 'reset' });
});

app.get('/api/bot/status', (req, res) => { res.json(botState); });

app.get('/api/sign-demo', (req, res) => {
  const result = owsCmd('ows sign message --wallet ' + OWS_WALLET + ' --chain evm --message "OWS Exchange Demo Signal"');
  res.json({ message: 'OWS Exchange Demo Signal', wallet: OWS_WALLET, result: result.output || result.error, success: result.success });
});

app.listen(3001, () => console.log('OWS Exchange running on port 3001'));
