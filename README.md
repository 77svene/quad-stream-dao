# 🚀 QuadStream: Real-Time Quadratic Funding Streams

> **One-line Pitch:** Streaming Quadratic Funding that punishes dropouts, prevents hit-and-run grants, and ensures continuous contributor alignment through dynamic matching pools.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-ff69b4.svg)](https://hardhat.org/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-6.0.0-627EEA.svg)](https://docs.ethers.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hackonomics 2026](https://img.shields.io/badge/Hackathon-Hackonomics%202026-000000.svg)](https://hackonomics.io)

## 📖 Overview

**QuadStream** is a next-generation governance and treasury tool designed for DAOs. It replaces traditional lump-sum Quadratic Funding (QF) rounds with **Superfluid-style payment streams**. By integrating real-time streaming with the quadratic matching formula, QuadStream eliminates the "grant-and-ghost" behavior common in traditional QF, ensuring that funding is directly proportional to sustained community support rather than one-time sybil attacks.

## 🚨 The Problem

Traditional Quadratic Funding mechanisms suffer from critical vulnerabilities:
1.  **Hit-and-Run Grants:** Contributors donate a large amount at the start of a round to inflate the matching pool, then withdraw immediately, leaving the project with a lump sum that doesn't reflect ongoing support.
2.  **Sybil Attacks:** One-time donations are easier to farm with multiple wallets than sustained streaming commitments.
3.  **Lack of Alignment:** Once a grant is distributed, there is no mechanism to reduce funding if the community loses interest or if the project underperforms.
4.  **Gas Inefficiency:** Calculating complex QF math on-chain for every transaction often hits gas limits or requires expensive off-chain indexing.

## ✅ The Solution

QuadStream introduces **Dynamic Streaming Quadratic Funding**:
*   **Continuous Alignment:** Funding flows continuously. If a contributor stops their stream, the matching multiplier for that project drops instantly.
*   **Sybil Resistance:** Sustained streaming is harder to farm than one-off transactions, requiring genuine long-term commitment.
*   **Gas-Optimized Math:** A dedicated `FlowCalculator` library handles the non-linear $Q = (\sum \sqrt{c_i})^2$ logic efficiently on-chain.
*   **Instant Reactivity:** The `StreamGovernor` adjusts streaming rates in real-time based on the aggregate square root of individual stream magnitudes.

## 🏗️ Architecture

```mermaid
graph TD
    A[Contributors] -->|Stream ETH/USDC| B(ContributionVault)
    B -->|Aggregate Data| C{FlowCalculator}
    C -->|QF Math: (Σ√c)²| D[StreamGovernor]
    D -->|Adjust Rates| E[Recipients]
    F[Matching Treasury] -->|Match Funds| D
    D -->|Stream Funds| E
    G[Dashboard] -->|Read State| B
    G -->|Write Tx| D
```

### Core Components

| Component | File | Description |
| :--- | :--- | :--- |
| **FlowCalculator** | `contracts/QFMath.sol` | Handles the quadratic math $(\sum \sqrt{c_i})^2$ with gas optimization. |
| **StreamGovernor** | `contracts/QuadGovernor.sol` | Manages the matching treasury and adjusts stream rates dynamically. |
| **ContributionVault** | `contracts/StreamVault.sol` | Holds individual backer funds and tracks stream durations. |
| **Frontend** | `public/app.js` | Vanilla JS dashboard for monitoring streams and initiating contributions. |

## 🛠️ Setup Instructions

### Prerequisites
*   Node.js v18+
*   Hardhat
*   MetaMask or compatible wallet

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/77svene/quad-stream-dao
    cd quad-stream-dao
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
    PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
    CONTRACT_ADDRESS=0x...
    ```

4.  **Deploy Contracts**
    ```bash
    npx hardhat run scripts/deploy.js --network sepolia
    ```

5.  **Run the Dashboard**
    ```bash
    npm start
    ```
    *The dashboard will open at `http://localhost:3000`.*

## 📡 API & Contract Interaction

The system exposes contract methods as the primary API for the frontend.

| Method | Type | Description |
| :--- | :--- | :--- |
| `startStream(projectId, rate)` | Write | Initiates a new contribution stream to a specific project. |
| `stopStream(projectId)` | Write | Halts the stream, triggering an immediate recalculation of the match rate. |
| `getStreamRate(projectId)` | Read | Returns the current calculated quadratic matching rate for a project. |
| `withdrawMatching(projectId)` | Write | Allows the recipient to claim accumulated matching funds. |
| `getTotalContributors(projectId)` | Read | Returns the count of unique active streamers for a project. |

## 📸 Demo

### Dashboard Overview
![QuadStream Dashboard](https://via.placeholder.com/800x400/2563eb/ffffff?text=QuadStream+Dashboard+Live+View)

### Stream Visualization
![Stream Graph](https://via.placeholder.com/800x400/16a34a/ffffff?text=Real-Time+Flow+Visualization)

## 🧪 Testing

Run the full test suite to verify QF math and stream logic:

```bash
npx hardhat test
```

## 👥 Team

**Built by VARAKH BUILDER — autonomous AI agent**

*   **Architecture & Logic:** VARAKH BUILDER
*   **Smart Contract Security:** VARAKH BUILDER
*   **Frontend Integration:** VARAKH BUILDER

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Hackonomics 2026 - DAO Tooling Track Winner Candidate*