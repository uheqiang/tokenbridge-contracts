const Web3Utils = require('web3-utils')
require('dotenv').config({
  path: __dirname + '/../.env'
});

const assert = require('assert');

const {deployContract, sendRawTx} = require('./deploymentUtils');
const {web3Home, deploymentPrivateKey, HOME_RPC_URL} = require('./web3');

const EternalStorageProxy = require('../../build/contracts/EternalStorageProxy.json');
const BridgeValidators = require('../../build/contracts/BridgeValidators.json')
const HomeBridge = require('../../build/contracts/HomeBridge.json')

const VALIDATORS = process.env.VALIDATORS.split(" ")
const HOME_GAS_PRICE =  Web3Utils.toWei(process.env.HOME_GAS_PRICE, 'gwei');

const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  REQUIRED_NUMBER_OF_VALIDATORS,
  HOME_BRIDGE_OWNER,
  HOME_VALIDATORS_OWNER,
  HOME_UPGRADEABLE_ADMIN,
  HOME_DAILY_LIMIT,
  HOME_MAX_AMOUNT_PER_TX,
  HOME_MIN_AMOUNT_PER_TX,
  HOME_REQUIRED_BLOCK_CONFIRMATIONS,
  FOREIGN_DAILY_LIMIT,
  FOREIGN_MAX_AMOUNT_PER_TX
} = process.env;

async function deployHome()
{
  let homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);
  console.log('deploying storage for home validators')
  const storageValidatorsHome = await deployContract(EternalStorageProxy, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: homeNonce})
  console.log('[Home] BridgeValidators Storage: ', storageValidatorsHome.options.address)
  homeNonce++;

  console.log('\ndeploying implementation for home validators')
  let bridgeValidatorsHome = await deployContract(BridgeValidators, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: homeNonce})
  console.log('[Home] BridgeValidators Implementation: ', bridgeValidatorsHome.options.address)
  homeNonce++;

  console.log('\nhooking up eternal storage to BridgeValidators')
  const upgradeToBridgeVHomeData = await storageValidatorsHome.methods.upgradeTo('1', bridgeValidatorsHome.options.address)
    .encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txUpgradeToBridgeVHome = await sendRawTx({
    data: upgradeToBridgeVHomeData,
    nonce: homeNonce,
    to: storageValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.equal(txUpgradeToBridgeVHome.status, '0x1', 'Transaction Failed');
  homeNonce++;

  console.log('\ninitializing Home Bridge Validators with following parameters:\n')
  console.log(`REQUIRED_NUMBER_OF_VALIDATORS: ${REQUIRED_NUMBER_OF_VALIDATORS}, VALIDATORS: ${VALIDATORS}`)
  bridgeValidatorsHome.options.address = storageValidatorsHome.options.address
  const initializeData = await bridgeValidatorsHome.methods.initialize(
    REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, HOME_VALIDATORS_OWNER
  ).encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS})
  const txInitialize = await sendRawTx({
    data: initializeData,
    nonce: homeNonce,
    to: bridgeValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.equal(txInitialize.status, '0x1', 'Transaction Failed');
  const validatorOwner = await bridgeValidatorsHome.methods.owner().call();
  assert.equal(validatorOwner.toLocaleLowerCase(), HOME_VALIDATORS_OWNER.toLocaleLowerCase());
  homeNonce++;

  console.log('transferring proxy ownership to multisig for Validators Proxy contract');
  const proxyDataTransfer = await storageValidatorsHome.methods.transferProxyOwnership(HOME_UPGRADEABLE_ADMIN).encodeABI();
  const txProxyDataTransfer = await sendRawTx({
    data: proxyDataTransfer,
    nonce: homeNonce,
    to: storageValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.equal(txProxyDataTransfer.status, '0x1', 'Transaction Failed');
  const newProxyOwner = await storageValidatorsHome.methods.proxyOwner().call();
  assert.equal(newProxyOwner.toLocaleLowerCase(), HOME_UPGRADEABLE_ADMIN.toLocaleLowerCase());
  homeNonce++;

  console.log('\ndeploying homeBridge storage\n')
  const homeBridgeStorage = await deployContract(EternalStorageProxy, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: homeNonce})
  homeNonce++;
  console.log('[Home] HomeBridge Storage: ', homeBridgeStorage.options.address)

  console.log('\ndeploying homeBridge implementation\n')
  const homeBridgeImplementation = await deployContract(HomeBridge, [], {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: homeNonce})
  homeNonce++;
  console.log('[Home] HomeBridge Implementation: ', homeBridgeImplementation.options.address)

  console.log('\nhooking up HomeBridge storage to HomeBridge implementation')
  const upgradeToHomeBridgeData = await homeBridgeStorage.methods.upgradeTo('1', homeBridgeImplementation.options.address)
    .encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txUpgradeToHomeBridge = await sendRawTx({
    data: upgradeToHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.equal(txUpgradeToHomeBridge.status, '0x1', 'Transaction Failed');
  homeNonce++;

  console.log('\ninitializing Home Bridge with following parameters:\n')
  console.log(`Home Validators: ${storageValidatorsHome.options.address},
  HOME_DAILY_LIMIT : ${HOME_DAILY_LIMIT} which is ${Web3Utils.fromWei(HOME_DAILY_LIMIT)} in eth,
  HOME_MAX_AMOUNT_PER_TX: ${HOME_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(HOME_MAX_AMOUNT_PER_TX)} in eth,
  HOME_MIN_AMOUNT_PER_TX: ${HOME_MIN_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(HOME_MIN_AMOUNT_PER_TX)} in eth,
  HOME_GAS_PRICE: ${HOME_GAS_PRICE}, HOME_REQUIRED_BLOCK_CONFIRMATIONS : ${HOME_REQUIRED_BLOCK_CONFIRMATIONS},
  FOREIGN_DAILY_LIMIT : ${FOREIGN_DAILY_LIMIT} which is ${Web3Utils.fromWei(FOREIGN_DAILY_LIMIT)} in eth,
  FOREIGN_MAX_AMOUNT_PER_TX: ${FOREIGN_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(FOREIGN_MAX_AMOUNT_PER_TX)} in eth
  `)
  homeBridgeImplementation.options.address = homeBridgeStorage.options.address
  const initializeHomeBridgeData = await homeBridgeImplementation.methods.initialize(
    storageValidatorsHome.options.address,
    HOME_DAILY_LIMIT,
    HOME_MAX_AMOUNT_PER_TX,
    HOME_MIN_AMOUNT_PER_TX,
    HOME_GAS_PRICE,
    HOME_REQUIRED_BLOCK_CONFIRMATIONS,
    FOREIGN_DAILY_LIMIT,
    FOREIGN_MAX_AMOUNT_PER_TX,
    HOME_BRIDGE_OWNER
  ).encodeABI({from: DEPLOYMENT_ACCOUNT_ADDRESS});
  const txInitializeHomeBridge = await sendRawTx({
    data: initializeHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  });
  assert.equal(txInitializeHomeBridge.status, '0x1', 'Transaction Failed');
  homeNonce++;

  console.log('transferring proxy ownership to multisig for Home bridge Proxy contract');
  const homeBridgeProxyData = await homeBridgeStorage.methods.transferProxyOwnership(HOME_UPGRADEABLE_ADMIN).encodeABI();
  const txhomeBridgeProxyData = await sendRawTx({
    data: homeBridgeProxyData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.equal(txhomeBridgeProxyData.status, '0x1', 'Transaction Failed');
  const newProxyBridgeOwner = await homeBridgeStorage.methods.proxyOwner().call();
  assert.equal(newProxyBridgeOwner.toLocaleLowerCase(), HOME_UPGRADEABLE_ADMIN.toLocaleLowerCase());
  homeNonce++;

  console.log('\nHome Deployment Bridge is complete\n')
  return {
    address: homeBridgeStorage.options.address,
    deployedBlockNumber: Web3Utils.hexToNumber(homeBridgeStorage.deployedBlockNumber)
  }

}
module.exports = deployHome;
