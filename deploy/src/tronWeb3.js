const TronWeb = require('tronweb')
const env = require('./loadEnv')

const {
    HOME_RPC_URL,
    FOREIGN_RPC_URL,
    GET_RECEIPT_INTERVAL_IN_MILLISECONDS,
    DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
    HOME_EXPLORER_URL,
    FOREIGN_EXPLORER_URL,
    HOME_EXPLORER_API_KEY,
    FOREIGN_EXPLORER_API_KEY
} = env


const tronWebHome = new TronWeb({
    fullHost: HOME_RPC_URL,
    privateKey: DEPLOYMENT_ACCOUNT_PRIVATE_KEY
})

const tronWebForeign = new TronWeb({
    fullHost: FOREIGN_RPC_URL,
    privateKey: DEPLOYMENT_ACCOUNT_PRIVATE_KEY
})

const deploymentPrivateKey = Buffer.from(DEPLOYMENT_ACCOUNT_PRIVATE_KEY, 'hex')

module.exports = {
    tronWebHome,
    tronWebForeign,
    deploymentPrivateKey,
    HOME_RPC_URL,
    FOREIGN_RPC_URL,
    GET_RECEIPT_INTERVAL_IN_MILLISECONDS,
    HOME_EXPLORER_URL,
    FOREIGN_EXPLORER_URL,
    HOME_EXPLORER_API_KEY,
    FOREIGN_EXPLORER_API_KEY
}
