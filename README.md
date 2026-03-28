# 🚀 QuadStream: Real-Time Quadratic Funding Streams

> **One-Line Pitch:** Streaming Quadratic Funding that punishes drift and rewards consistency by dynamically adjusting matching rates in real-time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-orange.svg)](https://hardhat.org/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-v6.9.0-green.svg)](https://docs.ethers.org/)
[![Hackonomics 2026](https://img.shields.io/badge/Hackathon-Hackonomics%202026-red.svg)](https://hackonomics.io)

## 📖 Overview

**QuadStream** is a governance and treasury tool designed for DAOs that replaces inefficient lump-sum grants with **streaming quadratic funding**. By integrating Superfluid-style payment streams with Quadratic Funding (QF) logic, QuadStream ensures continuous contributor alignment and prevents 'hit-and-run' grant draining.

Built for the **Hackonomics 2026 - DAO Tooling Track**, this project solves the critical issue of sybil attacks and short-term exploitation in traditional QF rounds.

## 🛑 The Problem

Traditional Quadratic Funding mechanisms suffer from three critical vulnerabilities:

1.  **Grant-and-Ghost Behavior:** Contributors fund a project once to maximize matching, then withdraw immediately, leaving the project underfunded for the long term.
2.  **Sybil Vulnerability:** Lump-sum contributions allow attackers to pool funds and manipulate the $\sum \sqrt{c_i}$ calculation without genuine community support.
3.  **Liquidity Mismatch:** Projects receive a lump sum that may not match their burn rate, leading to waste or insolvency.

## ✅ The Solution

QuadStream introduces **Dynamic Streaming Matching**. Instead of a one-time pool distribution, the matching treasury flows continuously.

*   **Real-Time Adjustment:** The matching rate for a recipient is calculated based on the square of the sum of square roots of individual contributor stream magnitudes ($ (\sum \sqrt{c_i})^2 $).
*   **Instant Reaction:** If a contributor stops their stream, the matching multiplier for that project drops instantly across the network.
*   **Gas Optimization:** A dedicated `FlowCalculator` library handles the non-linear math efficiently to prevent gas limit hits during high-frequency updates.

## 🏗️ Architecture

```text
+----------------+       +---------------------+       +------------------+
|   Backers      |       |   ContributionVault |       |   Recipients     |
| (Streamers)    |<----->| (Individual Funds)  |<----->| (Projects)       |
+-------+--------+       +----------+----------+       +--------+---------+
        |                           |                           |
        | 1. Initiate Stream        | 2. Aggregate Magnitude    | 3. Receive Flow
        v                           v                           v
+-------+---------------------------+---------------------------+-------+
|                         StreamGovernor                          |
|  - Manages Matching Treasury                                    |
|  - Enforces Flow Rules                                          |
+-------+---------------------------+---------------------------+-------+
        |                           |
        | 4. Calculate Rate         | 5. Update State
        v                           v
+-------+---------------------------+---------------------------+-------+
|                        FlowCalculator Library                       |
|  - Computes: (Sum(Sqrt(Contributions)))^2                           |
|  - Optimized for Gas Efficiency                                     |
+---------------------------------------------------------------------+
```

## 🛠️ Tech Stack

*   **Smart Contracts:** Solidity 0.8.20
*   **Development Framework:** Hardhat
*   **Frontend:** Vanilla JavaScript + HTML/CSS
*   **Blockchain Interaction:** Ethers.js v6
*   **Testing:** Mocha/Chai

## 🚀 Setup Instructions

Follow these steps to run QuadStream locally.

### 1. Clone the Repository
```bash
git clone https://github.com/77svene/quad-stream-dao
cd quad-stream-dao
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory with the following variables:

```env
# Network Configuration
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
DEPLOYER_ADDRESS=0x...

# Dashboard Configuration
PORT=3000
```

### 4. Deploy Contracts
Compile and deploy the contracts to your local Hardhat network or testnet:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Start the Dashboard
Launch the vanilla JS dashboard to interact with the contracts:
```bash
npm start
```
*The dashboard will be available at `http://localhost:3000`.*

## 📡 API & Contract Methods

The dashboard interacts with the smart contracts via the following exposed methods:

| Method | Type | Description |
| :--- | :--- | :--- |
| `startStream(projectId, amount)` | Write | Initiates a new contribution stream to a project. |
| `stopStream(projectId)` | Write | Halts the contributor's stream, triggering recalculation. |
| `getMatchingRate(projectId)` | Read | Returns the current dynamic matching multiplier. |
| `withdrawMatching(projectId)` | Write | Allows recipient to claim accumulated matching funds. |
| `getStreamStatus(user, projectId)` | Read | Returns current stream rate and total contributed. |

## 📸 Demo Screenshots

### Dashboard Overview
![Dashboard Overview](https://via.placeholder.com/800x400/2563eb/ffffff?text=QuadStream+Dashboard+Overview)

### Stream Configuration
![Stream Config](https://via.placeholder.com/800x400/16a34a/ffffff?text=Stream+Configuration+Modal)

### Real-Time Matching Graph
![Matching Graph](https://via.placeholder.com/800x400/dc2626/ffffff?text=Real-Time+Matching+Graph)

## 👥 Team

**Built by VARAKH BUILDER — autonomous AI agent**

*   **Core Logic:** Solidity & FlowCalculator
*   **Frontend:** Vanilla JS Dashboard
*   **Strategy:** Hackonomics 2026 DAO Tooling Track

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*QuadStream © 2026. All rights reserved.*