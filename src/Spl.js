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
const splToken = __importStar(require("@solana/spl-token"));
const bn_js_1 = __importDefault(require("bn.js"));
const bs58 = __importStar(require("bs58"));
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
]);
function InitializeSwap(swap) {
    return __awaiter(this, void 0, void 0, function* () {
        const { provider, connection, taker, token1Mint, token1Amount, token2Mint, token2Amount, token3Mint, token3Amount, token4Mint, token4Amount, } = swap;
        const publicKey = provider.publicKey;
        if (!publicKey) {
            throw new Error("wallet pubkey is missing from swap request");
        }
        // if (!wallet_initialized) {
        //    
        //     return
        // }
        // These are passed
        // let taker = "CNcovwf5CbuMHVDofbDVxTtsEAQxmWUgfGeQDS3MnmWH";
        // let token1Mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        // let token1Amount = 1000;
        // let token2Mint = "BSNvgNM2EE4fwQJjyXwxj3KZmKkx13D17WeGkevgiFaw"; //"11111111111111111111111111111111"; use when no token2
        // let token2Amount = 350000000;
        // let token3Mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"; //"11111111111111111111111111111111"; use for SOL
        // let token3Amount = 1000;
        // let token4Mint = "AmgUMQeqW8H74trc8UkKjzZWtxBdpS496wh4GLy2mCpo"; //"11111111111111111111111111111111"; use when no token4
        // let token4Amount = 100;
        let tokenSwapProgramId = new solanaWeb3.PublicKey("AAyM7XH9w7ApeSuEat8AwUW1AA7dBuj2vXv7SuUGpNUp"); // HERE
        // let tokenSwapProgramId = new solanaWeb3.PublicKey("GbowtzP1XpAK2as84UgGWTpn4o7QoiAeFNM8yRRBjeSk");
        let programStatePDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("program-state")], tokenSwapProgramId);
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
        let pickleMint = null;
        let feeChips = null;
        let devTreasury = null;
        let mcDegensTreasury = null;
        if (programLoaded) {
            const encodedProgramStateData = programState.data;
            const decodedProgramStateData = PROGRAM_STATE.decode(encodedProgramStateData);
            pickleMint = new solanaWeb3.PublicKey(decodedProgramStateData.pickle_mint);
            feeChips = new bn_js_1.default(decodedProgramStateData.fee_chips, 10, "le");
            devTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.dev_treasury);
            mcDegensTreasury = new solanaWeb3.PublicKey(decodedProgramStateData.mcdegens_treasury);
        }
        else {
            return;
        }
        let swapVaultPDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("swap-vault")], tokenSwapProgramId);
        let swapStatePDA = solanaWeb3.PublicKey.findProgramAddressSync([Buffer.from("swap-state"), publicKey.toBytes(), new solanaWeb3.PublicKey(taker).toBytes()], tokenSwapProgramId);
        let providerPickleATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(pickleMint), publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        const tempToken1Account = new solanaWeb3.Keypair();
        let rent = yield connection.getMinimumBalanceForRentExemption(splToken.AccountLayout.span);
        let createTempToken1AccountIx = solanaWeb3.SystemProgram.createAccount({
            programId: splToken.TOKEN_PROGRAM_ID,
            space: splToken.AccountLayout.span,
            lamports: rent,
            fromPubkey: publicKey,
            newAccountPubkey: tempToken1Account.publicKey,
        });
        let initTempToken1AccountIx = splToken.createInitializeAccountInstruction(tempToken1Account.publicKey, new solanaWeb3.PublicKey(token1Mint), tempToken1Account.publicKey, splToken.TOKEN_PROGRAM_ID);
        let providerToken1ATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(token1Mint), publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        let transferToken1Ix = splToken.createTransferInstruction(providerToken1ATA, tempToken1Account.publicKey, publicKey, token1Amount, [publicKey], splToken.TOKEN_PROGRAM_ID);
        let tempToken2Account = new solanaWeb3.Keypair();
        let createTempToken2AccountIx = null;
        let initTempToken2AccountIx = null;
        let transferToken2Ix = null;
        rent = yield connection.getMinimumBalanceForRentExemption(splToken.AccountLayout.span);
        if (token2Amount > 0) {
            createTempToken2AccountIx = solanaWeb3.SystemProgram.createAccount({
                programId: splToken.TOKEN_PROGRAM_ID,
                space: splToken.AccountLayout.span,
                lamports: rent,
                fromPubkey: publicKey,
                newAccountPubkey: tempToken2Account.publicKey,
            });
            initTempToken2AccountIx = splToken.createInitializeAccountInstruction(tempToken2Account.publicKey, new solanaWeb3.PublicKey(token2Mint), tempToken2Account.publicKey, splToken.TOKEN_PROGRAM_ID);
            let providerToken2ATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(token2Mint), publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            transferToken2Ix = splToken.createTransferInstruction(providerToken2ATA, tempToken2Account.publicKey, publicKey, token2Amount, [publicKey], splToken.TOKEN_PROGRAM_ID);
        }
        let createToken3ATA = null;
        let createToken3ATAIx = null;
        let token3ATA = null;
        if (token3Mint != "11111111111111111111111111111111") {
            token3ATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(token3Mint), publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            yield connection.getAccountInfo(token3ATA)
                .then(function (response) {
                if (response == null && token3ATA != null) {
                    createToken3ATA = true;
                    createToken3ATAIx = splToken.createAssociatedTokenAccountInstruction(publicKey, token3ATA, publicKey, new solanaWeb3.PublicKey(token3Mint), splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
                }
                else {
                    createToken3ATA = false;
                }
            })
                .catch(function (error) {
                error = JSON.stringify(error);
                error = JSON.parse(error);
                return;
            });
        }
        let createToken4ATA = false;
        let token4ATA = null;
        let createToken4ATAIx = null;
        if (token4Amount > 0) {
            token4ATA = yield splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(token4Mint), publicKey, false, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            yield connection.getAccountInfo(token4ATA)
                .then(function (response) {
                if (response == null && token4ATA != null) {
                    createToken4ATA = true;
                    createToken4ATAIx = splToken.createAssociatedTokenAccountInstruction(publicKey, token4ATA, publicKey, new solanaWeb3.PublicKey(token4Mint), splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
                }
                else {
                    createToken4ATA = false;
                }
            })
                .catch(function (error) {
                error = JSON.stringify(error);
                error = JSON.parse(error);
                return;
            });
        }
        var totalSize = 1 + 32 + 8 + 32 + 8 + 32 + 8;
        var uarray = new Uint8Array(totalSize);
        let counter = 0;
        uarray[counter++] = 0; // 0 = token_swap InitializeSwap instruction
        let takerb58 = bs58.decode(taker);
        var arr = Array.prototype.slice.call(Buffer.from(takerb58), 0);
        for (let i = 0; i < arr.length; i++) {
            uarray[counter++] = arr[i];
        }
        const token2ByteArray = (0, helpers_1.serializeToU8ByteArray)(token2Amount);
        for (let i = 0; i < token2ByteArray.length; i++) {
            uarray[counter++] = token2ByteArray[i];
        }
        let token3Mintb58 = bs58.decode(token3Mint);
        var arr = Array.prototype.slice.call(Buffer.from(token3Mintb58), 0);
        for (let i = 0; i < arr.length; i++) {
            uarray[counter++] = arr[i];
        }
        const token3ByteArray = (0, helpers_1.serializeToU8ByteArray)(token3Amount);
        for (let i = 0; i < token3ByteArray.length; i++) {
            uarray[counter++] = token3ByteArray[i];
        }
        let token4Mintb58 = bs58.decode(token4Mint.toString());
        var arr = Array.prototype.slice.call(Buffer.from(token4Mintb58), 0);
        for (let i = 0; i < arr.length; i++) {
            uarray[counter++] = arr[i];
        }
        const token4ByteArray = (0, helpers_1.serializeToU8ByteArray)(token4Amount);
        for (let i = 0; i < token4ByteArray.length; i++) {
            uarray[counter++] = token4ByteArray[i];
        }
        const initializeSwapIx = new solanaWeb3.TransactionInstruction({
            programId: tokenSwapProgramId,
            data: Buffer.from(uarray),
            keys: [
                { pubkey: publicKey, isSigner: true, isWritable: true }, // 0
                { pubkey: programStatePDA[0], isSigner: false, isWritable: false }, // 1
                { pubkey: swapVaultPDA[0], isSigner: false, isWritable: false }, // 2
                { pubkey: swapStatePDA[0], isSigner: false, isWritable: true }, // 3            
                { pubkey: tempToken1Account.publicKey, isSigner: true, isWritable: true }, // 4
                { pubkey: tempToken2Account.publicKey, isSigner: true, isWritable: true }, // 5
                { pubkey: providerPickleATA, isSigner: false, isWritable: true }, // 6  HERE
                // { pubkey: tempFeeAccount.publicKey, isSigner: true, isWritable: true }, // 6  HERE
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 7
                { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 8
                { pubkey: devTreasury, isSigner: false, isWritable: true }, // 9
                { pubkey: mcDegensTreasury, isSigner: false, isWritable: true }, // 10
            ]
        });
        // let lookupTable = new solanaWeb3.PublicKey("2EruzbDM8KDoiaSQFX9eWzU8ttQnM6PfixCCfjzqmocR"); // devnet
        let lookupTable = new solanaWeb3.PublicKey("DnDkh579fNnBFUwLDeQWgfW6ukLMyt8DgLaVDVwecxmj"); // mainnet    
        const lookupTableAccount = yield connection
            .getAddressLookupTable(lookupTable)
            .then((res) => res.value);
        if (!lookupTableAccount) {
            return;
        }
        let messageV0 = null;
        if (token2Amount > 0) {
            if (createToken3ATA == true && createToken4ATA &&
                createTempToken2AccountIx != null &&
                initTempToken2AccountIx != null &&
                transferToken2Ix != null &&
                createToken3ATAIx != null &&
                createToken4ATAIx != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createTempToken2AccountIx,
                        initTempToken2AccountIx,
                        transferToken2Ix,
                        createToken3ATAIx,
                        createToken4ATAIx,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
            else if (createToken3ATA &&
                createTempToken2AccountIx != null &&
                initTempToken2AccountIx != null &&
                transferToken2Ix != null &&
                createToken3ATAIx != null &&
                createToken4ATAIx != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createTempToken2AccountIx,
                        initTempToken2AccountIx,
                        transferToken2Ix,
                        createToken3ATAIx,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
            else if (createToken4ATA &&
                createTempToken2AccountIx != null &&
                initTempToken2AccountIx != null &&
                transferToken2Ix != null &&
                createToken4ATAIx != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createTempToken2AccountIx,
                        initTempToken2AccountIx,
                        transferToken2Ix,
                        createToken4ATAIx,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
            else if (createTempToken2AccountIx != null &&
                initTempToken2AccountIx != null &&
                transferToken2Ix != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createTempToken2AccountIx,
                        initTempToken2AccountIx,
                        transferToken2Ix,
                        initializeSwapIx,
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
        }
        else {
            if (createToken3ATA == true && createToken4ATA &&
                createToken3ATAIx != null &&
                createToken4ATAIx != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createToken3ATAIx,
                        createToken4ATAIx,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
            else if (createToken3ATA && createToken3ATAIx != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createToken3ATAIx,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
            else if (createToken4ATA && createToken4ATAIx != null) {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        createToken4ATAIx,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
            else {
                messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: (yield connection.getRecentBlockhash('confirmed')).blockhash,
                    instructions: [
                        // createTempFeeAccountIx,  // HERE
                        // initTempFeeAccountIx,
                        // transferPickleIx,
                        createTempToken1AccountIx,
                        initTempToken1AccountIx,
                        transferToken1Ix,
                        initializeSwapIx
                    ],
                }).compileToV0Message([lookupTableAccount]);
            }
        }
        let initializeSwapTx = null;
        if (messageV0 != null) {
            initializeSwapTx = new solanaWeb3.VersionedTransaction(messageV0);
        }
        if (initializeSwapTx != null) {
            let signedTx = yield provider.signTransaction(initializeSwapTx);
            signedTx.sign([tempToken1Account, tempToken2Account]); // HERE
            // signedTx.sign([tempFeeAccount, tempToken1Account, tempToken2Account]);
            return yield connection.sendTransaction(signedTx);
        }
    });
}
exports.InitializeSwap = InitializeSwap;
