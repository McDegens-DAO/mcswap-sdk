import * as solanaWeb3 from "@solana/web3.js";
import { Connection, PublicKey } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import BN from "bn.js";
import * as bs58 from "bs58";
import * as mplToken from "@metaplex-foundation/mpl-token-metadata";

import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,

} from "@solana/wallet-adapter-wallets";

import * as BufferLayout from "@solana/buffer-layout";
import { serializeToU8ByteArray } from "./helpers";

const publicKey = (property = "publicKey") => {
    return BufferLayout.blob(32, property);
};
const uint64 = (property = "uint64") => {
    return BufferLayout.blob(8, property);
};

type ProgramState = {
    is_initialized: number;
    pickle_mint: Uint8Array;
    fee_chips: number;
    dev_percentage: number;
    dev_treasury: string;
    mcdegens_treasury: string;
    fee_lamports: number;
}

const PROGRAM_STATE = BufferLayout.struct<ProgramState>([
    BufferLayout.u8("is_initialized"),
    publicKey("pickle_mint"),
    uint64("fee_chips"),
    BufferLayout.u8("dev_percentage"),
    publicKey("dev_treasury"),
    publicKey("mcdegens_treasury"),
    BufferLayout.u8("fee_lamports"),
]);

type SwapState = {
    is_initialized: number;
    utime: Uint8Array;
    initializer: Uint8Array;
    token1_mint: Uint8Array;
    token1_amount: Uint8Array;
    temp_token1_account: Uint8Array;
    token2_mint: Uint8Array;
    token2_amount: Uint8Array;
    temp_token2_account: Uint8Array;
    taker: Uint8Array;
    token3_mint: Uint8Array;
    token3_amount: Uint8Array;
    token4_mint: Uint8Array;
    token4_amount: Uint8Array;
}

const SWAP_STATE = BufferLayout.struct<SwapState>([
    BufferLayout.u8("is_initialized"),
    uint64("utime"),  // HERE
    publicKey("initializer"),
    publicKey("token1_mint"),
    uint64("token1_amount"),
    publicKey("temp_token1_account"),
    publicKey("token2_mint"),
    uint64("token2_amount"),
    publicKey("temp_token2_account"),
    publicKey("taker"),
    publicKey("token3_mint"),
    uint64("token3_amount"),
    publicKey("token4_mint"),
    uint64("token4_amount"),
]);

type swapRequest = {
    provider: PhantomWalletAdapter | SolflareWalletAdapter;
    connection: Connection;
    mint: string;
    taker: string;
    takerMint: string;
    token1Mint: string;
    token1Amount: number;
    token2Mint: string;
    token2Amount: number;
    token3Mint: string;
    token3Amount: number;
    token4Mint: string;
    token4Amount: number;
}

export async function InitializeSwap(swap: swapRequest) {
    const {
        provider,
        connection,
        mint,
        taker,
        takerMint,
        token1Mint,
        token1Amount,
        token2Mint,
        token2Amount,
        token3Mint,
        token3Amount,
        token4Mint,
        token4Amount,
    } = swap;
    const publicKey = provider.publicKey;
    if (!publicKey) {
        throw new Error("wallet pubkey is missing from swap request")
    }
    let swapLamports = 1000;
    //  let swapTokenMint = new solanaWeb3.PublicKey("11111111111111111111111111111111");  // Use if no token
    let swapTokenMint = new solanaWeb3.PublicKey("AVm6WLmMuzdedAMjpXLYmSGjLLPPjjVWNuR6JJhJLWn3");
    let swapTokens = 1000000000;

    let isSwap = true;
    if (takerMint == "11111111111111111111111111111111") {
        isSwap = false
    }

    let pNFTSwapProgramId = new solanaWeb3.PublicKey("2bY36scRMEUJHJToVGjJ2uY8PdSrRPr73siNwGbv1ZNT");
    let splATAProgramId = new solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    let mplAuthRulesProgramId = new solanaWeb3.PublicKey("auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg");
    let mplAuthRulesAccount = new solanaWeb3.PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9");

    let programStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("program-state")],
        pNFTSwapProgramId
    );
    console.log("Program State PDA: ", programStatePDA[0].toString());
    let programLoaded: boolean = false;
    let programState: solanaWeb3.AccountInfo<Buffer> = {
        data: new Buffer(""),
        executable: false,
        lamports: 0,
        owner: programStatePDA[0],
    };
    await connection.getAccountInfo(
        programStatePDA[0]
    )
        .then(
            function (response) {
                if (response != null) {
                    programState = response;
                    programLoaded = true
                }
            }
        )
        .catch(
            function (error) {
                error = JSON.stringify(error);
                error = JSON.parse(error);
                console.log("Error: ", error);
                return;
            }
        );

    let feeLamports = null;
    let devTreasury = null;
    let mcDegensTreasury = null;
    if (programLoaded) {
        const encodedProgramStateData = programState.data;
        const decodedProgramStateData = PROGRAM_STATE.decode(
            encodedProgramStateData
        );
        console.log("programState - is_initialized: ", decodedProgramStateData.is_initialized);
        console.log("programState - fee_lamports: ", new BN(decodedProgramStateData.fee_lamports, 10, "le").toString());
        console.log("programState - dev_percentage: ", new BN(decodedProgramStateData.dev_percentage, 10, "le").toString());
        console.log("programState - dev_treasury: ", new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury).toString());
        console.log("programState - mcdegens_treasury: ", new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury).toString());

        feeLamports = new BN(decodedProgramStateData.fee_lamports, 10, "le");
        devTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury);
        mcDegensTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury);
    } else {
        console.log("Program State Not Initialized");
        return;
    }

    let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("swap-vault")],
        pNFTSwapProgramId
    );
    console.log("Swap Vault PDA: ", swapVaultPDA[0].toString());

    let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("swap-state"), new solanaWeb3.PublicKey(mint).toBytes(), new solanaWeb3.PublicKey(takerMint).toBytes()],
        pNFTSwapProgramId
    );
    console.log("Swap State PDA: ", swapStatePDA[0].toString());

    let providerMintATA = await splToken.getAssociatedTokenAddress(
        new solanaWeb3.PublicKey(mint),
        provider.publicKey,
        false,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    console.log("providerMintATA ", providerMintATA.toString());

    let tokenMetadataPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), new solanaWeb3.PublicKey(mint).toBytes()],
        mplToken.PROGRAM_ID,
    );
    console.log("Token Metadata PDA: ", tokenMetadataPDA[0].toString());

    let tokenMasterEditionPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), new solanaWeb3.PublicKey(mint).toBytes(), Buffer.from("edition")],
        mplToken.PROGRAM_ID
    );
    console.log("Token Master Edition PDA: ", tokenMasterEditionPDA[0].toString());

    let tokenDestinationATA = await splToken.getAssociatedTokenAddress(
        new solanaWeb3.PublicKey(mint),
        swapVaultPDA[0],
        true,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    console.log("tokenDestinationATA ", tokenDestinationATA);

    let tokenRecordPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"),
        mplToken.PROGRAM_ID.toBytes(),
        new solanaWeb3.PublicKey(mint).toBytes(),
        Buffer.from("token_record"),
        new solanaWeb3.PublicKey(providerMintATA).toBytes()],
        mplToken.PROGRAM_ID,
    );
    console.log("Token Record PDA ", tokenRecordPDA[0].toString());

    let tokenRecordDesinationPDA = solanaWeb3.PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"),
        mplToken.PROGRAM_ID.toBytes(),
        new solanaWeb3.PublicKey(mint).toBytes(),
        Buffer.from("token_record"),
        new solanaWeb3.PublicKey(tokenDestinationATA).toBytes()],
        mplToken.PROGRAM_ID,
    );
    console.log("Token Record Destination PDA ", tokenRecordDesinationPDA[0].toString());

    let createTakerMintATA: boolean = false;
    let takerMintATA: PublicKey | null = null;
    let createTakerMintATAIx = null;
    if (takerMint != "11111111111111111111111111111111") {
        takerMintATA = await splToken.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(takerMint),
            provider.publicKey,
            false,
            splToken.TOKEN_PROGRAM_ID,
            splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        );
        console.log("Taker Mint ATA: ", takerMintATA.toString());

        await connection.getAccountInfo(
            takerMintATA
        )
            .then(
                function (response) {
                    console.log("takerMintATA response ", response);
                    if (response == null && provider.publicKey && takerMintATA) {
                        createTakerMintATA = true;
                        createTakerMintATAIx = splToken.createAssociatedTokenAccountInstruction(
                            provider.publicKey,
                            takerMintATA,
                            provider.publicKey,
                            new solanaWeb3.PublicKey(takerMint),
                            splToken.TOKEN_PROGRAM_ID,
                            splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
                        )
                        console.log("Create Taker Mint ATA Ix: ", createTakerMintATAIx);
                    } else {
                        createTakerMintATA = false;
                    }
                }
            )
            .catch(
                function (error) {
                    error = JSON.stringify(error);
                    error = JSON.parse(error);
                    console.log("Error: ", error);
                    return;
                }
            );
    }

    let createSwapTokenATA: boolean | null = null;
    let createSwapTokenATAIx: solanaWeb3.TransactionInstruction | null = null;
    let swapTokenATA = await splToken.getAssociatedTokenAddress(
        swapTokenMint,
        provider.publicKey,
        false,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    console.log("Swap Token ATA: ", swapTokenATA.toString());

    await connection.getAccountInfo(
        swapTokenATA
    )
        .then(
            function (response) {
                console.log("swapMintATA response ", response);
                if (response == null && provider.publicKey) {
                    createSwapTokenATA = true;
                    createSwapTokenATAIx = splToken.createAssociatedTokenAccountInstruction(
                        provider.publicKey,
                        swapTokenATA,
                        provider.publicKey,
                        swapTokenMint,
                        splToken.TOKEN_PROGRAM_ID,
                        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
                    )
                    console.log("Create Swap Token ATA Ix: ", createSwapTokenATAIx);
                } else {
                    createSwapTokenATA = false;
                }
            }
        )
        .catch(
            function (error) {
                error = JSON.stringify(error);
                error = JSON.parse(error);
                console.log("Error: ", error);
                return;
            }
        );

    var totalSize = 1 + 1 + 32 + 32 + 8 + 32 + 8;
    console.log("totalSize", totalSize);

    var uarray = new Uint8Array(totalSize);
    let counter = 0;
    uarray[counter++] = 0; // 0 = nft_swap InitializeSwap instruction

    if (isSwap == true) {
        uarray[counter++] = 1;
    } else {
        uarray[counter++] = 0;
    }

    let takerb58 = bs58.decode(taker);
    var arr = Array.prototype.slice.call(Buffer.from(takerb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let takerMintb58 = bs58.decode(takerMint);
    var arr = Array.prototype.slice.call(Buffer.from(takerMintb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    const swapLamportsByteArray = serializeToU8ByteArray(swapLamports);
    for (let i = 0; i < swapLamportsByteArray.length; i++) {
        uarray[counter++] = swapLamportsByteArray[i];
    }

    let swapTokenMintb58 = bs58.decode(swapTokenMint.toString());
    var arr = Array.prototype.slice.call(Buffer.from(swapTokenMintb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    const swapTokensByteArray = serializeToU8ByteArray(swapLamports);
    for (let i = 0; i < swapTokensByteArray.length; i++) {
        uarray[counter++] = swapTokensByteArray[i];
    }

    console.log("Contract Data: ", uarray);

    const initializeSwapIx = new solanaWeb3.TransactionInstruction({
        programId: pNFTSwapProgramId,
        data: Buffer.from(
            uarray
        ),
        keys: [
            { pubkey: provider.publicKey, isSigner: true, isWritable: true }, // 0
            { pubkey: programStatePDA[0], isSigner: false, isWritable: false }, // 1
            { pubkey: swapVaultPDA[0], isSigner: false, isWritable: true }, // 2
            { pubkey: swapStatePDA[0], isSigner: false, isWritable: true }, // 3
            { pubkey: providerMintATA, isSigner: false, isWritable: true }, // 4
            { pubkey: new solanaWeb3.PublicKey(mint), isSigner: false, isWritable: false }, // 5
            { pubkey: tokenMetadataPDA[0], isSigner: false, isWritable: true }, // 6
            { pubkey: tokenMasterEditionPDA[0], isSigner: false, isWritable: false }, // 7
            { pubkey: tokenDestinationATA, isSigner: false, isWritable: true }, // 8
            { pubkey: tokenRecordPDA[0], isSigner: false, isWritable: true }, // 9
            { pubkey: tokenRecordDesinationPDA[0], isSigner: false, isWritable: true }, // 10
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 11
            { pubkey: solanaWeb3.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false }, // 12
            { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 13
            { pubkey: splATAProgramId, isSigner: false, isWritable: false }, // 14
            { pubkey: mplToken.PROGRAM_ID, isSigner: false, isWritable: false }, // 15
            { pubkey: mplAuthRulesProgramId, isSigner: false, isWritable: false }, // 16
            { pubkey: mplAuthRulesAccount, isSigner: false, isWritable: false }, // 17
            { pubkey: devTreasury, isSigner: false, isWritable: true }, // 18
            { pubkey: mcDegensTreasury, isSigner: false, isWritable: true }, // 19
        ]
    });
    console.log("Initialize Swap Ix: ", initializeSwapIx);

    const computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1,
    });

    const computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000,
    });

    let messageV0 = null;
    if (createTakerMintATA &&
        createSwapTokenATA &&
        createTakerMintATAIx &&
        createSwapTokenATAIx) {
        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [
                computePriceIx,
                computeLimitIx,
                createTakerMintATAIx,
                createSwapTokenATAIx,
                initializeSwapIx
            ],
        }).compileToV0Message([]);
    } else if (createTakerMintATA && createTakerMintATAIx) {
        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [
                computePriceIx,
                computeLimitIx,
                createTakerMintATAIx,
                initializeSwapIx
            ],
        }).compileToV0Message([]);
    } else if (createSwapTokenATA && createSwapTokenATAIx) {
        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [
                computePriceIx,
                computeLimitIx,
                createSwapTokenATAIx,
                initializeSwapIx
            ],
        }).compileToV0Message([]);
    } else {
        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [
                computePriceIx,
                computeLimitIx,
                initializeSwapIx
            ],
        }).compileToV0Message([]);
    }

    const initializeSwapTx = new solanaWeb3.VersionedTransaction(messageV0);
    const signedTx = await provider.signTransaction(initializeSwapTx);
    return await connection.sendTransaction(signedTx);
}
