# McSwap TypeScript SDK

ATTN! In Development. Do not use in production at this time.

Welcome to the official TypeScript SDK for the McSwap protocol, brought to you by the McDegens DAO. This SDK enables developers to interact seamlessly with McSwap, the flagship dApp of McDegens DAO, for creating trustless peer-to-peer contracts. It supports transactions involving Solana SPL tokens, cNFTs, NFTs, and soon pNFTs, directly from your own TypeScript dapp.

## Features

- **NFT & cNFT Integration**: Seamlessly integrate with Solana NFTs and composite NFTs for your dApps.
- **Trustless Contracts**: Leverage McSwap protocol programs for secure, trustless peer-to-peer contracts for SPL/cNFT/NFT and soon pNFT standards.
- **Easy to Use**: Designed with developer experience in mind.

## Getting Started

### Installation

Install the McSwap TypeScript SDK using npm:

```bash
npm install mcswap

```
or yarn
```bash
yarn add @mcdegens/mcswap-sdk

```


Setup your dapp to utilize the swap methods you want
```typescript
import { initializeSwap, SplSwapRequest } from "mcswap/src/Spl";
import { Connection } from "@solana/web3.js";

import {
    PhantomWalletAdapter,
} from "@solana/wallet-adapter-wallets";

async function main() {
    const phantomAdapter = new PhantomWalletAdapter();
    const swapRequest: SplSwapRequest = {
        connection: new Connection(""),
        provider: phantomAdapter,
        taker: "",
        token1Amount: 0,
        token1Mint: "",
        token2Amount: 0,
        token2Mint: "",
        token3Amount: 0,
        token3Mint: "",
        token4Amount: 0,
        token4Mint: "",
    }

    const swapTxn = await initializeSwap(swapRequest);
    console.log(`swap txn ID: ${swapTxn}`);
}
```
