/* eslint-disable no-param-reassign */
// const BigNumber = require('bignumber.js')
// const Web3 = require('web3')
// const Tx = require('ethereumjs-tx')
// const Web3Utils = require('web3-utils')
// const fetch = require('node-fetch')
const assert = require('assert')
// const promiseRetry = require('promise-retry')

const {
    khcWebHome,
    khcWebForeign,
    // deploymentPrivateKey,
    HOME_RPC_URL
    // ,
    // FOREIGN_RPC_URL,
    // GAS_LIMIT_EXTRA,
    // HOME_DEPLOYMENT_GAS_PRICE,
    // FOREIGN_DEPLOYMENT_GAS_PRICE,
    // GET_RECEIPT_INTERVAL_IN_MILLISECONDS,
    // HOME_EXPLORER_URL,
    // FOREIGN_EXPLORER_URL,
    // HOME_EXPLORER_API_KEY,
    // FOREIGN_EXPLORER_API_KEY
} = require('./khcWeb3')

async function deployContractOnDpos(contractJson, args, network) {
    let khcWeb
    if (network === 'foreign') {
        khcWeb = khcWebForeign
    } else {
        khcWeb = khcWebHome
    }
    let contract_instance = await khcWeb.contract().new({
        abi:contractJson.abi,
        bytecode:contractJson.bytecode,
        feeLimit:1000000000,
        callValue:0,
        userFeePercentage:1,
        originEnergyLimit:10000000,
        parameters:args
    });
    console.log("[home] Contract address on dpos network: ", contract_instance.address)
    console.log("Verify that this contract was successfully deployed ...")

    const result = checkContract(khcWeb, contract_instance.address)
    assert.strictEqual(result, true, 'Contract deploy failed')
    return contract_instance;
}

// async function sendRawTxHome(options) {
//     return sendRawTx({
//         ...options,
//         gasPrice: HOME_DEPLOYMENT_GAS_PRICE
//     })
// }
//
// async function sendRawTxForeign(options) {
//     return sendRawTx({
//         ...options,
//         gasPrice: FOREIGN_DEPLOYMENT_GAS_PRICE
//     })
// }

// async function sendRawTx({ data, nonce, to, privateKey, url, gasPrice, value }) {
//     try {
//         const txToEstimateGas = {
//             from: privateKeyToAddress(Web3Utils.bytesToHex(privateKey)),
//             value,
//             to,
//             data
//         }
//         const estimatedGas = BigNumber(await sendNodeRequest(url, 'eth_estimateGas', txToEstimateGas))
//
//         const blockData = await sendNodeRequest(url, 'eth_getBlockByNumber', ['latest', false])
//         const blockGasLimit = BigNumber(blockData.gasLimit)
//         if (estimatedGas.isGreaterThan(blockGasLimit)) {
//             throw new Error(
//                 `estimated gas greater (${estimatedGas.toString()}) than the block gas limit (${blockGasLimit.toString()})`
//             )
//         }
//         let gas = estimatedGas.multipliedBy(BigNumber(1 + GAS_LIMIT_EXTRA))
//         if (gas.isGreaterThan(blockGasLimit)) {
//             gas = blockGasLimit
//         } else {
//             gas = gas.toFixed(0)
//         }
//
//         const rawTx = {
//             nonce,
//             gasPrice: Web3Utils.toHex(gasPrice),
//             gasLimit: Web3Utils.toHex(gas),
//             to,
//             data,
//             value
//         }
//
//         const tx = new Tx(rawTx)
//         tx.sign(privateKey)
//         const serializedTx = tx.serialize()
//         const txHash = await sendNodeRequest(url, 'eth_sendRawTransaction', `0x${serializedTx.toString('hex')}`)
//         console.log('pending txHash', txHash)
//         return await getReceipt(txHash, url)
//     } catch (e) {
//         console.error(e)
//     }
// }

// async function sendNodeRequest(url, method, signedData) {
//     if (!Array.isArray(signedData)) {
//         signedData = [signedData]
//     }
//     const request = await fetch(url, {
//         headers: {
//             'Content-type': 'application/json'
//         },
//         method: 'POST',
//         body: JSON.stringify({
//             jsonrpc: '2.0',
//             method,
//             params: signedData,
//             id: 1
//         })
//     })
//     const json = await request.json()
//     if (typeof json.error === 'undefined' || json.error === null) {
//         if (method === 'eth_sendRawTransaction') {
//             assert.strictEqual(json.result.length, 66, `Tx wasn't sent ${json}`)
//         }
//         return json.result
//     }
//     throw new Error(`web3 RPC failed: ${JSON.stringify(json.error)}`)
// }

// function timeout(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms))
// }

// async function getReceipt(txHash, url) {
//     await timeout(GET_RECEIPT_INTERVAL_IN_MILLISECONDS)
//     let receipt = await sendNodeRequest(url, 'eth_getTransactionReceipt', txHash)
//     if (receipt === null || receipt.blockNumber === null) {
//         receipt = await getReceipt(txHash, url)
//     }
//     return receipt
// }

// function add0xPrefix(s) {
//     if (s.indexOf('0x') === 0) {
//         return s
//     }
//     return `0x${s}`
// }

// function privateKeyToAddress(privateKey) {
//     return new Web3().eth.accounts.privateKeyToAccount(add0xPrefix(privateKey)).address
// }

function logValidatorsAndRewardAccounts(validators, rewards) {
    console.log(`VALIDATORS\n==========`)
    validators.forEach((validator, index) => {
        console.log(`${index + 1}: ${validator}, reward address ${rewards[index]}`)
    })
}

async function upgradeProxyOnDpos({ proxy, implementationAddress, version, url }) {
    // const proxyContract = await tronWebHome.contract.at(proxy.address)
    const proxyContract = getContract(url, proxy.address)
    const txHash = await proxyContract.upgradeTo(version, implementationAddress).send()

    // todo
    // await sleep(3000)
    // const tronWeb = getTronWeb(url)
    // const result = tronWeb.trx.getTransaction(txHash)
    const result = getTxStatus(url, txHash)
    console.log('[home] Update proxy on dpos, tx exec status: ', result.ret[0].contractRet)
    assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')
}



// async function upgradeProxy({ proxy, implementationAddress, version, nonce, url }) {
//     const data = await proxy.methods.upgradeTo(version, implementationAddress).encodeABI()
//     const sendTx = getSendTxMethod(url)
//     const result = await sendTx({
//         data,
//         nonce,
//         to: proxy.options.address,
//         privateKey: deploymentPrivateKey,
//         url
//     })
//     if (result.status) {
//         assert.strictEqual(Web3Utils.hexToNumber(result.status), 1, 'Transaction Failed')
//     } else {
//         await assertStateWithRetry(proxy.methods.implementation().call, implementationAddress)
//     }
// }

async function transferProxyOwnership({ proxy, newOwner, url }) {
    const proxyContract = getContract(url, proxy.address)
    const txHash = await proxyContract.transferProxyOwnership(newOwner).send()

    // await sleep(3000)
    // const tronWeb = getTronWeb(url)
    // const result = tronWeb.trx.getTransaction(txHash)
    const result = getTxStatus(url, txHash)
    console.log('[home] Transfer proxy ownership, tx exec status: ', result.ret[0].contractRet)
    assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')

    // const sendTx = getSendTxMethod(url)
    // const result = await sendTx({
    //     data,
    //     nonce,
    //     to: proxy.options.address,
    //     privateKey: deploymentPrivateKey,
    //     url
    // })
    // if (result.status) {
    //     assert.strictEqual(Web3Utils.hexToNumber(result.status), 1, 'Transaction Failed')
    // } else {
    //     await assertStateWithRetry(proxy.methods.proxyOwner().call, newOwner)
    // }
}

async function transferOwnership({ contract, newOwner, nonce, url }) {
    const erc677BridgeTokenContact = getContract(url, contract.address)
    const txHash = await erc677BridgeTokenContact.transferOwnership(newOwner).send()

    // await sleep(3000)
    // const tronWeb = getTronWeb(url)
    // const result = tronWeb.trx.getTransaction(txHash)
    const result = getTxStatus(url, txHash)
    console.log('[home] Transfer ownership, tx exec status: ', result.ret[0].contractRet)
    assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')

    // const data = await contract.methods.transferOwnership(newOwner).encodeABI()
    // const sendTx = getSendTxMethod(url)
    // const result = await sendTx({
    //     data,
    //     nonce,
    //     to: contract.options.address,
    //     privateKey: deploymentPrivateKey,
    //     url
    // })
    // if (result.status) {
    //     assert.strictEqual(Web3Utils.hexToNumber(result.status), 1, 'Transaction Failed')
    // } else {
    //     await assertStateWithRetry(contract.methods.owner().call, newOwner)
    // }
}

async function setBridgeContract({ contract, bridgeAddress, nonce, url }) {
    const erc677BridgeTokenContract = getContract(url, contract.address)
    const txHash = await erc677BridgeTokenContract.setBridgeContract(bridgeAddress).send()

    // await sleep(3000)
    // const tronWeb = getTronWeb(url)
    // const result = tronWeb.trx.getTransaction(txHash)
    const result = getTxStatus(url, txHash)
    console.log('[home] Set bridge contract, tx exec status: ', result.ret[0].contractRet)
    assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')

    // const sendTx = getSendTxMethod(url)
    // const result = await sendTx({
    //     data,
    //     nonce,
    //     to: contract.options.address,
    //     privateKey: deploymentPrivateKey,
    //     url
    // })
    // if (result.status) {
    //     assert.strictEqual(Web3Utils.hexToNumber(result.status), 1, 'Transaction Failed')
    // } else {
    //     await assertStateWithRetry(contract.methods.bridgeContract().call, bridgeAddress)
    // }
}

async function initializeValidators({contract, isRewardableBridge, requiredNumber, validators, rewardAccounts, owner, url}) {
    let txHash
    const proxyContract = getContract(url, contract.address)
    if (isRewardableBridge) {
        console.log(`REQUIRED_NUMBER_OF_VALIDATORS: ${requiredNumber}, VALIDATORS_OWNER: ${owner}`)
        logValidatorsAndRewardAccounts(validators, rewardAccounts)
        // todo RewardableValidators.sol
        txHash = await proxyContract.initialize(requiredNumber, validators, rewardAccounts, owner).send()
    } else {
        console.log(`REQUIRED_NUMBER_OF_VALIDATORS: ${requiredNumber}, VALIDATORS: ${validators}, VALIDATORS_OWNER: ${owner}`)
        // todo BridgeValidators.sol
        txHash = await proxyContract.initialize(requiredNumber, validators, owner).send()
    }
    // const tronWeb = getTronWeb(url)
    // const result = await tronWeb.trx.getTransaction(txHash)
    const result = getTxStatus(url, txHash)
    console.log('[home] Initialize validators on dpos, tx exec status: ', result.ret[0].contractRet)
    assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')
}

// async function assertStateWithRetry(fn, expected) {
//     return promiseRetry(async retry => {
//         const value = await fn()
//         if (value !== expected && value.toString() !== expected) {
//             retry(`Transaction Failed. Expected: ${expected} Actual: ${value}`)
//         }
//     })
// }

// function getSendTxMethod(url) {
//     return url === HOME_RPC_URL ? sendRawTxHome : sendRawTxForeign
// }

async function sleep(millis = 3000){
    return new Promise(resolve => setTimeout(resolve, millis));
}

async function getTxStatus(url, txHash) {
    let times = 0
    let result
    while (times < 2){
        await sleep()
        const tronWeb = getKhcWeb(url)
        result = tronWeb.khc.getTransaction(txHash)
        if (result){
            break
        }
    }
    return result
}

async function checkContract(khcWeb, contractAddress) {
    let times = 0
    while (times < 6){
        await sleep()
        // khcWeb.khc.getContract(contractAddress).then(console.log)
        const result = khcWeb.khc.getContract(contractAddress)
        if (result && result.bytecode){
            return true
        }
        times++
    }
    return false
}

async function getContract(url, contractAddress) {
    const khcWeb = getKhcWeb(url)
    return await khcWeb.contract().at(contractAddress)
}

function getKhcWeb(url) {
    let khcWeb;
    if (url === HOME_RPC_URL) {
        khcWeb = khcWebHome
    } else {
        khcWeb = khcWebForeign
    }
    return khcWeb
}

// async function isContract(web3, address) {
//     const code = await web3.eth.getCode(address)
//     return code !== '0x' && code !== '0x0'
// }

module.exports = {
    deployContractOnDpos,
    // sendRawTxHome,
    // sendRawTxForeign,
    // privateKeyToAddress,
    // logValidatorsAndRewardAccounts,
    // upgradeProxy,
    upgradeProxyOnDpos,
    initializeValidators,
    transferProxyOwnership,
    transferOwnership,
    setBridgeContract,
    // assertStateWithRetry,
    // isContract,
    getTxStatus,
    getContract,
    sleep,
    getKhcWeb
}
