"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitializeSwap = void 0;
const solanaWeb3 = __importStar(require("@solana/web3.js"));
const web3_js_1 = require("@solana/web3.js");
const splToken = __importStar(require("@solana/spl-token"));
const bn_js_1 = __importDefault(require("bn.js"));
const bs58 = __importStar(require("bs58"));
const mplToken = __importStar(require("@metaplex-foundation/mpl-token-metadata"));
const BufferLayout = __importStar(require("@solana/buffer-layout"));
const helpers_1 = require("./helpers");
const publicKey = (property = "publicKey") => {
    return BufferLayout.blob(32, property);
};
const uint64 = (property = "uint64") => {
    return BufferLayout.blob(8, property);
};
const PROGRAM_STATE = BufferLayout.struct([
    BufferLayout.u8("is_initialized"),
    publicKey("pickle_mint"),
    uint64("fee_chips"),
    BufferLayout.u8("dev_percentage"),
    publicKey("dev_treasury"),
    publicKey("mcdegens_treasury"),
    BufferLayout.u8("fee_lamports"),
]);
const SWAP_STATE = BufferLayout.struct([
    BufferLayout.u8("is_initialized"),
    uint64("utime"), // HERE
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
    publicKey("initializer_mint"),
    publicKey("swap_mint"),
    publicKey("swap_token_mint"),
]);
function InitializeSwap(swap) {
    return __awaiter(this, void 0, void 0, function* () {
        const { provider, connection, mint, taker, takerMint, } = swap;
        const publicKey = provider.publicKey;
        if (!publicKey) {
            throw new Error("wallet pubkey is missing from swap request");
        }
        let swapLamports = 1000;
        let swapTokenMint = new solanaWeb3.PublicKey("AVm6WLmMuzdedAMjpXLYmSGjLLPPjjVWNuR6JJhJLWn3");
        let isSwap = true;
        if (takerMint == "11111111111111111111111111111111") {
            isSwap = false;
        }
        let pNFTSwapProgramId = new solanaWeb3.PublicKey("2bY36scRMEUJHJToVGjJ2uY8PdSrRPr73siNwGbv1ZNT");
        let splATAProgramId = new solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
        let mplAuthRulesProgramId = new solanaWeb3.PublicKey("auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg");
        let mplAuthRulesAccount = new solanaWeb3.PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9");
        let programStatePDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("program-state")], pNFTSwapProgramId);
        let programLoaded = false;
        let programState = {
            data: new Buffer(""),
            executable: false,
            lamports: 0,
            owner: programStatePDA[0],
        };
        yield connection.getAccountInfo(programStatePDA[0])
            .then(function (response) {
            if (response != null) {
                programState = response;
                programLoaded = true;
            }
        })
            .catch(function (error) {
            error = JSON.stringify(error);
            error = JSON.parse(error);
            return;
        });
        let feeLamports = null;
        let devTreasury = null;
        let mcDegensTreasury = null;
        if (programLoaded) {
            const encodedProgramStateData = programState.data;
            const decodedProgramStateData = PROGRAM_STATE.decode(encodedProgramStateData);
            feeLamports = new bn_js_1.default(decodedProgramStateData.fee_lamports, 10, "le");
            devTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury);
            mcDegensTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury);
        }
        else {
            return;
        }
        let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("swap-vault")], pNFTSwapProgramId);
        let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("swap-state"), new solanaWeb3.PublicKey(mint).toBytes(), new solanaWeb3.PublicKey(takerMint).toBytes()], pNFTSwapProgramId);
        let providerMintATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(mint), provider.publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let tokenMetadataPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), new solanaWeb3.PublicKey(mint).toBytes()], mplToken.PROGRAM_ID);
        let tokenMasterEditionPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), new solanaWeb3.PublicKey(mint).toBytes(), Buffer.from("edition")], mplToken.PROGRAM_ID);
        let tokenDestinationATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(mint), swapVaultPDA[0], true, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let tokenRecordPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"),
            mplToken.PROGRAM_ID.toBytes(),
            new solanaWeb3.PublicKey(mint).toBytes(),
            Buffer.from("token_record"),
            new solanaWeb3.PublicKey(providerMintATA).toBytes()], mplToken.PROGRAM_ID);
        let tokenRecordDesinationPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"),
            mplToken.PROGRAM_ID.toBytes(),
            new solanaWeb3.PublicKey(mint).toBytes(),
            Buffer.from("token_record"),
            new solanaWeb3.PublicKey(tokenDestinationATA).toBytes()], mplToken.PROGRAM_ID);
        let createTakerMintATA = false;
        let takerMintATA = null;
        let createTakerMintATAIx = null;
        if (takerMint != "11111111111111111111111111111111") {
            takerMintATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(takerMint), provider.publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            yield connection.getAccountInfo(takerMintATA)
                .then(function (response) {
                if (response == null && provider.publicKey && takerMintATA) {
                    createTakerMintATA = true;
                    createTakerMintATAIx = splToken.createAssociatedTokenAccountInstruction(provider.publicKey, takerMintATA, provider.publicKey, new solanaWeb3.PublicKey(takerMint), splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
                }
                else {
                    createTakerMintATA = false;
                }
            })
                .catch(function (error) {
                error = JSON.stringify(error);
                error = JSON.parse(error);
                return;
            });
        }
        let createSwapTokenATA = null;
        let createSwapTokenATAIx = null;
        let swapTokenATA = yield splToken.getAssociatedTokenAddress(swapTokenMint, provider.publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        yield connection.getAccountInfo(swapTokenATA)
            .then(function (response) {
            if (response == null && provider.publicKey) {
                createSwapTokenATA = true;
                createSwapTokenATAIx = splToken.createAssociatedTokenAccountInstruction(provider.publicKey, swapTokenATA, provider.publicKey, swapTokenMint, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            }
            else {
                createSwapTokenATA = false;
            }
        })
            .catch(function (error) {
            error = JSON.stringify(error);
            error = JSON.parse(error);
            return;
        });
        var totalSize = 1 + 1 + 32 + 32 + 8 + 32 + 8;
        var uarray = new Uint8Array(totalSize);
        let counter = 0;
        uarray[counter++] = 0; // 0 = nft_swap InitializeSwap instruction
        if (isSwap == true) {
            uarray[counter++] = 1;
        }
        else {
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
        const swapLamportsByteArray = (0, helpers_1.serializeToU8ByteArray)(swapLamports);
        for (let i = 0; i < swapLamportsByteArray.length; i++) {
            uarray[counter++] = swapLamportsByteArray[i];
        }
        let swapTokenMintb58 = bs58.decode(swapTokenMint.toString());
        var arr = Array.prototype.slice.call(Buffer.from(swapTokenMintb58), 0);
        for (let i = 0; i < arr.length; i++) {
            uarray[counter++] = arr[i];
        }
        const swapTokensByteArray = (0, helpers_1.serializeToU8ByteArray)(swapLamports);
        for (let i = 0; i < swapTokensByteArray.length; i++) {
            uarray[counter++] = swapTokensByteArray[i];
        }
        const initializeSwapIx = new solanaWeb3.TransactionInstruction({
            programId: pNFTSwapProgramId,
            data: Buffer.from(uarray),
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
                recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                instructions: [
                    computePriceIx,
                    computeLimitIx,
                    createTakerMintATAIx,
                    createSwapTokenATAIx,
                    initializeSwapIx
                ],
            }).compileToV0Message([]);
        }
        else if (createTakerMintATA && createTakerMintATAIx) {
            messageV0 = new solanaWeb3.TransactionMessage({
                payerKey: provider.publicKey,
                recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                instructions: [
                    computePriceIx,
                    computeLimitIx,
                    createTakerMintATAIx,
                    initializeSwapIx
                ],
            }).compileToV0Message([]);
        }
        else if (createSwapTokenATA && createSwapTokenATAIx) {
            messageV0 = new solanaWeb3.TransactionMessage({
                payerKey: provider.publicKey,
                recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                instructions: [
                    computePriceIx,
                    computeLimitIx,
                    createSwapTokenATAIx,
                    initializeSwapIx
                ],
            }).compileToV0Message([]);
        }
        else {
            messageV0 = new solanaWeb3.TransactionMessage({
                payerKey: provider.publicKey,
                recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                instructions: [
                    computePriceIx,
                    computeLimitIx,
                    initializeSwapIx
                ],
            }).compileToV0Message([]);
        }
        const initializeSwapTx = new solanaWeb3.VersionedTransaction(messageV0);
        const signedTx = yield provider.signTransaction(initializeSwapTx);
        return yield connection.sendTransaction(signedTx);
    });
}
exports.InitializeSwap = InitializeSwap;
function SwapPNFTs(swap) {
    return __awaiter(this, void 0, void 0, function* () {
        const { provider, connection, mint, takerMint, } = swap;
        const publicKey = provider.publicKey;
        if (!publicKey) {
            throw new Error("wallet pubkey is missing from swap request");
        }
        let pNFTSwapProgramId = new solanaWeb3.PublicKey("2bY36scRMEUJHJToVGjJ2uY8PdSrRPr73siNwGbv1ZNT");
        let splATAProgramId = new solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
        let mplAuthRulesProgramId = new solanaWeb3.PublicKey("auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg");
        let mplAuthRulesAccount = new solanaWeb3.PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9");
        let programStatePDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("program-state")], pNFTSwapProgramId);
        let programLoaded = false;
        let programState = {
            data: new Buffer(""),
            executable: false,
            lamports: 0,
            owner: programStatePDA[0],
        };
        yield connection.getAccountInfo(programStatePDA[0])
            .then(function (response) {
            if (response != null) {
                programState = response;
                programLoaded = true;
            }
        })
            .catch(function (error) {
            error = JSON.stringify(error);
            error = JSON.parse(error);
            return;
        });
        let feeLamports = null;
        let devTreasury = null;
        let mcDegensTreasury = null;
        if (programLoaded) {
            const encodedProgramStateData = programState.data;
            const decodedProgramStateData = PROGRAM_STATE.decode(encodedProgramStateData);
            feeLamports = new bn_js_1.default(decodedProgramStateData.fee_lamports, 10, "le");
            devTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury);
            mcDegensTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury);
        }
        else {
            return;
        }
        let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("swap-vault")], pNFTSwapProgramId);
        let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("swap-state"), new solanaWeb3.PublicKey(mint).toBytes(), new solanaWeb3.PublicKey(takerMint).toBytes()], pNFTSwapProgramId);
        let swapStateLoaded = false;
        let swapState = {
            data: new Buffer(""),
            executable: false,
            lamports: 0,
            owner: swapStatePDA[0],
        };
        yield connection.getAccountInfo(swapStatePDA[0])
            .then(function (response) {
            if (response != null) {
                swapState = response;
                swapStateLoaded = true;
            }
        })
            .catch(function (error) {
            error = JSON.stringify(error);
            error = JSON.parse(error);
            return;
        });
        let initializer = null;
        let initializerTokenMint = null;
        let takerTokenMint = null;
        let swapTokenMint = null;
        if (swapStateLoaded) {
            const encodedSwapStateData = swapState.data;
            const decodedSwapStateData = SWAP_STATE.decode(encodedSwapStateData);
            initializer = new web3_js_1.PublicKey(decodedSwapStateData.initializer);
            initializerTokenMint = new web3_js_1.PublicKey(decodedSwapStateData.initializer_mint);
            takerTokenMint = new web3_js_1.PublicKey(decodedSwapStateData.swap_mint);
            swapTokenMint = new web3_js_1.PublicKey(decodedSwapStateData.swap_token_mint);
        }
        else {
            return;
        }
        let vaultTokenMintATA = yield splToken.getAssociatedTokenAddress(initializerTokenMint, swapVaultPDA[0], true, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let tokenMetadataPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), initializerTokenMint.toBytes()], mplToken.PROGRAM_ID);
        let tokenMasterEditionPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), initializerTokenMint.toBytes(), Buffer.from("edition")], mplToken.PROGRAM_ID);
        let tokenDestinationATA = yield splToken.getAssociatedTokenAddress(initializerTokenMint, provider.publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let createTokenDestinationATA = null;
        let createTokenDestinationATAIx = null;
        yield connection.getAccountInfo(tokenDestinationATA)
            .then(function (response) {
            if (response == null && provider.publicKey && initializerTokenMint) {
                createTokenDestinationATA = true;
                createTokenDestinationATAIx = splToken.createAssociatedTokenAccountInstruction(provider.publicKey, tokenDestinationATA, provider.publicKey, initializerTokenMint, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            }
            else {
                createTokenDestinationATA = false;
            }
        })
            .catch(function (error) {
            error = JSON.stringify(error);
            error = JSON.parse(error);
            return;
        });
        let tokenRecordPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"),
            mplToken.PROGRAM_ID.toBytes(),
            initializerTokenMint.toBytes(),
            Buffer.from("token_record"),
            vaultTokenMintATA.toBytes()], mplToken.PROGRAM_ID);
        let tokenRecordDesinationPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"),
            mplToken.PROGRAM_ID.toBytes(),
            initializerTokenMint.toBytes(),
            Buffer.from("token_record"),
            tokenDestinationATA.toBytes()], mplToken.PROGRAM_ID);
        let takerTokenMintATA = yield splToken.getAssociatedTokenAddress(takerTokenMint, provider.publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let takerTokenMetadataPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), takerTokenMint.toBytes()], mplToken.PROGRAM_ID);
        let takerTokenMasterEditionPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"), mplToken.PROGRAM_ID.toBytes(), takerTokenMint.toBytes(), Buffer.from("edition")], mplToken.PROGRAM_ID);
        let takerTokenDestinationATA = yield splToken.getAssociatedTokenAddress(takerTokenMint, initializer, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let takerTokenRecordPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"),
            mplToken.PROGRAM_ID.toBytes(),
            takerTokenMint.toBytes(),
            Buffer.from("token_record"),
            takerTokenMintATA.toBytes()], mplToken.PROGRAM_ID);
        let takerTokenRecordDesinationPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("metadata"),
            mplToken.PROGRAM_ID.toBytes(),
            takerTokenMint.toBytes(),
            Buffer.from("token_record"),
            takerTokenDestinationATA.toBytes()], mplToken.PROGRAM_ID);
        let swapTokenATA = yield splToken.getAssociatedTokenAddress(swapTokenMint, provider.publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let initializerSwapTokenATA = yield splToken.getAssociatedTokenAddress(swapTokenMint, initializer, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        var totalSize = 1;
        var uarray = new Uint8Array(totalSize);
        let counter = 0;
        uarray[counter++] = 1; // 1 = nft_swap SwapNFTs instructio
        const swapPNFTsIx = new solanaWeb3.TransactionInstruction({
            programId: pNFTSwapProgramId,
            data: Buffer.from(uarray),
            keys: [
                { pubkey: provider.publicKey, isSigner: true, isWritable: true }, // 0
                { pubkey: initializer, isSigner: false, isWritable: true }, // 1
                { pubkey: programStatePDA[0], isSigner: false, isWritable: false }, // 2
                { pubkey: swapVaultPDA[0], isSigner: false, isWritable: true }, // 3
                { pubkey: swapStatePDA[0], isSigner: false, isWritable: true }, // 4
                { pubkey: vaultTokenMintATA, isSigner: false, isWritable: true }, // 5
                { pubkey: initializerTokenMint, isSigner: false, isWritable: false }, // 6
                { pubkey: tokenMetadataPDA[0], isSigner: false, isWritable: true }, // 7
                { pubkey: tokenMasterEditionPDA[0], isSigner: false, isWritable: false }, // 8
                { pubkey: tokenDestinationATA, isSigner: false, isWritable: true }, // 9
                { pubkey: tokenRecordPDA[0], isSigner: false, isWritable: true }, // 10
                { pubkey: tokenRecordDesinationPDA[0], isSigner: false, isWritable: true }, // 11
                { pubkey: takerTokenMintATA, isSigner: false, isWritable: true }, // 12
                { pubkey: takerTokenMint, isSigner: false, isWritable: false }, // 13
                { pubkey: takerTokenMetadataPDA[0], isSigner: false, isWritable: true }, // 14
                { pubkey: takerTokenMasterEditionPDA[0], isSigner: false, isWritable: false }, // 15
                { pubkey: takerTokenDestinationATA, isSigner: false, isWritable: true }, // 16
                { pubkey: takerTokenRecordPDA[0], isSigner: false, isWritable: true }, // 17
                { pubkey: takerTokenRecordDesinationPDA[0], isSigner: false, isWritable: true }, // 18
                { pubkey: swapTokenATA, isSigner: false, isWritable: true }, // 19
                { pubkey: initializerSwapTokenATA, isSigner: false, isWritable: true }, // 20            
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 21
                { pubkey: solanaWeb3.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false }, // 22
                { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 23
                { pubkey: splATAProgramId, isSigner: false, isWritable: false }, // 25
                { pubkey: mplToken.PROGRAM_ID, isSigner: false, isWritable: false }, // 25
                { pubkey: mplAuthRulesProgramId, isSigner: false, isWritable: false }, // 26
                { pubkey: mplAuthRulesAccount, isSigner: false, isWritable: false }, // 27
                { pubkey: devTreasury, isSigner: false, isWritable: true }, // 28
                { pubkey: mcDegensTreasury, isSigner: false, isWritable: true }, // 29
            ]
        });
        const computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1,
        });
        const computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 500000,
        });
        let messageV0 = null;
        if (createTokenDestinationATA == true && createTokenDestinationATAIx) {
            messageV0 = new solanaWeb3.TransactionMessage({
                payerKey: provider.publicKey,
                recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                instructions: [
                    computePriceIx,
                    computeLimitIx,
                    createTokenDestinationATAIx,
                    swapPNFTsIx,
                ],
            }).compileToV0Message([]);
        }
        else {
            messageV0 = new solanaWeb3.TransactionMessage({
                payerKey: provider.publicKey,
                recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                instructions: [
                    computePriceIx,
                    computeLimitIx,
                    swapPNFTsIx,
                ],
            }).compileToV0Message([]);
        }
        const swapPNFTsTx = new solanaWeb3.VersionedTransaction(messageV0);
        let signedTx = yield provider.signTransaction(swapPNFTsTx);
        return yield connection.sendTransaction(signedTx);
    });
}