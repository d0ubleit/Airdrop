pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "Interfaces/IAirDrop.sol";
import "Interfaces/IRootTokenContract.sol";
import "Interfaces/ITONTokenWallet.sol";
import "Libraries/MsgFlag.sol";
import "ACheckOwner.sol";

// This is class that describes you smart contract.
contract ClientAirDrop is ACheckOwner {

    address token;
    address token_wallet;
    address AirDropAddress;

    // example value
    uint128 constant deploy_wallet_grams = 0.2 ton;
    uint128 constant transfer_grams = 0.5 ton;


    constructor(address _token, address _AirDropAddress) public {

        require(tvm.pubkey() != 0, 101);
        require(msg.pubkey() == tvm.pubkey(), 102);
        tvm.accept();

        token = _token;
        AirDropAddress = _AirDropAddress;
        setUpTokenWallet();
    }

    function setUpTokenWallet() internal view {
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
            callback: ClientAirDrop.setTokenWalletAddress
        }(0, address(this));
    }
    
    
    function setTokenWalletAddress(address wallet) external {
        require(msg.sender == token, 103);
        token_wallet = wallet;
    }

    function transferTokensForAirDrop (uint128 amount) public view checkOwnerAndAccept {

        // Transfer tokens
        TvmCell empty;
        ITONTokenWallet(token_wallet).transfer{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(
            AirDropAddress,
            amount,
            transfer_grams,
            token_wallet,
            true,
            empty
        );
    }

    /*function sendTokensAndArraysToAirDrop (address AirDropAddress, uint256 valueOfTokens, address [] arrayRecieversAddr, uint [] arrayValues) public view checkOwnerAndAccept {
        address clientAddress = address(this);
        uint256 value = valueOfTokens;   
        InterfaseAirDrop(AirDropAddress).checkAirDrop(clientAddress, value, arrayRecieversAddr,  arrayValues);
    } */

   

    function doAirDrop(address[] arrayAddresses, uint256[] arrayValues) public view checkOwnerAndAccept {
        IAirDrop(AirDropAddress).AirDrop(token_wallet, arrayAddresses, arrayValues);
    }


    function getDetails() external view returns(
        address _token,
        address _token_wallet
    ) {
        return (
            token,
            token_wallet
        );
    }


}