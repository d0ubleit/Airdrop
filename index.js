const fs = require('fs');
const path = require('path');
const { TonClient, abiContract, signerKeys, signerNone, abiJson } = require('@tonclient/core');
const { libNode } = require('@tonclient/lib-node');

const contractsDir = "/home/alex/Projects/Airdrop/contracts/"
// const contractsDir = "d:/Different/projects/Radiance/Airdrop/Airdrop/contracts/"


/**
 * If you are running this script not on the TON OS SE, you should:
 *  - change `ENDPOINTS`
 *  - change `GIVER_ADDRESS`
 *  - write down giver keys into 'GiverV2.keys.json'
 */
///////////////////////////
/////////Local SE//////////
const GIVER_ABI = require('./contracts/GiverV2.abi.json');
const GIVER_KEYS = readKeysFromFile('GiverV2.keys.json');
const ENDPOINTS = ['http://localhost'];
const GIVER_ADDRESS = '0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5';
///////////////////////////

///////////////////////////
/////////Dev net///////////
// const GIVER_ABI = require('./contracts/Mygiver.abi.json');
// const GIVER_KEYS = readKeysFromFile('Mygiver.keys.json');
// const ENDPOINTS = [
//     'eri01.net.everos.dev',
//     'rbx01.net.everos.dev',
//     'gra01.net.everos.dev'];
// //['net1.ton.dev', 'net5.ton.dev'];
// const GIVER_ADDRESS = '0:201c6d9f5f448f2303117353e6ecebf28224d3ba44a9d966a9a5bb0bfd1ce1ed';
///////////////////////////



// Link the platform-dependable TON-SDK binary with the target Application in Typescript
// This is a Node.js project, so we link the application with `libNode` binary
// from `@tonclient/lib-node` package
// If you want to use this code on other platforms, such as Web or React-Native,
// use  `@tonclient/lib-web` and `@tonclient/lib-react-native` packages accordingly
// (see README in  https://github.com/tonlabs/ton-client-js)

const RootToken_ABI = require('./contracts/RootTokenContract.abi.json');
// const RootToken_TVC = fs.readFileSync('./contracts/RootTokenContract.tvc', 'base64');
const RootToken_TVC = fs.readFileSync(contractsDir + 'RootTokenContract.tvc', 'base64');

////////////////Get from giver
const giverRootAmount = 6_000_000_000;
const giverAirDropAmount = 3_000_000_000;
const giverClientAmount = 4_000_000_000;
////////////////Number of AirDrop Recievers
const RcvrsNum = 10;
////////////////Tokens mint to client wallet
const tokensMintNum = 1000000;
////////////////Tokens send for AirDrop (must be less than tokensMintNum)
const tokensToAirDrop = 1000000;


TonClient.useBinaryLibrary(libNode);
const client = new TonClient({
    network: {
        endpoints: ENDPOINTS,
        // for a query, this is the period of time during which
        // the query waits for its condition to be fulfilled
        wait_for_timeout: 180000,
    },
});

var childProcess = require('child_process');
var runProcess = childProcess.execSync('cd contracts && tondev sol compile AirDrop.sol').toString();
const AirDrop_ABI = require('./contracts/AirDrop.abi.json');
const AirDrop_TVC = fs.readFileSync(contractsDir + 'AirDrop.tvc', 'base64');

var childProcess = require('child_process');
var runProcess = childProcess.execSync('cd contracts && tondev sol compile ClientAirDrop.sol').toString();
const ClientAirDrop_ABI = require('./contracts/ClientAirDrop.abi.json');
const ClientAirDrop_TVC = fs.readFileSync(contractsDir + 'ClientAirDrop.tvc', 'base64');

const TONTokenWallet_ABI = require('./contracts/TONTokenWallet.abi.json');

const ZeroAddress = "0:0000000000000000000000000000000000000000000000000000000000000000";
const sep = "----------------------------------------------------------------";

(async () => {
    try {
        console.log(`${sep}`);
        console.log(`${sep}`);
        // Generate an ed25519 key pair
        const RootTokenKeys = await client.crypto.generate_random_sign_keys();

        //Create RootToken DeployMsg
        var deployData = require('./contracts/data.json');
        var deployInput = {
            "root_public_key_": "0x" + RootTokenKeys.public,
            "root_owner_address_": ZeroAddress //For external deploy
        }
        var deployMsg = buildDeployOptions(RootTokenKeys, RootToken_ABI, RootToken_TVC, deployData, deployInput);


        // Calculate future wallet address.
        const RootTokenAddress = await calcAddress(deployMsg, "RootTokenContract");

        // Send some tokens to `RootTokenAddress` before deploy
        await getTokensFromGiver(RootTokenAddress, giverRootAmount);

        //Deploy RootTokenWallet
        await deployWallet(deployMsg, "RootTokenContract");
        console.log(`Check Root by calling method getDetails`);
        await callGetFunctionNoAccept(RootTokenAddress, RootToken_ABI, "getDetails", { "_answer_id": 0 });


        // console.log(`--------------End here`);

        deployInput = { "_token": RootTokenAddress };
        deployMsg = buildDeployOptions(RootTokenKeys, AirDrop_ABI, AirDrop_TVC, deployData = {}, deployInput);
        const AirDropAddress = await calcAddress(deployMsg, "AirDrop");
        await getTokensFromGiver(AirDropAddress, giverAirDropAmount);
        await deployWallet(deployMsg, "AirDrop");


        console.log(`Check AirDrop by calling method getDetails and get AirDrop Wallet address`);
        var output = await callGetFunctionNoAccept(AirDropAddress, AirDrop_ABI, "getDetails");

        const AirDropWalletAddress = output._token_wallet;
        console.log(`AirDrop Wallet address is ${AirDropWalletAddress}\n`);
        // await callGetFunctionWithAccept(AirDropAddress, AirDrop_ABI, "getDetails")


        /////////////CHECK MINTING
        // console.log(`Lets try to mint 10 tokens to AirDrop Wallet address`);
        // await callFunctionSigned(RootTokenKeys, RootTokenAddress, RootToken_ABI, "mint", { "tokens": 10, "to": AirDropWalletAddress });
        // console.log(`Check total supply`);
        // output = await callGetFunctionNoAccept(RootTokenAddress, RootToken_ABI, "getDetails", { "_answer_id": 0 });
        // console.log(`total supply = ${output.value0.total_supply}`);

        ///////////////////////////
        //AirDropClient
        ///////////////////////////
        const ClientAirDropKeys = await client.crypto.generate_random_sign_keys();

        deployInput = {
            "_token": RootTokenAddress,
            "_AirDropAddress": AirDropAddress,
            "_AirDropWalletAddress": AirDropWalletAddress
        };
        deployMsg = buildDeployOptions(ClientAirDropKeys, ClientAirDrop_ABI, ClientAirDrop_TVC, deployData = {}, deployInput);
        const ClientAirDropAddress = await calcAddress(deployMsg, "ClientAirDrop");
        await getTokensFromGiver(ClientAirDropAddress, giverClientAmount);
        await deployWallet(deployMsg, "ClientAirDrop");

        var output = await callGetFunctionNoAccept(ClientAirDropAddress, ClientAirDrop_ABI, "getDetails");
        const ClientAirDropWalletAddress = output._token_wallet;
        console.log(`ClientAirDrop Wallet address is ${ClientAirDropWalletAddress}`);

        /////////
        //Mint tokens to client wallet
        console.log(`Minting ${tokensMintNum} tokens to Client Wallet`);
        await callFunctionSigned(RootTokenKeys, RootTokenAddress, RootToken_ABI, "mint", { "tokens": tokensMintNum, "to": ClientAirDropWalletAddress });
        console.log(`Check Client wallet balance`);
        var output = await callGetFunctionNoAccept(ClientAirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`Client Wallet balance is ${output.value0}\n`);


        /////////
        //Deploy DropRcvr Wallet with 1 token
        var DropRcvrKeys = [];
        var DropRcvrAddress = [];
        DropRcvrKeys.push(await client.crypto.generate_random_sign_keys());
        console.log(`Deploying DropRcvr0 Wallet`);
        var inputData = {
            "tokens": 1,
            "deploy_grams": 200000000,
            "wallet_public_key_": "0x" + DropRcvrKeys[0].public,
            "owner_address_": ZeroAddress,
            "gas_back_address": RootTokenAddress
        }
        var output = await callFunctionSigned(RootTokenKeys, RootTokenAddress, RootToken_ABI, "deployWallet", inputData);
        console.log(`DropRcvr0 wallet address is ${output.value0}`);
        DropRcvrAddress.push(output.value0);
        // console.log(`Check DropRcvr wallet balance`);
        var output = await callGetFunctionNoAccept(DropRcvrAddress[0], TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`DropRcvr0 Wallet balance is ${output.value0}\n`);

        /////////
        //Deploy more DropRcvr Wallets 

        for (let i = 1; i < RcvrsNum; i++) { //i = 1 because we already have 1 Rcvr
            DropRcvrKeys.push(await client.crypto.generate_random_sign_keys());
            //console.log(`Deploying DropRcvr${i} Wallet`);
            var inputData = {
                "tokens": i + 1,
                "deploy_grams": 200000000,
                "wallet_public_key_": "0x" + DropRcvrKeys[i].public,
                "owner_address_": ZeroAddress,
                "gas_back_address": RootTokenAddress
            }
            var output = await callFunctionSigned(RootTokenKeys, RootTokenAddress, RootToken_ABI, "deployWallet", inputData);
            console.log(`DropRcvr${i} wallet address is ${output.value0}`);
            DropRcvrAddress.push(output.value0);
            // console.log(`Check DropRcvr wallet balance`);
            // var output = await callGetFunctionNoAccept(DropRcvrAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
            // console.log(`DropRcvr Wallet balance is ${output.value0}\n`);

        }



        //////////
        //Test ClientAirDrop function transferTokensForAirDrop
        await callFunctionSigned(ClientAirDropKeys, ClientAirDropAddress, ClientAirDrop_ABI, "transferTokensForAirDrop", { "amount": tokensToAirDrop });

        var output = await callGetFunctionNoAccept(ClientAirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`Client Wallet balance is ${output.value0}`);


        var output = await callGetFunctionNoAccept(AirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`AirDrop Wallet balance is ${output.value0}\n`);

        // var output = await callGetFunctionNoAccept(AirDropWalletAddress, TONTokenWallet_ABI, "getDetails", { "_answer_id": 0 });
        // console.log(`AirDrop Wallet balance is ${output.receive_callback}\n\n`);

        console.log(`Check AirDrop depositors list`);
        var output = await callGetFunctionNoAccept(AirDropAddress, AirDrop_ABI, "depositors", contractFuncInp = {}, true);
        // console.log(`AirDrop Wallet balance is ${output.depositors}\n\n`);


        var RcvrsAmounts = [];
        for (let i = 0; i < RcvrsNum; i++) {
            RcvrsAmounts.push(i + 1);
        }

        console.log(`Test AirDrop function at CLIENTAIRDROP contract`);
        await callFunctionSigned(ClientAirDropKeys, ClientAirDropAddress, ClientAirDrop_ABI, "doAirDrop", { "arrayAddresses": DropRcvrAddress, "arrayValues": RcvrsAmounts });

        // console.log(`Test AirDrop function at AIRDROP contract`);
        // await callFunctionSigned(RootTokenKeys, AirDropAddress, AirDrop_ABI, "AirDrop", { "clientAirDropAddress": ClientAirDropAddress, "arrayAddresses": DropRcvrAddress, "arrayValues": RcvrsAmounts });

        console.log(`Wait 10 seconds\n`);
        await sleep(10000)

        console.log(`Check balances:`);
        var output = await callGetFunctionNoAccept(AirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`AirDrop Wallet balance is ${output.value0}`);
        for (let i = 0; i < RcvrsNum; i++) {
            var output = await callGetFunctionNoAccept(DropRcvrAddress[i], TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
            console.log(`DropRcvr${i} Wallet balance is ${output.value0}`);
        }

        
        var output = await callGetFunctionNoAccept(ClientAirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`ClientAirDrop Wallet balance is ${output.value0}`);
        console.log(`Get some tokens back`);
        await callFunctionSigned(ClientAirDropKeys, ClientAirDropAddress, ClientAirDrop_ABI, "requireTokensBack", { "amount": 100});
        await sleep(100)
        var output = await callGetFunctionNoAccept(ClientAirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        console.log(`ClientAirDrop Wallet balance is ${output.value0}`);



        /////Test
        // while (true) {
        //     await sleep(10000)
        //     console.log(`Check balances:`);
        //     var output = await callGetFunctionNoAccept(AirDropWalletAddress, TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        //     console.log(`AirDrop Wallet balance is ${output.value0}`);
        //     for (let i = 0; i < RcvrsNum; i++) {
        //         var output = await callGetFunctionNoAccept(DropRcvrAddress[i], TONTokenWallet_ABI, "balance", { "_answer_id": 0 });
        //         console.log(`DropRcvr${i} Wallet balance is ${output.value0}`);
        //     }

        // }





        console.log('Normal exit');
        process.exit(0);
    } catch (error) {
        if (error.code === 504) {
            console.error(
                [
                    'Network is inaccessible. You have to start TON OS SE using `tondev se start`',
                    'If you run SE on another port or ip, replace http://localhost endpoint with',
                    'http://localhost:port or http://ip:port in index.js file.',
                ].join('\n'),
            );
        } else {
            console.error(error);
            process.exit(1);
        }
    }
})();

async function calcAddress(_deployOptions, contractName) {
    // Get future `Hello`Wallet contract address from `encode_message` result
    const { address } = await client.abi.encode_message(_deployOptions);
    console.log(`Future address of ${contractName} contract is: ${address}`);
    return address;
}

function buildDeployOptions(keys, contractABI, contractTVC, cotractData = {}, contractInput = {}) {
    // Prepare parameters for deploy message encoding
    // See more info about `encode_message` method parameters here:
    // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_abi.md#encode_message
    const deployOptions = {
        abi: {
            type: 'Contract',
            value: contractABI, //{ 'abi': contractABI },
        },
        deploy_set: {
            tvc: contractTVC,
            initial_data: cotractData,
        },
        call_set: {
            function_name: 'constructor',
            input: contractInput,
        },
        signer: {
            type: 'Keys',
            keys,
        },
    };
    return deployOptions;
}

// Request funds from Giver contract
async function getTokensFromGiver(dest, value) {
    console.log(`Transfering ${value} tokens from giver to ${dest}`);
    //////////
    //LOCAL SE

    const params = {
        send_events: false,
        message_encode_params: {
            address: GIVER_ADDRESS,
            abi: abiContract(GIVER_ABI),
            call_set: {
                function_name: 'sendTransaction',
                input: {
                    dest,
                    value,
                    bounce: false,
                },
            },
            signer: {
                type: 'Keys',
                keys: GIVER_KEYS,
            },
        },
    };

    //////////
    //DEV NET
    // const params = {
    //     send_events: false,
    //     message_encode_params: {
    //         address: GIVER_ADDRESS,
    //         abi: abiContract(GIVER_ABI),
    //         call_set: {
    //             function_name: 'sendTransactionSimple',
    //             input: {
    //                 dest,
    //                 value,
    //             },
    //         },
    //         signer: {
    //             type: 'Keys',
    //             keys: GIVER_KEYS,
    //         },
    //     },
    // };
    await client.processing.process_message(params);
    console.log('Success. Tokens were transfered\n');
}

async function deployWallet(_deployOptions, contractName) {
    // Deploy `Hello wallet` contract
    // See more info about `process_message` here:
    // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_processing.md#process_message
    console.log(`Deploying ${contractName} contract`);
    await client.processing.process_message({
        send_events: false,
        message_encode_params: _deployOptions,
    });
    console.log('Success. Contract was deployed\n');
}

async function callGetFunctionWithAccept(address, contractABI, contractFuncName, contractFuncInp = {}) {
    // Encode the message with `touch` function call
    const params = {
        send_events: false,
        message_encode_params: {
            address,
            abi: {
                type: 'Contract',
                value: contractABI,
            },
            call_set: {
                function_name: contractFuncName,
                input: contractFuncInp,
            },
            signer: signerNone(),
        },
    };
    console.log(`Calling ${contractFuncName} function`);
    const response = await client.processing.process_message(params);
    const { id } = response.transaction;
    console.log(`Success. TransactionId is: ${id} \n`);
    console.log('Success. Output is: %o\n', response.decoded.output);
    // return lt;
}




async function callFunctionSigned(keys, address, contractABI, contractFuncName, contractFuncInp = {}) {

    var params = {
        send_events: false,
        message_encode_params: {
            address: address,
            // Define contract ABI in the Application
            // See more info about ABI type here:
            // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_abi.md#abi
            abi: {
                type: 'Contract',
                value: contractABI,
            },
            call_set: {
                function_name: contractFuncName,
                input: contractFuncInp,
            },
            signer: signerKeys(keys),
        },
    };

    console.log(`Calling ${contractFuncName} function`);
    var response = await client.processing.process_message(params);

    var { id } = response.transaction;
    console.log(`Success. TransactionId is: ${id} \n`);
    // console.log('Success. Output is: %o\n', response.decoded.output);
    // return response;
    return (response.decoded.output);
}

async function callGetFunctionNoAccept(address, contractABI, contractFuncName, contractFuncInp = {}, showInfo = false) {
    // Execute getter on the latest account's state
    // This can be managed in 3 steps:
    // 1. Download the latest Account State (BOC) 
    // 2. Encode message
    // 3. Execute the message locally on the downloaded state

    // Download the latest state (BOC)
    // See more info about wait_for_collection method here:
    // https://tonlabs.gitbook.io/ton-sdk/reference/types-and-methods/mod_net#wait_for_collection
    const account = await downloadAccountBOC(address, showInfo).then(({ result }) => result.boc);

    // Encode the message with `method` call
    const { message } = await client.abi.encode_message({
        abi: {
            type: 'Contract',
            value: contractABI,
        },
        address,
        call_set: {
            function_name: contractFuncName,
            input: contractFuncInp,
        },
        signer: { type: 'None' },
    });

    // Execute `function` get method  (execute the message locally on TVM)
    // See more info about run_tvm method here:
    // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_tvm.md#run_tvm
    showInfo ? console.log(`Run ${contractFuncName} function locally`) : showInfo;
    const response = await client.tvm.run_tvm({
        message,
        account,
        abi: {
            type: 'Contract',
            value: contractABI,
        },
    });
    showInfo ? console.log('Success. Output is: %o\n', response.decoded.output) : showInfo;
    return (response.decoded.output)
}


async function downloadAccountBOC(address, showInfo = false) {
    // console.log('Waiting for account update');
    // const startTime = Date.now();
    var account = await client.net.wait_for_collection({
        collection: 'accounts',
        filter: {
            id: { eq: address },
            // last_trans_lt: { gt: transLt },
        },
        result: 'boc',

    });
    // const duration = Math.floor((Date.now() - startTime) / 1000);
    showInfo ? console.log(`Success. Account downloaded.`) : showInfo;
    return account;
}


async function downloadAccountDATA(address) {
    // console.log('Waiting for account update');
    // const startTime = Date.now();
    var account = await client.net.wait_for_collection({
        collection: 'accounts',
        filter: {
            id: { eq: address },
            // last_trans_lt: { gt: transLt },
        },
        result: 'data',
    });
    // const duration = Math.floor((Date.now() - startTime) / 1000);
    console.log(`Success. Account downloaded.`);
    return account;
}

// Sometimes it is needed to execute getmethods after on-chain calls.
// This means that the downloaded account state should have the changes made by the on-chain call. 
// To ensure it, we need to remember the transaction lt (logical time) of the last call
// and then wait for the account state to have lt > the transaction lt. 
// Note that account.last_trans_lt is always bigger than transaction.lt because this field stores the end lt of transaction interval
// For more information about transaction lt interval read TON Blockchain spec https://test.ton.org/tblkch.pdf P. 4.2.1
// async function waitForAccountUpdate(address, transLt) {
//     console.log('Waiting for account update');
//     const startTime = Date.now();
//     const account = await client.net.wait_for_collection({
//         collection: 'accounts',
//         filter: {
//             id: { eq: address },
//             last_trans_lt: { gt: transLt },
//         },
//         result: 'boc',
//     });
//     const duration = Math.floor((Date.now() - startTime) / 1000);
//     console.log(`Success. Account was updated, it took ${duration} sec.\n`);
//     return account;
// }

async function executeGetTimeLocally(address, transLt) {
    // Execute the get method `getTimestamp` on the latest account's state
    // This can be managed in 3 steps:
    // 1. Download the latest Account State (BOC) 
    // 2. Encode message
    // 3. Execute the message locally on the downloaded state

    // Download the latest state (BOC)
    // See more info about wait_for_collection method here:
    // https://tonlabs.gitbook.io/ton-sdk/reference/types-and-methods/mod_net#wait_for_collection
    const account = await waitForAccountUpdate(address, transLt).then(({ result }) => result.boc);

    // Encode the message with `getTimestamp` call
    const { message } = await client.abi.encode_message({
        // Define contract ABI in the Application
        // See more info about ABI type here:
        // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_abi.md#abi
        abi: {
            type: 'Contract',
            value: HelloWallet.abi,
        },
        address,
        call_set: {
            function_name: 'getTimestamp',
            input: {},
        },
        signer: { type: 'None' },
    });

    // Execute `getTimestamp` get method  (execute the message locally on TVM)
    // See more info about run_tvm method here:
    // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_tvm.md#run_tvm
    console.log('Run `getTimestamp` function locally');
    const response = await client.tvm.run_tvm({
        message,
        account,
        abi: {
            type: 'Contract',
            value: HelloWallet.abi,
        },
    });
    console.log('Success. Output is: %o\n', response.decoded.output);
}

async function sendValue(address, dest, amount, keys) {
    // Encode the message with `sendValue` function call
    const sendValueParams = {
        send_events: false,
        message_encode_params: {
            address,
            // Define contract ABI in the Application
            // See more info about ABI type here:
            // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_abi.md#abi
            abi: {
                type: 'Contract',
                value: HelloWallet.abi,
            },
            call_set: {
                function_name: 'sendValue',
                input: {
                    dest,
                    amount,
                    bounce: false,
                },
            },
            signer: signerKeys(keys),
        },
    };
    console.log(`Sending ${amount} tokens to ${dest}`);
    // Call `sendValue` function
    const response = await client.processing.process_message(sendValueParams);
    console.log('Success. Target account will recieve: %d tokens\n', response.fees.total_output);
    return response.transaction.lt;
}

// Helpers
function readKeysFromFile(fname) {
    const fullName = path.join(__dirname, fname);
    // Read the Giver keys. We need them to sponsor a new contract
    if (!fs.existsSync(fullName)) {
        console.log(`Please place ${fname} file with Giver keys in project root folder`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(fullName, 'utf8'));
}

async function genRandomAddress() {
    const { bytes } = await client.crypto.generate_random_bytes({ length: 32 });
    return `0:${Buffer.from(bytes, 'base64').toString('hex')}`;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
