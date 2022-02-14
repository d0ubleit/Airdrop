pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Interfaces/IRootTokenContract.sol";
import "Interfaces/ITONTokenWallet.sol";
import "Interfaces/ITokensReceivedCallback.sol";
import "Libraries/MsgFlag.sol";
import "ACheckOwner.sol";


/////////////////NOT WORKING/////WAS NOT TESTED///////////

contract SimpleFactory is ACheckOwner, ITokensReceivedCallback {
    address token;
    address token_wallet;

    // example value
    uint128 constant deploy_wallet_grams = 0.2 ton;
    uint128 constant transfer_grams = 0.5 ton;

   
    constructor(address _token) public {
        require(tvm.pubkey() != 0, 101);
        require(msg.pubkey() == tvm.pubkey(), 102);
        tvm.accept();

        token = _token;
    }


    function setUpTokenWallet() public view {
        // Deploy token wallet
        IRootTokenContract(token).deployEmptyWallet{value: 1 ton}(
            deploy_wallet_grams,
            0,
            address(this),
            address(this)
        );

        // Request for token wallet address
        IRootTokenContract(token).getWalletAddress{
            value: 1 ton,
            callback: Airdrop.setTokenWalletAddress
        }(0, address(this));
    }
    

    function setTokenWalletAddress(address wallet) external {
        require(msg.sender == token, 103);
        token_wallet = wallet;
    }


    // add every info we need here
    function getDetails() external view returns(
        address _token,
        address _token_wallet,
        uint128 _wallets_count,
    ) {
        return (
            token,
            token_wallet,
            wallets_count,
        );
    }

    
}
