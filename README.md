# OWS Exchange 🤖

> Autonomous prediction market trading agent powered by the Open Wallet Standard

**OWS Hackathon 2026 — The Exchange Track**

[![Live Demo](https://img.shields.io/badge/Live-ows--exchange.xyz-00ff88?style=flat-square)](https://ows-exchange.xyz)
[![OWS](https://img.shields.io/badge/Powered%20by-OWS%20v1.2.0-00ff88?style=flat-square)](https://openwallet.sh)

## What it does

OWS Exchange is an autonomous trading agent that scans Polymarket prediction markets for arbitrage opportunities and executes trades using an OWS-secured wallet — private keys never exposed to the agent process.

## How it works

1. Agent scans Polymarket CLOB for mispriced markets
2. Detects arbitrage edges (YES + NO prices < 1.0)
3. OWS policy engine evaluates the trade before signing
4. Key decrypted in isolated memory, transaction signed, key wiped
5. Signed transaction submitted on-chain

## Required Stack

- ✅ OWS CLI v1.2.0
- ✅ OWS wallet for execution and settlement
- ✅ MoonPay agent skill integration
- ✅ Polymarket CLOB as trading venue

## Architecture
```
Polymarket API → Arbitrage Detector → OWS Policy Engine → OWS Signer → On-chain
                                            ↑
                                    exchange-agent wallet
                                    (keys never exposed)
```

## Quick Start
```bash
npm install
node server.js
```

## OWS Wallet
```
Wallet: exchange-agent
Chain: eip155:1 (Ethereum)
Address: 0x759cFb2014398D63886A90E721d09CdB7eD5B140
```

## Live Demo

Visit [ows-exchange.xyz](https://ows-exchange.xyz) to see the bot in action.
