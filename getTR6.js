const {
    TonClient,
} = require("@tonclient/core");
const { Account } = require("@tonclient/appkit");
const { libNode } = require("@tonclient/lib-node");
const {TokenRootContract} = require("./TokenRootContract.js");
const fs = require('fs');
const path = require('path');
const {rootAddress, rootANZ6newkeys} = require("./configure");
const {signerKeys} = require("@tonclient/core");

const WalletCode = "te6ccgECFQEAApkABCSK7VMg4wMgwP/jAiDA/uMC8gsSAgEUAoztRNDXScMB+GYh2zzTAAGOEoECANcYIPkBWPhCIPhl+RDyqN7TPwH4QyG58rQg+COBA+iogggbd0CgufK0+GPTHwHbPPI8BQMDSu1E0NdJwwH4ZiLQ1wsDqTgA3CHHAOMCIdcNH/K8IeMDAds88jwREQMCKCCCEFhakGS74wIgghBotV8/uuMCBgQDUjD4Qm7jAPhG8nPR+EUgbpIwcN74Qrry5E/4APhFIG6SMHDe2zzbPPIABQoIAWLtRNDXScIBjiZw7UTQ9AVwcSKAQPQOk9cL/5Fw4vhr+GqAQPQO8r3XC//4YnD4Y+MNEARQIIIQEXjpvbrjAiCCEDtTMx+64wIgghBM7mRsuuMCIIIQWFqQZLrjAg8OCwcDKjD4RvLgTPhCbuMA0//R2zww2zzyABAJCAAs+Ev4SvhD+ELIy//LP8+Dy//L/8ntVAEs+EUgbpIwcN74Srry5E0g8uRO+ADbPAoARvhKIfhqjQRwAAAAAAAAAAAAAAAAFNs0/KDIzsv/y//JcPsAA0Iw+Eby4Ez4Qm7jACGT1NHQ3vpA03/SANMH1NHbPOMA8gAQDQwAKO1E0NP/0z8x+ENYyMv/yz/Oye1UAFT4RSBukjBw3vhKuvLkTfgAVQJVEsjPhYDKAHPPQM4B+gJxzwtqzMkB+wABUDDR2zz4SyGOHI0EcAAAAAAAAAAAAAAAAC7UzMfgyM7L/8lw+wDe8gAQAVAw0ds8+EohjhyNBHAAAAAAAAAAAAAAAAAkXjpvYMjOy//JcPsA3vIAEAAu7UTQ0//TP9MAMdP/0//R+Gv4avhj+GIACvhG8uBMAgr0pCD0oRQTABRzb2wgMC41Ny4xAAA="
TonClient.useBinaryLibrary(libNode);

/**
 * @param {TonClient} client
 */
async function main(client) {
    const rootAcc = new Account(TokenRootContract, {
        address: rootAddress,
        signer: signerKeys(rootANZ6newkeys),
        client,
    });

    let name = await rootAcc.runLocal('name', {answerId:0});
    let symbol = await rootAcc.runLocal('symbol', {answerId:0});
    let decimals = await rootAcc.runLocal('decimals', {answerId:0});
    let totalSupply = await rootAcc.runLocal('totalSupply', {answerId:0});

    // let walletCode = await rootAcc.runLocal('walletCode', {answerId:0});
    let rootOwner = await rootAcc.runLocal('rootOwner', {answerId:0});

    console.log(name.decoded.output,symbol.decoded.output,decimals.decoded.output,rootOwner.decoded.output,totalSupply.decoded.output)


}

(async () => {
    try {
        const client = new TonClient({
            network: {
                endpoints: ["http://net.ton.dev"],
            }
        });
        console.log("Hello localhost TON!");
        await main(client);
        process.exit(0);
    } catch (error) {
        console.error(error);
    }
})();
