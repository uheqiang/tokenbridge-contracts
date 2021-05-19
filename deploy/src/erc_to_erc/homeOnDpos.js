const assert = require('assert')
// const Web3Utils = require('web3-utils')
const env = require('../loadEnv')
const { ZERO_ADDRESS } = require('../constants')

const {
    deployContractOnDpos,
    // privateKeyToAddress,
    // sendRawTxHome,
    upgradeProxyOnDpos,
    initializeValidators,
    transferProxyOwnership,
    setBridgeContract,
    transferOwnership,
    // assertStateWithRetry,
    getTxStatus,
    getContract,
    sleep,
    getKhcWeb
} = require('../deploymentUtilsOnDpos')

const {khcWebHome, HOME_RPC_URL } = require('../khcWeb3')

const {
    homeContracts: {
        EternalStorageProxy,
        BridgeValidators,
        RewardableValidators,
        FeeManagerErcToErcPOSDAO,
        HomeBridgeErcToErc: HomeBridge,
        HomeBridgeErcToErcPOSDAO,
        ERC677BridgeToken,
        ERC677BridgeTokenRewardable
    }
} = require('../loadContracts')

const VALIDATORS = env.VALIDATORS.split(' ')

const {
    REQUIRED_NUMBER_OF_VALIDATORS,
    HOME_BRIDGE_OWNER,
    HOME_VALIDATORS_OWNER,
    HOME_UPGRADEABLE_ADMIN,
    HOME_DAILY_LIMIT,
    HOME_MAX_AMOUNT_PER_TX,
    HOME_MIN_AMOUNT_PER_TX,
    HOME_REQUIRED_BLOCK_CONFIRMATIONS,
    HOME_GAS_PRICE,
    BRIDGEABLE_TOKEN_NAME,
    BRIDGEABLE_TOKEN_SYMBOL,
    BRIDGEABLE_TOKEN_DECIMALS,
    FOREIGN_DAILY_LIMIT,
    FOREIGN_MAX_AMOUNT_PER_TX,
    DEPLOY_REWARDABLE_TOKEN,
    BLOCK_REWARD_ADDRESS,
    DPOS_STAKING_ADDRESS,
    HOME_REWARDABLE,
    HOME_TRANSACTIONS_FEE,
    FOREIGN_TRANSACTIONS_FEE,
    FOREIGN_TO_HOME_DECIMAL_SHIFT
} = env

// const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

const foreignToHomeDecimalShift = FOREIGN_TO_HOME_DECIMAL_SHIFT || 0

const isRewardableBridge = HOME_REWARDABLE === 'BOTH_DIRECTIONS'

let VALIDATORS_REWARD_ACCOUNTS = []

if (isRewardableBridge && BLOCK_REWARD_ADDRESS === ZERO_ADDRESS) {
    VALIDATORS_REWARD_ACCOUNTS = env.VALIDATORS_REWARD_ACCOUNTS.split(' ')
}

async function initializeBridge({ validatorsBridge, bridge, erc677token }) {
    let txHash

    if (isRewardableBridge && BLOCK_REWARD_ADDRESS !== ZERO_ADDRESS) {
        console.log('\ndeploying implementation for fee manager')
        const feeManager = await deployContractOnDpos(FeeManagerErcToErcPOSDAO, [], "home")
        console.log('[Home] feeManager Implementation: ', feeManager.address)

        // const homeFeeInWei = Web3Utils.toWei(HOME_TRANSACTIONS_FEE.toString(), 'ether')
        // const foreignFeeInWei = Web3Utils.toWei(FOREIGN_TRANSACTIONS_FEE.toString(), 'ether')
        const homeFeeInWei = HOME_TRANSACTIONS_FEE
        const foreignFeeInWei = FOREIGN_TRANSACTIONS_FEE
        console.log('\ninitializing Home Bridge with fee contract:\n')
        /*console.log(`Home Validators: ${validatorsBridge.options.address},
    HOME_DAILY_LIMIT : ${HOME_DAILY_LIMIT} which is ${Web3Utils.fromWei(HOME_DAILY_LIMIT)} in eth,
    HOME_MAX_AMOUNT_PER_TX: ${HOME_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(HOME_MAX_AMOUNT_PER_TX)} in eth,
    HOME_MIN_AMOUNT_PER_TX: ${HOME_MIN_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(HOME_MIN_AMOUNT_PER_TX)} in eth,
    HOME_GAS_PRICE: ${HOME_GAS_PRICE}, HOME_REQUIRED_BLOCK_CONFIRMATIONS : ${HOME_REQUIRED_BLOCK_CONFIRMATIONS},
    Block Reward: ${BLOCK_REWARD_ADDRESS},
    Fee Manager: ${feeManager.options.address},
    Home Fee: ${homeFeeInWei} which is ${HOME_TRANSACTIONS_FEE * 100}%
    Foreign Fee: ${foreignFeeInWei} which is ${FOREIGN_TRANSACTIONS_FEE * 100}%`)*/
        console.log(`Home Validators: ${validatorsBridge.address},
                     HOME_GAS_PRICE: ${HOME_GAS_PRICE}, 
                     HOME_REQUIRED_BLOCK_CONFIRMATIONS : ${HOME_REQUIRED_BLOCK_CONFIRMATIONS},
                     Block Reward: ${BLOCK_REWARD_ADDRESS},
                     Fee Manager: ${feeManager.address}`)

        sleep(3000)

        // const bridgeContract = getContract(HOME_RPC_URL, bridge)
        const bridgeContract = await khcWebHome.contract().at(bridge)
        txHash = await bridgeContract.rewardableInitialize(
                validatorsBridge.address,
                [HOME_DAILY_LIMIT.toString(), HOME_MAX_AMOUNT_PER_TX.toString(), HOME_MIN_AMOUNT_PER_TX.toString()],
                HOME_GAS_PRICE,
                HOME_REQUIRED_BLOCK_CONFIRMATIONS,
                erc677token.address,
                [FOREIGN_DAILY_LIMIT.toString(), FOREIGN_MAX_AMOUNT_PER_TX.toString()],
                HOME_BRIDGE_OWNER,
                feeManager.address,
                [homeFeeInWei.toString(), foreignFeeInWei.toString()],
                BLOCK_REWARD_ADDRESS,
                foreignToHomeDecimalShift
            ).send()
    } else {
        console.log(`Home Validators: ${validatorsBridge.address},
    HOME_DAILY_LIMIT : ${HOME_DAILY_LIMIT} which is HOME_DAILY_LIMIT in trx,
    HOME_MAX_AMOUNT_PER_TX: ${HOME_MAX_AMOUNT_PER_TX} which is HOME_MAX_AMOUNT_PER_TX in trx,
    HOME_MIN_AMOUNT_PER_TX: ${HOME_MIN_AMOUNT_PER_TX} which is HOME_MIN_AMOUNT_PER_TX in trx,
    HOME_REQUIRED_BLOCK_CONFIRMATIONS : ${HOME_REQUIRED_BLOCK_CONFIRMATIONS},
    FOREIGN_TO_HOME_DECIMAL_SHIFT: ${foreignToHomeDecimalShift},
    ERC677TOKEN_ADDRESS: ${erc677token.address},
    VALIDATORSBRIDGE_ADDRESS: ${validatorsBridge.address}
    `)
        // const bridgeContract = getContract(HOME_RPC_URL, bridge)
        const bridgeContract = await khcWebHome.contract().at(bridge.address)
        // HomeBridgeErcToErcPOSDAO.sol or HomeBridgeErcToErc.sol
        txHash = bridgeContract.initialize(
            validatorsBridge.address,
            [HOME_DAILY_LIMIT.toString(), HOME_MAX_AMOUNT_PER_TX.toString(), HOME_MIN_AMOUNT_PER_TX.toString()],
            HOME_GAS_PRICE,
            HOME_REQUIRED_BLOCK_CONFIRMATIONS,
            erc677token.address,
            [FOREIGN_DAILY_LIMIT.toString(), FOREIGN_MAX_AMOUNT_PER_TX.toString()],
            HOME_BRIDGE_OWNER,
            foreignToHomeDecimalShift
        )
    }

    // const result = getTxStatus(url, txHash)
    // console.log('[Home] Set bridge contract, tx exec status: ', result.ret[0].contractRet)
    // assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')
}

async function deployHomeOnDpos() {
    console.log('[Home] Deploying storage for home validators')
    const storageValidatorsHome = await deployContractOnDpos(EternalStorageProxy, [], "home")
    console.log('[Home] BridgeValidators Storage: ', storageValidatorsHome.address)

    console.log('\n[Home] Deploying implementation for home validators')
    const bridgeValidatorsContract =
        isRewardableBridge && BLOCK_REWARD_ADDRESS === ZERO_ADDRESS ? RewardableValidators : BridgeValidators
    const bridgeValidatorsHome = await deployContractOnDpos(bridgeValidatorsContract, [], "home")
    console.log('[Home] BridgeValidators Implementation: ', bridgeValidatorsHome.address)

    console.log('\n[Home] Hooking up eternal storage to BridgeValidators')
    await upgradeProxyOnDpos({
        proxy: storageValidatorsHome,
        implementationAddress: bridgeValidatorsHome.address,
        version: '1',
        url: HOME_RPC_URL
    })

    console.log('\n[Home] Initializing Home Bridge Validators with following parameters:\n')
    //bridgeValidatorsHome.address = storageValidatorsHome.address
    await initializeValidators({
        contract: bridgeValidatorsHome,
        isRewardableBridge: isRewardableBridge && BLOCK_REWARD_ADDRESS === ZERO_ADDRESS,
        requiredNumber: REQUIRED_NUMBER_OF_VALIDATORS,
        validators: VALIDATORS,
        rewardAccounts: VALIDATORS_REWARD_ACCOUNTS,
        owner: HOME_VALIDATORS_OWNER,
        url: HOME_RPC_URL
    })

    console.log('[Home] Transferring proxy ownership to multisig for Validators Proxy contract')
    await transferProxyOwnership({
        proxy: storageValidatorsHome,
        newOwner: HOME_UPGRADEABLE_ADMIN,
        url: HOME_RPC_URL
    })

    console.log('\n[Home] Deploying homeBridge storage\n')
    const homeBridgeStorage = await deployContractOnDpos(EternalStorageProxy, [], "home")
    console.log('[Home] HomeBridge Storage: ', homeBridgeStorage.address)

    console.log('\n[Home] Deploying homeBridge implementation\n')
    const bridgeContract = isRewardableBridge && BLOCK_REWARD_ADDRESS !== ZERO_ADDRESS ? HomeBridgeErcToErcPOSDAO : HomeBridge
    const homeBridgeImplementation = await deployContractOnDpos(bridgeContract, [], "home")
    console.log('[Home] HomeBridge Implementation: ', homeBridgeImplementation.address)

    console.log('\n[Home] Hooking up HomeBridge storage to HomeBridge implementation')
    await upgradeProxyOnDpos({
        proxy: homeBridgeStorage,
        implementationAddress: homeBridgeImplementation.address,
        version: '1',
        url: HOME_RPC_URL
    })

    console.log('\n[Home] Deploying Bridgeable token')
    const rewardable = (isRewardableBridge && BLOCK_REWARD_ADDRESS !== ZERO_ADDRESS) || DEPLOY_REWARDABLE_TOKEN
    const erc677Contract = rewardable ? ERC677BridgeTokenRewardable : ERC677BridgeToken
    let args = [BRIDGEABLE_TOKEN_NAME, BRIDGEABLE_TOKEN_SYMBOL, BRIDGEABLE_TOKEN_DECIMALS]
    // if (rewardable) {
    //     const chainId = await web3Home.eth.getChainId()
    //     assert.strictEqual(chainId > 0, true, 'Invalid chain ID')
    //     args.push(chainId)
    // }
    const erc677token = await deployContractOnDpos(erc677Contract, args,'home')
    console.log('[Home] Bridgeable Token: ', erc677token.address)

    console.log('\n[Home] Set bridge contract on ERC677BridgeToken')
    await setBridgeContract({
        contract: erc677token,
        bridgeAddress: homeBridgeStorage.address,
        url: HOME_RPC_URL
    })

    if ((isRewardableBridge && BLOCK_REWARD_ADDRESS !== ZERO_ADDRESS) || DEPLOY_REWARDABLE_TOKEN) {
        console.log('\n[Home] Set BlockReward contract on ERC677BridgeTokenRewardable')
        const erc677BridgeTokenContact = getContract(HOME_RPC_URL, erc677token.address)
        const txHash = await erc677BridgeTokenContact.setBlockRewardContract(BLOCK_REWARD_ADDRESS).send()

        // const result = getTxStatus(url, txHash)
        // console.log('[Home] Set bridge contract, tx exec status: ', result.ret[0].contractRet)
        // assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')
    }

    if (DEPLOY_REWARDABLE_TOKEN) {
        console.log('\n[Home] set Staking contract on ERC677BridgeTokenRewardable')
        const erc677BridgeTokenContact = getContract(HOME_RPC_URL, erc677token.address)
        const txHash = await erc677BridgeTokenContact.setStakingContract(DPOS_STAKING_ADDRESS).send()

        // const result = getTxStatus(url, txHash)
        // console.log('[Home] Set bridge contract, tx exec status: ', result.ret[0].contractRet)
        // assert.strictEqual(result.ret[0].contractRet, 'SUCCESS', 'Transaction Failed')
    }

    console.log('[Home] transferring ownership of Bridgeble token to homeBridge contract')
    await transferOwnership({
        contract: erc677token,
        newOwner: homeBridgeStorage.address,
        url: HOME_RPC_URL
    })

    console.log('\n[Home] initializing Home Bridge with following parameters:\n')
    // homeBridgeImplementation.address = homeBridgeStorage.address

    await initializeBridge({
        validatorsBridge: storageValidatorsHome,
        bridge: homeBridgeImplementation,
        erc677token
    })

    console.log('[Home] transferring proxy ownership to multisig for Home bridge Proxy contract')
    await transferProxyOwnership({
        proxy: homeBridgeStorage,
        newOwner: HOME_UPGRADEABLE_ADMIN,
        url: HOME_RPC_URL
    })

    console.log('\n[Home] Home Deployment Bridge completed\n')
    // const khcWeb = getKhcWeb(url)
    const block = await khcWebHome.khc.getCurrentBlock()
    return {
        homeBridge: {
            address: homeBridgeStorage.address,
            deployedBlockNumber: block.block_header.raw_data.number
        },
        erc677: { address: erc677token.address }
    }
}
module.exports = deployHomeOnDpos
