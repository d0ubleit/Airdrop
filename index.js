const fs = require('fs');
const path = require('path');
const { TonClient, abiContract, signerKeys, signerNone, abiJson } = require('@tonclient/core');
const { libNode } = require('@tonclient/lib-node');

const contractsDir = "d:/Different/projects/nodeJS/sdk-samples/core-examples/node-js/hello-wallet/contracts/"

// ABI and imageBase64 of a binary HelloWallet contract
//const { HelloWallet } = require('./contracts/HelloWallet.js');
const GIVER_ABI = require('./contracts/GiverV2.abi.json');
const GIVER_KEYS = readKeysFromFile('GiverV2.keys.json');

/**
 * If you are running this script not on the TON OS SE, you should:
 *  - change `ENDPOINTS`
 *  - change `GIVER_ADDRESS`
 *  - write down giver keys into 'GiverV2.keys.json'
 */
const ENDPOINTS = ['http://localhost'];
const GIVER_ADDRESS = '0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5';

// Link the platform-dependable TON-SDK binary with the target Application in Typescript
// This is a Node.js project, so we link the application with `libNode` binary
// from `@tonclient/lib-node` package
// If you want to use this code on other platforms, such as Web or React-Native,
// use  `@tonclient/lib-web` and `@tonclient/lib-react-native` packages accordingly
// (see README in  https://github.com/tonlabs/ton-client-js)

const RootToken_ABI = require('./contracts/RootTokenContract.abi.json');
const RootToken_TVC = fs.readFileSync(contractsDir + 'RootTokenContract.tvc', 'base64');
//const RootToken_TVC = fs.readFileSync("RootTokenContract.tvc", 'base64');

// console.log(`Look ${RootToken_ABI}`);

// console.log(`Look ${RootToken_TVC}`);

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




(async () => {
    try {

        // var runProcess = childProcess.execSync('tondev sol compile AirDrop.sol').toString();


        // Generate an ed25519 key pair
        const RootTokenKeys = await client.crypto.generate_random_sign_keys();

        //Create RootToken DeployMsg
        var deployData = require('./contracts/data.json');
        var deployInput = {
            "root_public_key_": "0x" + RootTokenKeys.public,
            "root_owner_address_": "0:0000000000000000000000000000000000000000000000000000000000000000" //For external deploy
        }
        var deployMsg = buildDeployOptions(RootTokenKeys, RootToken_ABI, RootToken_TVC, deployData, deployInput);


        // Calculate future wallet address.
        const RootTokenAddress = await calcAddress(deployMsg, "RootTokenContract");

        // Send some tokens to `RootTokenAddress` before deploy
        await getTokensFromGiver(RootTokenAddress, 100_000_000_000);

        //Deploy RootTokenWallet
        await deployWallet(deployMsg, "RootTokenContract");
        console.log(`Check Root by calling method getDetails`);
        await callGetFunctionNoAccept(RootTokenAddress, RootToken_ABI, "getDetails", { "_answer_id": 0 });


        // console.log(`--------------End here`);

        // // Execute `touch` method for newly deployed Hello wallet contract
        // // Remember the logical time of the generated transaction
        // let transLt = await touchWallet(RootTokenAddress);
        deployInput = { "_token": RootTokenAddress };
        deployMsg = buildDeployOptions(RootTokenKeys, AirDrop_ABI, AirDrop_TVC, deployData = {}, deployInput);
        AirDropAddress = await calcAddress(deployMsg, "AirDrop");
        await getTokensFromGiver(AirDropAddress, 100_000_000_000);
        await deployWallet(deployMsg, "AirDrop");


        console.log(`Check AirDrop by calling method getDetails and get AirDrop Wallet address`);
        var output = await callGetFunctionNoAccept(AirDropAddress, AirDrop_ABI, "getDetails");

        const AirDropWalletAddress = output._token_wallet;
        console.log(`AirDrop Wallet address is ${AirDropWalletAddress}`);
        // await callGetFunctionWithAccept(AirDropAddress, AirDrop_ABI, "getDetails")

        console.log(`Lets try to mint 10 tokens to AirDrop Wallet address`);
        await callFunctionSigned(RootTokenKeys, RootTokenAddress, RootToken_ABI, "mint", { "tokens": 10, "to": AirDropWalletAddress });
        console.log(`Check total supply`);
        output = await callGetFunctionNoAccept(RootTokenAddress, RootToken_ABI, "getDetails", { "_answer_id": 0 });
        // var total_supply = output.value0.total_supply
        console.log(`total supply = ${output.value0.total_supply}`);

        ///////////////////////////
        //AirDropClient
        ///////////////////////////
        const userKeys = await client.crypto.generate_random_sign_keys();



        // // You can run contract's get methods locally
        // await executeGetTimeLocally(RootTokenAddress, transLt);

        // // Send some tokens from Hello wallet to a random account
        // // Remember the logical time of the generated transaction
        // const destAddress = await genRandomAddress();
        // transLt = await sendValue(RootTokenAddress, destAddress, 100_000_000, RootTokenKeys);
        // await waitForAccountUpdate(destAddress, transLt);

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
    return response;
}

async function callGetFunctionNoAccept(address, contractABI, contractFuncName, contractFuncInp = {}) {
    // Execute the get method `getTimestamp` on the latest account's state
    // This can be managed in 3 steps:
    // 1. Download the latest Account State (BOC) 
    // 2. Encode message
    // 3. Execute the message locally on the downloaded state

    // Download the latest state (BOC)
    // See more info about wait_for_collection method here:
    // https://tonlabs.gitbook.io/ton-sdk/reference/types-and-methods/mod_net#wait_for_collection
    const account = await downloadAccount(address).then(({ result }) => result.boc);

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
    console.log(`Run ${contractFuncName} function locally`);
    const response = await client.tvm.run_tvm({
        message,
        account,
        abi: {
            type: 'Contract',
            value: contractABI,
        },
    });
    console.log('Success. Output is: %o\n', response.decoded.output);
    return (response.decoded.output)
}


async function downloadAccount(address) {
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
