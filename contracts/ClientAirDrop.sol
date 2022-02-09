
ragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "Interfaces/InterfaceAirDrop.sol";
import "Interfaces/ITONTokenWallet.sol";
import "Libraries/MsgFlag.sol";
import "CheckOwner.sol";

// This is class that describes you smart contract.
contract ClientAirDrop is CheckOwner {

    address token_wallet;
    address AirDropAddress;

    uint128 constant transfer_grams = 0.5 ton;


    constructor() public {

        require(tvm.pubkey() != 0, 101);
        require(msg.pubkey() == tvm.pubkey(), 102);
        tvm.accept();

    }
     
    function transferTokensForAirDrop (address clientWallet, uint256 amount) public pure checkOwnerAndAccept {

        // Transfer tokens
        TvmCell empty;
        ITONTokenWallet(clientWallet).transfer{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(
            AirDropAddress,
            amount,
            transfer_grams,
            msg.sender,
            false,
            empty
        );
    }

    /*function sendTokensAndArraysToAirDrop (address AirDropAddress, uint256 valueOfTokens, address [] arrayRecieversAddr, uint [] arrayValues) public view checkOwnerAndAccept {
        address clientAddress = address(this);
        uint256 value = valueOfTokens;   
        InterfaseAirDrop(AirDropAddress).checkAirDrop(clientAddress, value, arrayRecieversAddr,  arrayValues);
    } */

   

    function doAirDrop  (address AirDropAddress,  address [] arrayAddresses, uint256 [] arrayValues) {
        address clientAddress = address(this);
        InterfaseAirDrop(AirDropAddress).AirDrop (clientAddress, arrayAddresses, arrayValues);
    }

}