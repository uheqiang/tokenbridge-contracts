const KhcExtension = require('khc-extension')
const env = require('./loadEnv')

const {
    HOME_RPC_URL,
    FOREIGN_RPC_URL,
    GET_RECEIPT_INTERVAL_IN_MILLISECONDS,
    DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
    KHC_DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
    HOME_EXPLORER_URL,
    FOREIGN_EXPLORER_URL,
    HOME_EXPLORER_API_KEY,
    FOREIGN_EXPLORER_API_KEY
} = env


// const tronWebHome = new TronWeb({
//     fullHost: HOME_RPC_URL,
//     // headers: { "TRON-PRO-API-KEY": 'wallet/deploycontract' },
//     privateKey: TRON_DEPLOYMENT_ACCOUNT_PRIVATE_KEY
// })

// const HttpProvider = KhcExtension.providers.HttpProvider;
// const fullNodeHome = new HttpProvider(HOME_RPC_URL);
// const khcWebHome = new KhcExtension({fullNodeHome, KHC_DEPLOYMENT_ACCOUNT_PRIVATE_KEY});

const khcWebHome = new KhcExtension({
    fullHost: HOME_RPC_URL,
    // headers: { "TRON-PRO-API-KEY": 'wallet/deploycontract' },
    privateKey: KHC_DEPLOYMENT_ACCOUNT_PRIVATE_KEY
})

// khcWebHome.khc.getContract('2eec56158582b38470dd85f9628402699fca4deb88').then(console.log)

// const fullNodeForeign = new HttpProvider(FOREIGN_RPC_URL);
// const khcWebForeign = new KhcExtension({fullNodeForeign, KHC_DEPLOYMENT_ACCOUNT_PRIVATE_KEY});

const khcWebForeign = new KhcExtension({
    fullHost: FOREIGN_RPC_URL,
    // headers: { "TRON-PRO-API-KEY": 'wallet/deploycontract' },
    privateKey: KHC_DEPLOYMENT_ACCOUNT_PRIVATE_KEY
})

// const tronWebForeign = new TronWeb({
//     fullHost: FOREIGN_RPC_URL,
//     privateKey: TRON_DEPLOYMENT_ACCOUNT_PRIVATE_KEY
// })

const deploymentPrivateKey = Buffer.from(DEPLOYMENT_ACCOUNT_PRIVATE_KEY, 'hex')

module.exports = {
    khcWebHome,
    khcWebForeign,
    deploymentPrivateKey,
    HOME_RPC_URL,
    FOREIGN_RPC_URL,
    GET_RECEIPT_INTERVAL_IN_MILLISECONDS,
    HOME_EXPLORER_URL,
    FOREIGN_EXPLORER_URL,
    HOME_EXPLORER_API_KEY,
    FOREIGN_EXPLORER_API_KEY
}
