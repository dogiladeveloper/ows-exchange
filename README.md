## 🏆 OWS Hackathon 2026 — 3 Projects

> This submission is part of a 3-project hackathon entry. All three use OWS wallet signing.

| Project | Track | Live | GitHub |
|---------|-------|------|--------|
| **RiskScope** | Observatory · Pay-Per-Call | [riskscope.xyz](https://riskscope.xyz) | [dogiladeveloper/riskscope](https://github.com/dogiladeveloper/riskscope) |
| **OWSExchange** (this repo) | Exchange · Agentic Commerce | [ows-exchange.xyz](https://ows-exchange.xyz) | [dogiladeveloper/ows-exchange](https://github.com/dogiladeveloper/ows-exchange) |
| **OWSAgentWork** | Network · Multi-Agent | [owsagentwork.xyz](https://owsagentwork.xyz) | [dogiladeveloper/owsagentwork](https://github.com/dogiladeveloper/owsagentwork) |

---

# OWSExchange 🤖

> Autonomous prediction market trading agent powered by the Open Wallet Standard

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ows--exchange.xyz-00ff88?style=for-the-badge)](https://ows-exchange.xyz)
[![OWS](https://img.shields.io/badge/OWS-v1.2.0-00ff88?style=flat-square)](https://openwallet.sh)
[![Polymarket](https://img.shields.io/badge/Data-Polymarket-0066ff?style=flat-square)](https://polymarket.com)
[![Track](https://img.shields.io/badge/Track-The%20Exchange-ff3366?style=flat-square)](https://hackathon.openwallet.sh)

**OWS Hackathon 2026 — The Exchange Track**

---

## 🎯 What It Does

OWSExchange is an autonomous AI trading agent that monitors **150+ live Polymarket prediction markets**, detects pricing inefficiencies, and executes trades — all signed securely by an OWS-managed wallet. Private keys never touch the agent process.

**[→ Live Demo: ows-exchange.xyz](https://ows-exchange.xyz)**

---

## 🏗 Architecture

```
Polymarket Gamma API
        │
        ▼
  Market Scanner
  (150+ live markets)
        │
        ▼
  Arbitrage Detector ──── Category Filter
  (edge detection)        (Crypto/Sports/Politics...)
        │
        ▼
  OWS Policy Engine ◄──── Spending Limits
        │                  Chain Allowlist
        ▼
  OWS Signer (exchange-agent wallet)
  ┌─────────────────────────────────┐
  │  Key decrypted in memory        │
  │  Transaction signed             │
  │  Key wiped immediately          │
  │  Signature returned             │
  └─────────────────────────────────┘
        │
        ▼
   On-chain Settlement
```

---

## ✨ Features

- **150+ Live Markets** — Real-time data from Polymarket Gamma API
- **Category Filters** — Crypto, Politics, Sports, Finance, Tech, Weather
- **OWS Wallet Signing** — Every trade cryptographically signed, zero key exposure
- **Live Trade Log** — Real-time P&L tracking with tx hashes
- **Arbitrage Detection** — Automated edge identification across markets
- **Mobile Responsive** — Works on any device

---

## 🔧 Required Stack

| Component | Usage |
|-----------|-------|
| **OWS CLI v1.2.0** | Wallet management & signing |
| **OWS Wallet** | `exchange-agent` — execution & settlement |
| **MoonPay Agent Skill** | Payment integration |
| **Polymarket Gamma API** | Live prediction market data |
| **Node.js + Express** | Backend API server |

---

## 🚀 Quick Start

```bash
# Install OWS
npm install -g @open-wallet-standard/core

# Create agent wallet
ows wallet create --name exchange-agent

# Install dependencies
npm install

# Start server
node server.js
```

Visit `http://localhost:3001`

---

## 🔐 OWS Integration

```javascript
// Agent never sees the private key
const result = owsCmd('ows sign message --wallet exchange-agent --chain evm --message "Trade Signal"');
// Returns cryptographic signature
// Key wiped from memory after signing
```

**Wallet:** `exchange-agent`  
**Chain:** `eip155:137` (Polygon)  
**Address:** `0x759cFb2014398D63886A90E721d09CdB7eD5B140`

---

## 📊 How Trading Works

1. **Scan** — Bot fetches 150+ active Polymarket markets every 8 seconds
2. **Analyze** — Detects mispriced markets where YES + NO ≠ 1.00
3. **Policy Check** — OWS policy engine validates trade against limits
4. **Sign** — OWS wallet signs transaction in isolated memory
5. **Execute** — Trade submitted, key wiped, signature logged

---

## 🏆 Hackathon

Built for **OWS Hackathon 2026 — The Exchange Track**

**Judged on:** Strategy quality, full execution loop from signal to settlement via OWS, real risk management.

- [hackathon.openwallet.sh](https://hackathon.openwallet.sh)
- [openwallet.sh](https://openwallet.sh)
- [github.com/open-wallet-standard/core](https://github.com/open-wallet-standard/core)

---

## 📁 Project Structure

```
ows-exchange/
├── server.js          # Express API + OWS integration
├── public/
│   └── index.html     # Trading dashboard UI
└── package.json
```

---

*Built with ❤️ using Open Wallet Standard v1.2.0*

---

## Live OWS Signing Proof

Every trade is cryptographically signed by the OWS exchange-agent wallet:
```bash
$ ows sign message --wallet exchange-agent --chain evm \
    --message "OWSExchange: autonomous prediction market trading via OWS v1.2.0"

9866fcb62b93cb62daff74f2e26ba5def576341d381bbd4ddbc7b944f4fb365e7663e1b2f59a119b41a45171c1f2bdc36d266a2759b476d5341f1f2bc3d3c8391b
```

**Wallet:** exchange-agent | **Address:** 0x759cFb2014398D63886A90E721d09CdB7eD5B140  
**Chain:** eip155:137 (Polygon) | **Key exposure:** None ✓
