import * as solanaWeb3 from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import * as mplBubblegum from "@metaplex-foundation/mpl-bubblegum";
import BN from "bn.js";
import * as bs58 from "bs58";
import * as solanaAccountCompression from "@solana/spl-account-compression";

import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,

} from "@solana/wallet-adapter-wallets";

import * as BufferLayout from "@solana/buffer-layout";
import { EMPTY_ADDRESS, serializeToU8ByteArray } from "./helpers";
import axios from "axios";

const publicKey = (property = "publicKey") => {
    return BufferLayout.blob(32, property);
};
const uint64 = (property = "uint64") => {
    return BufferLayout.blob(8, property);
};

const cNFTSwapProgramId = new solanaWeb3.PublicKey("6RUcK9T1hYAZGBxN82ERVDUi4vLAX4hN1zAyy3cU5jav"); // v2  HERE

type ProgramState = {
    is_initialized: number;
    fee_lamports: Uint8Array;
    dev_percentage: number;
    dev_treasury: Uint8Array;
    mcdegens_treasury: Uint8Array;
}

const PROGRAM_STATE = BufferLayout.struct<ProgramState>([
    BufferLayout.u8("is_initialized"),
    uint64("fee_lamports"),
    BufferLayout.u8("dev_percentage"),
    publicKey("dev_treasury"),
    publicKey("mcdegens_treasury"),
]);

type SwapState = {
    is_initialized: number;
    utime: Uint8Array;
    is_swap: number;
    initializer: string;
    delegate: string;
    asset_id: string;
    merkle_tree: string;
    root: string;
    data_hash: string;
    creator_hash: string;
    nonce: string;
    swap_asset_id: string;
    swap_merkle_tree: string;
    swap_root: string;
    swap_data_hash: string;
    swap_creator_hash: string;
    swap_nonce: string;
    swap_leaf_owner: string;
    swap_delegate: string;
    swap_lamports: string;
    swap_token_mint: string;
    swap_tokens: string;
}

const SWAP_STATE = BufferLayout.struct<SwapState>([
    BufferLayout.u8("is_initialized"),
    uint64("utime"),  // HERE
    BufferLayout.u8("is_swap"),
    publicKey("initializer"),
    publicKey("delegate"),  // HERE
    publicKey("asset_id"),
    publicKey("merkle_tree"),
    publicKey("root"),
    publicKey("data_hash"),
    publicKey("creator_hash"),
    uint64("nonce"),
    publicKey("swap_asset_id"),
    publicKey("swap_merkle_tree"),
    publicKey("swap_root"),
    publicKey("swap_data_hash"),
    publicKey("swap_creator_hash"),
    uint64("swap_nonce"),
    publicKey("swap_leaf_owner"),
    publicKey("swap_delegate"),  // HERE
    uint64("swap_lamports"),
    publicKey("swap_token_mint"),
    uint64("swap_tokens"),
]);

export type CnftSwapRequest = {
    provider: PhantomWalletAdapter | SolflareWalletAdapter;
    connection: Connection;
    taker: string;
    swapAssetId: string;
    assetId: string;
    swapLamports: number;
    heliusApiKey: string;
}

export async function initializeSwap(swap: CnftSwapRequest): Promise<void | string> {
    const {
        provider,
        connection,
        taker,
        swapAssetId,
        assetId,
        swapLamports,
        heliusApiKey,
    } = swap;

    const isSwap = swapAssetId === EMPTY_ADDRESS;

    const publicKey = provider.publicKey;
    if (!publicKey) {
        throw new Error("wallet pubkey is missing from swap request")
    }
    let swapTokenMint = new solanaWeb3.PublicKey("AVm6WLmMuzdedAMjpXLYmSGjLLPPjjVWNuR6JJhJLWn3");
    let swapTokens = 100000000;
    const heliusUrl = "https://rpc.helius.xyz/?api-key=" + heliusApiKey;


    // let cNFTSwapProgramId = new solanaWeb3.PublicKey("ABDXeLg3NiQKf7xRyEjZ3HTCTP1dWezCAjVmxJ8NdWz1"); // v0
    // let cNFTSwapProgramId = new solanaWeb3.PublicKey("8Tg1SpWz9JNr5praJssiALNs3G6GQU5qvuoxf85aRh74"); // v1


    // HERE  now reading the following 3 vars from program state
    // let devTreasury = new solanaWeb3.PublicKey("2Gs1H87sQDmHS91iXaVQnhdWTGzsgo2vypAwdDRJTLqX");
    // let mcDegensTreasury = new solanaWeb3.PublicKey("GUFxwDrsLzSQ27xxTVe4y9BARZ6cENWmjzwe8XPy7AKu");
    // let feeLamports = 25_000_000;
    let programStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-program-state")],
        cNFTSwapProgramId
    );

    const programState = await connection.getAccountInfo(
        programStatePDA[0]
    );

    let feeLamports = null;
    let devTreasury = null;
    let mcDegensTreasury = null;
    if (programState != null) {
        const encodedProgramStateData = programState.data;
        const decodedProgramStateData = PROGRAM_STATE.decode(
            encodedProgramStateData
        );

        feeLamports = new BN(decodedProgramStateData.fee_lamports, 10, "le");
        devTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury);
        mcDegensTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury);
    } else {

        return;
    }

    const axiosInstance = axios.create({
        baseURL: heliusUrl,
    });

    const getAsset = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAsset",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    });
    // HERE 
    let delegate = provider.publicKey;
    if (getAsset.data.result.ownership.delegated == true) {
        delegate = new solanaWeb3.PublicKey(getAsset.data.result.ownership.delegate);
    }

    if (getAsset.data.result.ownership.owner != provider.publicKey) {
        return;
    }

    const getAssetProof = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAssetProof",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    });

    const treeAccount = await solanaAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
        connection,
        new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),
    );
    const treeAuthorityPDA = treeAccount.getAuthority();
    const canopyDepth = treeAccount.getCanopyDepth();

    // parse the list of proof addresses into a valid AccountMeta[]
    const proof = getAssetProof.data.result.proof
        .slice(0, getAssetProof.data.result.proof.length - (!!canopyDepth ? canopyDepth : 0))
        .map((node: solanaWeb3.PublicKeyInitData) => ({
            pubkey: new solanaWeb3.PublicKey(node),
            isWritable: false,
            isSigner: false,
        }));

    let swapAssetOwner = taker;
    let swapDelegate = taker;
    let swapDatahash = "11111111111111111111111111111111";
    let swapCreatorhash = "11111111111111111111111111111111";
    let swapLeafId = 0;
    let swapTreeId = "11111111111111111111111111111111";
    let swapRoot = "11111111111111111111111111111111";
    let swapProof = null;
    if (isSwap == true) {
        let getSwapAsset = await axiosInstance.post(heliusUrl, {
            jsonrpc: "2.0",
            method: "getAsset",
            id: "rpd-op-123",
            params: {
                id: swapAssetId
            },
        });

        swapAssetOwner = getSwapAsset.data.result.ownership.owner;
        // HERE
        if (getSwapAsset.data.result.ownership.delegated == true) {
            swapDelegate = getSwapAsset.data.result.ownership.delegate;
        }
        swapDatahash = getSwapAsset.data.result.compression.data_hash;
        swapCreatorhash = getSwapAsset.data.result.compression.creator_hash;
        swapLeafId = getSwapAsset.data.result.compression.leaf_id;

        const getSwapAssetProof = await axiosInstance.post(heliusUrl, {
            jsonrpc: "2.0",
            method: "getAssetProof",
            id: "rpd-op-123",
            params: {
                id: swapAssetId
            },
        });


        swapTreeId = getSwapAssetProof.data.result.tree_id;
        let swapProofTotal = getSwapAssetProof.data.result.proof;
        swapRoot = getSwapAssetProof.data.result.root;




        const swapTreeAccount = await solanaAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
            connection,
            new solanaWeb3.PublicKey(getSwapAssetProof.data.result.tree_id),
        );

        const swapCanopyDepth = swapTreeAccount.getCanopyDepth();


        // parse the list of proof addresses into a valid AccountMeta[]
        swapProof = getSwapAssetProof.data.result.proof
            .slice(0, getSwapAssetProof.data.result.proof.length - (!!swapCanopyDepth ? swapCanopyDepth : 0))
            .map((node: solanaWeb3.PublicKeyInitData) => ({
                pubkey: new solanaWeb3.PublicKey(node),
                isWritable: false,
                isSigner: false,
            }));

    }

    // TODO investigate type conflict here
    let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-vault")],
        cNFTSwapProgramId
    ) as any;

    if (getAsset.data.result.ownership.owner == swapVaultPDA || swapAssetOwner == swapVaultPDA) {
        return;
    }

    let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-swap"), new solanaWeb3.PublicKey(assetId).toBytes(), new solanaWeb3.PublicKey(swapAssetId).toBytes()],
        cNFTSwapProgramId
    );

    let tokenATA: null | solanaWeb3.PublicKey = null;
    let createTokenATA = null;
    let createTokenATAIx: solanaWeb3.TransactionInstruction | null = null;
    if (swapTokens > 0) {
        tokenATA = await splToken.getAssociatedTokenAddress(
            swapTokenMint,
            provider.publicKey,
            false,
            splToken.TOKEN_PROGRAM_ID,
            splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        );


        await connection.getAccountInfo(
            tokenATA
        )
            .then(
                function (response) {

                    if (response == null && provider.publicKey && tokenATA) {
                        createTokenATA = true;
                        createTokenATAIx = splToken.createAssociatedTokenAccountInstruction(
                            provider.publicKey,
                            tokenATA,
                            provider.publicKey,
                            swapTokenMint,
                            splToken.TOKEN_PROGRAM_ID,
                            splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
                        )

                    } else {
                        createTokenATA = false;
                    }
                }
            )
            .catch(
                function (error) {
                    error = JSON.stringify(error);
                    error = JSON.parse(error);

                    return;
                }
            );
    }

    // HERE
    var totalSize = 1 + 1 + 32 + 32 + 32 + 32 + 8 + 32 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 1 + 8 + 32 + 8;
    // var totalSize = 1 + 1 + 32 + 32 + 32 + 32 + 8 + 32 + 32 + 32 + 32 + 8 + 1 + 8 + 32 + 8;

    var uarray = new Uint8Array(totalSize);
    let counter = 0;
    uarray[counter++] = 0; // 0 = cnft_swap InitializeSwap instruction

    if (isSwap == true) {
        uarray[counter++] = 1;
    } else {
        uarray[counter++] = 0;
    }

    let assetIdb58 = bs58.decode(assetId);
    var arr = Array.prototype.slice.call(Buffer.from(assetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let rootb58 = bs58.decode(getAssetProof.data.result.root);
    var arr = Array.prototype.slice.call(Buffer.from(rootb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let datahashb58 = bs58.decode(getAsset.data.result.compression.data_hash);
    var arr = Array.prototype.slice.call(Buffer.from(datahashb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let creatorhashb58 = bs58.decode(getAsset.data.result.compression.creator_hash);
    var arr = Array.prototype.slice.call(Buffer.from(creatorhashb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    for (var index = 0; index < byteArray.length; index++) {
        var byte = getAsset.data.result.compression.leaf_id & 0xff;
        byteArray[index] = byte;
        getAsset.data.result.compression.leaf_id = (getAsset.data.result.compression.leaf_id - byte) / 256;
    }
    for (let i = 0; i < byteArray.length; i++) {
        uarray[counter++] = byteArray[i];
    }

    let swapAssetIdb58 = bs58.decode(swapAssetId);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    // HERE
    let swapTreeId58 = bs58.decode(swapTreeId);
    var arr = Array.prototype.slice.call(Buffer.from(swapTreeId58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let swapAssetRootb58 = bs58.decode(swapRoot);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetRootb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let swapAssetDatahashb58 = bs58.decode(swapDatahash);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetDatahashb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let swapAssetCreatorhashb58 = bs58.decode(swapCreatorhash);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetCreatorhashb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    // HERE
    let swapAssetOwnerb58 = bs58.decode(swapAssetOwner);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetOwnerb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    // HERE
    let swapDelegateb58 = bs58.decode(swapDelegate);
    var arr = Array.prototype.slice.call(Buffer.from(swapDelegateb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    const swapLeafIdByteArray = serializeToU8ByteArray(swapLeafId);

    for (let i = 0; i < swapLeafIdByteArray.length; i++) {
        uarray[counter++] = swapLeafIdByteArray[i];
    }

    uarray[counter++] = proof.length;

    const swapLamportsByteArray = serializeToU8ByteArray(swapLamports);
    for (let i = 0; i < swapLamportsByteArray.length; i++) {
        uarray[counter++] = swapLamportsByteArray[i];
    }

    let swapTokenMintb58 = bs58.decode(swapTokenMint.toString());
    var arr = Array.prototype.slice.call(Buffer.from(swapTokenMintb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    const swapTokensByteArray = serializeToU8ByteArray(swapTokens);
    for (let i = 0; i < swapTokensByteArray.length; i++) {
        uarray[counter++] = swapTokensByteArray[i];
    }


    let keys = [
        { pubkey: provider.publicKey, isSigner: true, isWritable: true }, // 0
        { pubkey: swapVaultPDA[0], isSigner: false, isWritable: true }, // 1
        { pubkey: swapStatePDA[0], isSigner: false, isWritable: true }, // 2
        { pubkey: treeAuthorityPDA, isSigner: false, isWritable: false }, // 3
        { pubkey: new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id), isSigner: false, isWritable: true }, // 4
        { pubkey: delegate, isSigner: false, isWritable: true }, // 5  HERE
        // { pubkey: new solanaWeb3.PublicKey(swapTreeId), isSigner: false, isWritable: false }, // 5  HERE  No longer needed
        // { pubkey: new solanaWeb3.PublicKey(swapAssetOwner), isSigner: false, isWritable: false }, // 6  HERE  No longer needed
        { pubkey: mplBubblegum.MPL_BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false }, // 6
        { pubkey: solanaAccountCompression.PROGRAM_ID, isSigner: false, isWritable: false }, // 7
        { pubkey: solanaAccountCompression.SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false }, // 8
        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 9
        { pubkey: programStatePDA[0], isSigner: false, isWritable: false }, // 10  HERE  I renamed cNFTProgramStatePDA to programStatePDA :)
        // { pubkey: cNFTProgramStatePDA[0], isSigner: false, isWritable: false }, // 11
        // { pubkey: tempFeeAccount.publicKey, isSigner: false, isWritable: true }, // 12  HERE  No longer needed
        { pubkey: devTreasury, isSigner: false, isWritable: true }, // 11
        { pubkey: mcDegensTreasury, isSigner: false, isWritable: true }, // 12
    ];
    for (let i = 0; i < proof.length; i++) {
        keys.push(proof[i]);
    }

    const initializeSwapIx = new solanaWeb3.TransactionInstruction({
        programId: cNFTSwapProgramId,
        data: Buffer.from(
            uarray
        ),
        keys: keys,
    });

    const slot = await connection.getSlot();
    const [createALTIx, lookupTableAddress] =
        solanaWeb3.AddressLookupTableProgram.createLookupTable({
            authority: provider.publicKey,
            payer: provider.publicKey,
            recentSlot: slot,
        });

    let proofPubkeys = [];
    for (let i = 0; i < proof.length; i++) {
        proofPubkeys.push(proof[i].pubkey);
    }

    const extendALTIx = solanaWeb3.AddressLookupTableProgram.extendLookupTable({
        payer: provider.publicKey,
        authority: provider.publicKey,
        lookupTable: lookupTableAddress,
        addresses: [
            // HERE
            // cNFTSwapProgramId,
            // solanaWeb3.SystemProgram.programId,
            // mplBubblegum.PROGRAM_ID,
            // solanaAccountCompression.PROGRAM_ID,
            // solanaAccountCompression.SPL_NOOP_PROGRAM_ID,
            // swapVaultPDA[0],
            // devTreasury,
            // mcDegensTreasury,
            ...proofPubkeys,
        ],
    });

    // let msLookupTable = new solanaWeb3.PublicKey("ETunTW1EtRgZVuUGAhzjmzAWibsJ4h8CYQ13nMVirXtk"); // devnet
    let msLookupTable = new solanaWeb3.PublicKey("6rztYc8onxK3FUku97XJrzvdZHqWavwx5xw8fB7QufCA"); // mainnet    
    const msLookupTableAccount = await connection
        .getAddressLookupTable(msLookupTable)
        .then((res) => res.value);
    if (!msLookupTableAccount) {

        return;
    }

    let mcswapMessageV0 = new solanaWeb3.TransactionMessage({
        payerKey: provider.publicKey,
        recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
        instructions: [createALTIx, extendALTIx],
    }).compileToV0Message([msLookupTableAccount]);

    const createALTTx = new solanaWeb3.VersionedTransaction(mcswapMessageV0);
    let signedTx = await provider.signTransaction(createALTTx);
    await connection.sendTransaction(signedTx);

    // we wait for an update...
    await new Promise(_ => setTimeout(_, 10000));

    const lookupTableAccount = await connection
        .getAddressLookupTable(lookupTableAddress)
        .then((res) => res.value);
    if (!lookupTableAccount) {

        return;
    }

    let messageV0 = null;
    if (createTokenATA == true && createTokenATAIx) {
        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [createTokenATAIx, initializeSwapIx],  // HERE
            // instructions: [createTempFeeAccountIx, createTokenATAIx, initializeSwapIx],
        }).compileToV0Message([lookupTableAccount]);

    } else {
        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [initializeSwapIx],  // HERE
            // instructions: [createTempFeeAccountIx, initializeSwapIx],
        }).compileToV0Message([lookupTableAccount]);

    }

    const tx = new solanaWeb3.VersionedTransaction(messageV0);

    let signedFinalTx = await provider.signTransaction(tx);
    // signedTx.sign([tempFeeAccount]);  // HERE
    return await connection.sendTransaction(signedFinalTx);
}

async function swapcNFTs(swap: CnftSwapRequest): Promise<void | string[]> {
    const {
        provider,
        connection,
        swapAssetId,
        assetId,
        heliusApiKey
    } = swap;

    let isSwap = swapAssetId === EMPTY_ADDRESS;

    const publicKey = provider.publicKey;
    if (!publicKey) {
        throw new Error("wallet pubkey is missing from swap request")
    }

    // these are passed
    const heliusUrl = "https://rpc.helius.xyz/?api-key=" + heliusApiKey;

    // HERE  now reading the following 3 vars from program state
    // let devTreasury = new solanaWeb3.PublicKey("2Gs1H87sQDmHS91iXaVQnhdWTGzsgo2vypAwdDRJTLqX");
    // let mcDegensTreasury = new solanaWeb3.PublicKey("GUFxwDrsLzSQ27xxTVe4y9BARZ6cENWmjzwe8XPy7AKu");
    // let feeLamports = 25_000_000;

    let programStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-program-state")],
        cNFTSwapProgramId
    )

    const programState = await connection.getAccountInfo(
        programStatePDA[0]
    );

    let feeLamports = null;
    let devTreasury = null;
    let mcDegensTreasury = null;
    if (programState != null) {
        const encodedProgramStateData = programState.data;
        const decodedProgramStateData = PROGRAM_STATE.decode(
            encodedProgramStateData
        );

        feeLamports = new BN(decodedProgramStateData.fee_lamports, 10, "le");
        devTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury);
        mcDegensTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury);
    } else {
        return;
    }

    let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-swap"), new solanaWeb3.PublicKey(assetId).toBytes(), new solanaWeb3.PublicKey(swapAssetId).toBytes()],
        cNFTSwapProgramId
    )

    const swapState = await connection.getAccountInfo(
        swapStatePDA[0]
    );

    let swapInitializer = null;
    let swapLeafOwner = null;
    let swapDelegate = null;
    let swapLamports = null;
    let swapTokens = null;
    let swapTokenMint = null;
    if (swapState != null) {
        const encodedSwapStateData = swapState.data;
        const decodedSwapStateData = SWAP_STATE.decode(
            encodedSwapStateData
        );


        if (new BN(decodedSwapStateData.is_swap, 10, "le") == 0) {
            isSwap = false
        }
        swapInitializer = new solanaWeb3.PublicKey(decodedSwapStateData.initializer);
        swapLeafOwner = new solanaWeb3.PublicKey(decodedSwapStateData.swap_leaf_owner);
        swapDelegate = new solanaWeb3.PublicKey(decodedSwapStateData.swap_delegate);
        swapLamports = new BN(decodedSwapStateData.swap_lamports, 10, "le");
        swapTokenMint = new solanaWeb3.PublicKey(decodedSwapStateData.swap_token_mint);
        swapTokens = new BN(decodedSwapStateData.swap_tokens, 10, "le");
    } else {
        return;
    }

    const axiosInstance = axios.create({
        baseURL: heliusUrl,
    });

    const getAsset = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAsset",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    })

    const getAssetProof = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAssetProof",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    })

    const treeAccount = await solanaAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
        connection,
        new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),
    );
    const treeAuthorityPDA = treeAccount.getAuthority();
    const canopyDepth = treeAccount.getCanopyDepth()

    // parse the list of proof addresses into a valid AccountMeta[]
    const proof = getAssetProof.data.result.proof
        .slice(0, getAssetProof.data.result.proof.length - (!!canopyDepth ? canopyDepth : 0))
        .map((node: solanaWeb3.PublicKeyInitData) => ({
            pubkey: new solanaWeb3.PublicKey(node),
            isWritable: false,
            isSigner: false,
        }))

    let swapDatahash = "11111111111111111111111111111111";
    let swapCreatorhash = "11111111111111111111111111111111";
    let swapLeafId = 0;
    let swapTreeId = "11111111111111111111111111111111";
    let swapRoot = "11111111111111111111111111111111";
    let swapTreeAuthorityPDA = new solanaWeb3.PublicKey("11111111111111111111111111111111");
    let swapProof = null;
    if (isSwap == true) {
        const getSwapAsset = await axiosInstance.post(heliusUrl, {
            jsonrpc: "2.0",
            method: "getAsset",
            id: "rpd-op-123",
            params: {
                id: swapAssetId
            },
        });
        swapDatahash = getSwapAsset.data.result.compression.data_hash;
        swapCreatorhash = getSwapAsset.data.result.compression.creator_hash;
        swapLeafId = getSwapAsset.data.result.compression.leaf_id;

        const getSwapAssetProof = await axiosInstance.post(heliusUrl, {
            jsonrpc: "2.0",
            method: "getAssetProof",
            id: "rpd-op-123",
            params: {
                id: swapAssetId
            },
        });
        swapTreeId = getSwapAssetProof.data.result.tree_id;
        swapRoot = getSwapAssetProof.data.result.root;

        const swapTreeAccount = await solanaAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
            connection,
            new solanaWeb3.PublicKey(getSwapAssetProof.data.result.tree_id),
        );
        swapTreeAuthorityPDA = swapTreeAccount.getAuthority();
        const swapCanopyDepth = swapTreeAccount.getCanopyDepth();

        // parse the list of proof addresses into a valid AccountMeta[]
        swapProof = getSwapAssetProof.data.result.proof
            .slice(0, getSwapAssetProof.data.result.proof.length - (!!swapCanopyDepth ? swapCanopyDepth : 0))
            .map((node: solanaWeb3.PublicKeyInitData) => ({
                pubkey: new solanaWeb3.PublicKey(node),
                isWritable: false,
                isSigner: false,
            }));
    }

    // TODO type issue here
    let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-vault")],
        cNFTSwapProgramId
    ) as any

    if (getAsset.data.result.ownership.owner == swapVaultPDA || swapLeafOwner == swapVaultPDA) {
        return
    }

    // HERE  I moved cNFTProgramStatePDA to the beginning of this function
    // let cNFTProgramStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
    //     [Buffer.from("cNFT-program-state")],
    //     cNFTSwapProgramId
    // );


    // HERE  No longer needed
    // const totalFee = parseInt(feeLamports) + parseInt(swapLamports);

    // const tempFeeAccount = new solanaWeb3.Keypair();

    // const createTempFeeAccountIx = solanaWeb3.SystemProgram.createAccount({
    //     programId: cNFTSwapProgramId,
    //     space: 0,
    //     lamports: totalFee,
    //     fromPubkey: provider.publicKey,
    //     newAccountPubkey: tempFeeAccount.publicKey,
    // });    


    const providerTokenATA = await splToken.getAssociatedTokenAddress(
        swapTokenMint,
        provider.publicKey,
        false,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    // HERE  No longer needed
    // const tempTokenAccount = new solanaWeb3.Keypair();
    // let createTempTokenAccountIx = null;
    // let initTempTokenAccountIx = null;
    // let transferTokenIx = null;
    // if (swapTokens > 0) {
    //  
    //     createTempTokenAccountIx = solanaWeb3.SystemProgram.createAccount({
    //         programId: splToken.TOKEN_PROGRAM_ID,
    //         space: splToken.AccountLayout.span,
    //         lamports: await connection.getMinimumBalanceForRentExemption(
    //             splToken.AccountLayout.span
    //         ),
    //         fromPubkey: provider.publicKey,
    //         newAccountPubkey: tempTokenAccount.publicKey,
    //     });    
    //  

    //     initTempTokenAccountIx = splToken.createInitializeAccountInstruction(
    //         tempTokenAccount.publicKey,
    //         swapTokenMint,
    //         tempTokenAccount.publicKey,
    //         splToken.TOKEN_PROGRAM_ID
    //     );
    //  

    //     transferTokenIx = splToken.createTransferInstruction(
    //         providerTokenATA,
    //         tempTokenAccount.publicKey,
    //         provider.publicKey,
    //         parseInt(swapTokens),
    //         provider.publicKey,
    //         splToken.TOKEN_PROGRAM_ID,
    //     )
    //  
    // }

    const initializerTokenATA = await splToken.getAssociatedTokenAddress(
        swapTokenMint,
        swapInitializer,
        false,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    var totalSize = 1 + 32 + 32 + 1 + 1

    var uarray = new Uint8Array(totalSize);
    let counter = 0;
    uarray[counter++] = 1; // 1 = cnft_swap SwapcNFTs instruction

    let assetIdb58 = bs58.decode(assetId);
    var arr = Array.prototype.slice.call(Buffer.from(assetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let swapAssetIdb58 = bs58.decode(swapAssetId);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    uarray[counter++] = proof.length;
    if (isSwap == true) {
        uarray[counter++] = swapProof.length;
    } else {
        uarray[counter++] = 0;
    }

    let keys = [
        { pubkey: provider.publicKey, isSigner: true, isWritable: true }, // 0
        { pubkey: new solanaWeb3.PublicKey(swapInitializer), isSigner: false, isWritable: true }, // 1
        { pubkey: swapVaultPDA[0], isSigner: false, isWritable: true }, // 2
        { pubkey: swapStatePDA[0], isSigner: false, isWritable: true }, // 3
        { pubkey: treeAuthorityPDA, isSigner: false, isWritable: false }, // 4
        { pubkey: new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id), isSigner: false, isWritable: true }, // 5
        { pubkey: swapTreeAuthorityPDA, isSigner: false, isWritable: false }, // 6
        { pubkey: new solanaWeb3.PublicKey(swapTreeId), isSigner: false, isWritable: true }, // 7 
        { pubkey: new solanaWeb3.PublicKey(swapDelegate), isSigner: false, isWritable: true }, // 8  HERE
        { pubkey: mplBubblegum.MPL_BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false }, // 9
        { pubkey: solanaAccountCompression.PROGRAM_ID, isSigner: false, isWritable: false }, // 10
        { pubkey: solanaAccountCompression.SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false }, // 11
        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 12
        { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 13
        { pubkey: programStatePDA[0], isSigner: false, isWritable: false }, // 14  HERE Changed cNFTProgramStatePDA to programStatePDA :)
        // { pubkey: cNFTProgramStatePDA[0], isSigner: false, isWritable: false }, // 13
        // { pubkey: tempFeeAccount.publicKey, isSigner: true, isWritable: true }, // 14  HERE No longer needed
        { pubkey: providerTokenATA, isSigner: false, isWritable: true }, // 15  HERE Changed tempTokenAccount to providerTokenATA
        // { pubkey: tempTokenAccount.publicKey, isSigner: true, isWritable: true }, // 14
        { pubkey: initializerTokenATA, isSigner: false, isWritable: true }, // 16
        { pubkey: devTreasury, isSigner: false, isWritable: true }, // 17
        { pubkey: mcDegensTreasury, isSigner: false, isWritable: true }, // 18
    ];
    for (let i = 0; i < proof.length; i++) {
        keys.push(proof[i]);
    }

    if (isSwap == true) {
        for (let i = 0; i < swapProof.length; i++) {
            keys.push(swapProof[i]);
        }


        const swapcNFTsIx = new solanaWeb3.TransactionInstruction({
            programId: cNFTSwapProgramId,
            data: Buffer.from(
                uarray
            ),
            keys: keys,
        })

        const slot = await connection.getSlot();
        const [createALTIx, lookupTableAddress] =
            solanaWeb3.AddressLookupTableProgram.createLookupTable({
                authority: provider.publicKey,
                payer: provider.publicKey,
                recentSlot: slot,
            })

        const txnIds: string[] = [];
        let proofPubkeys = [];
        for (let i = 0; i < proof.length; i++) {
            proofPubkeys.push(proof[i].pubkey);


            let swapProofPubkeys = [];
            if (isSwap == true) {
                // for (let i = 0; i < swapProof.length; i++) {  HERE
                for (let i = 0; i < swapProof.length - 1; i++) {  // The magic - 1 :)
                    swapProofPubkeys.push(swapProof[i].pubkey);
                }


                // HERE 
                let extendALTIx = null;
                if (isSwap == true) {
                    extendALTIx = solanaWeb3.AddressLookupTableProgram.extendLookupTable({
                        payer: provider.publicKey,
                        authority: provider.publicKey,
                        lookupTable: lookupTableAddress,
                        addresses: [
                            // cNFTSwapProgramId,
                            // solanaWeb3.SystemProgram.programId,
                            // mplBubblegum.PROGRAM_ID,
                            // solanaAccountCompression.PROGRAM_ID,
                            // solanaWeb3.SystemProgram.programId,
                            // splToken.TOKEN_PROGRAM_ID,
                            // devTreasury,
                            // mcDegensTreasury,
                            // provider.publicKey,
                            // new solanaWeb3.PublicKey(swapInitializer),
                            // solanaAccountCompression.SPL_NOOP_PROGRAM_ID,
                            // programStatePDA[0],
                            // swapVaultPDA[0],
                            // swapStatePDA[0],
                            // treeAuthorityPDA,
                            // new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),
                            // swapTreeAuthorityPDA,
                            // new solanaWeb3.PublicKey(swapTreeId),
                            // initializerTokenATA,
                            ...proofPubkeys,
                            ...swapProofPubkeys,
                        ],
                    });
                } else {
                    extendALTIx = solanaWeb3.AddressLookupTableProgram.extendLookupTable({
                        payer: provider.publicKey,
                        authority: provider.publicKey,
                        lookupTable: lookupTableAddress,
                        addresses: [
                            // provider.publicKey,
                            // new solanaWeb3.PublicKey(swapInitializer),
                            // cNFTSwapProgramId,
                            // solanaWeb3.SystemProgram.programId,
                            // mplBubblegum.PROGRAM_ID,
                            // solanaAccountCompression.PROGRAM_ID,
                            // solanaAccountCompression.SPL_NOOP_PROGRAM_ID,
                            // swapVaultPDA[0],
                            // swapStatePDA[0],
                            // devTreasury,
                            // mcDegensTreasury,
                            // treeAuthorityPDA,
                            // new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),
                            // swapTreeAuthorityPDA,
                            // new solanaWeb3.PublicKey(swapTreeId),
                            // solanaWeb3.SystemProgram.programId,
                            // splToken.TOKEN_PROGRAM_ID,
                            // programStatePDA[0],
                            // initializerTokenATA,
                            ...proofPubkeys,
                        ],
                    });


                    // let msLookupTable = new solanaWeb3.PublicKey("ETunTW1EtRgZVuUGAhzjmzAWibsJ4h8CYQ13nMVirXtk"); // devnet
                    let msLookupTable = new solanaWeb3.PublicKey("6rztYc8onxK3FUku97XJrzvdZHqWavwx5xw8fB7QufCA"); // mainnet    
                    const msLookupTableAccount = await connection
                        .getAddressLookupTable(msLookupTable)
                        .then((res) => res.value);
                    if (!msLookupTable || !msLookupTableAccount) {
                        return;
                    }

                    let mcswapMessageV0 = new solanaWeb3.TransactionMessage({
                        payerKey: provider.publicKey,
                        recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
                        instructions: [createALTIx, extendALTIx],
                    }).compileToV0Message([msLookupTableAccount]);

                    const createALTTx = new solanaWeb3.VersionedTransaction(mcswapMessageV0);

                    let signedTx = await provider.signTransaction(createALTTx);
                    await connection.sendTransaction(signedTx);


                    await new Promise(_ => setTimeout(_, 10000));

                    // HERE Compute unit instructions
                    // Create the priority fee instructions
                    const computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 1,
                    });

                    const computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({
                        units: 250_000,
                    });

                    const lookupTableAccount = await connection
                        .getAddressLookupTable(lookupTableAddress)
                        .then((res) => res.value);
                    if (!lookupTableAccount) {
                        return;
                    }

                    // HERE    
                    let messageV0 = new solanaWeb3.TransactionMessage({
                        payerKey: provider.publicKey,
                        recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
                        instructions: [computePriceIx, computeLimitIx, swapcNFTsIx],
                    }).compileToV0Message([lookupTableAccount]);
                    // let messageV0 = null;
                    // if (swapTokens > 0) {
                    //     messageV0 = new solanaWeb3.TransactionMessage({
                    //         payerKey: provider.publicKey,
                    //         recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
                    //         instructions: [
                    //             createTempFeeAccountIx, 
                    //             createTempTokenAccountIx, 
                    //             initTempTokenAccountIx, 
                    //             transferTokenIx, 
                    //             swapcNFTsIx],
                    //     }).compileToV0Message([lookupTableAccount]);
                    // } else {
                    //     messageV0 = new solanaWeb3.TransactionMessage({
                    //         payerKey: provider.publicKey,
                    //         recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
                    //         instructions: [createTempFeeAccountIx, swapcNFTsIx],
                    //     }).compileToV0Message([lookupTableAccount]);
                    // 

                    const tx = new solanaWeb3.VersionedTransaction(messageV0);

                    let signedFinalTx = await provider.signTransaction(tx);
                    // signedTx.sign([tempFeeAccount, tempTokenAccount]);  // HERE No longer needed
                    const txId = await connection.sendTransaction(signedTx);
                    txnIds.push(txId);

                }
            }
        }
        return txnIds;
    }
}

async function reverseSwap(swap: CnftSwapRequest, swapMint: string) {
    const {
        provider,
        connection,
        swapAssetId,
        assetId,
        heliusApiKey
    } = swap;

    const publicKey = provider.publicKey;
    if (!publicKey) {
        throw new Error("wallet pubkey is missing from swap request")
    }

    const heliusUrl = "https://rpc.helius.xyz/?api-key=" + heliusApiKey;

    let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-swap"), new solanaWeb3.PublicKey(assetId).toBytes(), new solanaWeb3.PublicKey(swapAssetId).toBytes()],
        cNFTSwapProgramId
    )

    const swapState = await connection.getAccountInfo(
        swapStatePDA[0]
    );

    if (swapState != null) {
        const encodedSwapStateData = swapState.data;
        const decodedSwapStateData = SWAP_STATE.decode(
            encodedSwapStateData
        );

    } else {
        return;
    }

    const axiosInstance = axios.create({
        baseURL: heliusUrl,
    });

    const getAsset = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAsset",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    })

    const getAssetProof = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAssetProof",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    })

    const treeAccount = await solanaAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
        connection,
        new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),
    );
    const treeAuthorityPDA = treeAccount.getAuthority();
    const canopyDepth = treeAccount.getCanopyDepth()

    // parse the list of proof addresses into a valid AccountMeta[]
    const proof = getAssetProof.data.result.proof
        .slice(0, getAssetProof.data.result.proof.length - (!!canopyDepth ? canopyDepth : 0))
        .map((node: solanaWeb3.PublicKeyInitData) => ({
            pubkey: new solanaWeb3.PublicKey(node),
            isWritable: false,
            isSigner: false,
        }))

    let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("cNFT-vault")],
        cNFTSwapProgramId
    )

    var totalSize = 1 + 32 + 32 + 1

    var uarray = new Uint8Array(totalSize);
    let counter = 0;
    uarray[counter++] = 2; // 2 = cnft_swap ReverseSwap instruction

    let assetIdb58 = bs58.decode(assetId);
    var arr = Array.prototype.slice.call(Buffer.from(assetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let swapAssetIdb58 = bs58.decode(swapAssetId);
    var arr = Array.prototype.slice.call(Buffer.from(swapAssetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    uarray[counter++] = proof.length;

    let keys = [
        { pubkey: publicKey, isSigner: true, isWritable: true }, // 0
        { pubkey: swapVaultPDA[0], isSigner: false, isWritable: true }, // 1
        { pubkey: swapStatePDA[0], isSigner: false, isWritable: true }, // 2
        { pubkey: treeAuthorityPDA, isSigner: false, isWritable: false }, // 3
        { pubkey: new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id), isSigner: false, isWritable: true }, // 4
        { pubkey: new solanaWeb3.PublicKey(mplBubblegum.MPL_BUBBLEGUM_PROGRAM_ID), isSigner: false, isWritable: false }, // 5
        { pubkey: solanaAccountCompression.PROGRAM_ID, isSigner: false, isWritable: false }, // 6
        { pubkey: solanaAccountCompression.SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false }, // 7
        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 8
    ];
    for (let i = 0; i < proof.length; i++) {
        keys.push(proof[i]);


        const reverseSwapIx = new solanaWeb3.TransactionInstruction({
            programId: cNFTSwapProgramId,
            data: Buffer.from(
                uarray
            ),
            keys: keys,
        })

        let tx = new solanaWeb3.Transaction();
        tx.add(reverseSwapIx);
        tx.recentBlockhash = (await connection.getRecentBlockhash('confirmed')).blockhash;
        tx.feePayer = provider.publicKey

        let signedTransaction = await provider.signTransaction(tx);
        const serializedTransaction = signedTransaction.serialize();
        return connection.sendRawTransaction(
            serializedTransaction,
            { skipPreflight: false, preflightCommitment: 'confirmed' },
        );

    }

}