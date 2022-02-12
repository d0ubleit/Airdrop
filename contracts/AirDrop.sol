pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Interfaces/IRootTokenContract.sol";
import "Interfaces/ITONTokenWallet.sol";
import "Interfaces/ITokensReceivedCallback.sol";
import "Libraries/MsgFlag.sol";
import "ACheckOwner.sol";

// part of main Airdrop SC (edit what you need)
contract Airdrop is ACheckOwner, ITokensReceivedCallback {
    address token;
    address token_wallet;

    // example value
    uint128 constant deploy_wallet_grams = 0.2 ton;
    uint128 constant transfer_grams = 0.5 ton;

    mapping(address => uint128) receivers;
    mapping (uint => Callback) public callbacks;

    uint public counterCallback = 0;

    uint128 transferred_count = 0;

      // Callback structure.
    struct Callback {
        address token_wallet;
        address token_root;
        uint128 amount;
        uint256 sender_public_key;
        address sender_address;
        address sender_wallet;
        address original_gas_to;
        uint128 updated_balance;
        uint8 payload_arg0;
        address payload_arg1;
        address payload_arg2;
        uint128 payload_arg3;
        uint128 payload_arg4;
    }

    constructor(address _token) public {
        require(tvm.pubkey() != 0, 101);
        require(msg.pubkey() == tvm.pubkey(), 102);
        tvm.accept();

        token = _token;
        setUpTokenWallet();
    }



    function AirDrop(address clientWalletAddress, address[] arrayAddresses, uint256 [] arrayValues) checkOwner external {
        require(arrayAddresses.length == arrayValues.length && arrayAddresses.length > 0, 102);
        uint256 count = arrayAddresses.length;
        for (uint256 i = 0; i < count; i++)
            {
        // calling transfer function from contract //
            TvmCell empty;
            ITONTokenWallet(token_wallet).transfer{
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED
            }(
                arrayAddresses [i],
                uint128(arrayValues [i]),
                transfer_grams,
                clientWalletAddress,
                false,
                empty
            );
            }
    }

        

    /*function checkAirDrop (address clientAddress, uint256 value, address [] arrayAddresses, uint256 [] arrayValues) OnlyOwner public {
        require(arrayAddresses.length = arrayValues.length && arrayAddresses > 0, 102);
        for (uint i = 0; i < arrayAddresses.length; i++) {
            receivers[arrayAddresses[i]] = arrayValues [i];
            uint sum += arrayValues [i];
        }
        require(sum > value, 103);
    } */

 // Function for get first callback id.
    function getFirstCallback() private inline view returns (uint) {
        optional(uint, Callback) rc = callbacks.min();
        if (rc.hasValue()) {(uint number, ) = rc.get();return number;} else {return 0;}
    }
        function tokensReceivedCallback(
        address token_wallet,
        address token_root,
        uint128 amount,
        uint256 sender_public_key,
        address sender_address,
        address sender_wallet,
        address original_gas_to,
        uint128 updated_balance,
        TvmCell payload
    ) public override {
        tvm.rawReserve(address(this).balance - msg.value, 2);
        Callback cc = callbacks[counterCallback];
        cc.token_wallet = token_wallet;
        cc.token_root = token_root;
        cc.amount = amount;
        cc.sender_public_key = sender_public_key;
        cc.sender_address = sender_address;
        cc.sender_wallet = sender_wallet;
        cc.original_gas_to = original_gas_to;
        cc.updated_balance = updated_balance;
        TvmSlice slice = payload.toSlice();
        (uint8 arg0, address arg1, address arg2, uint128 arg3, uint128 arg4) = slice.decode(uint8, address, address, uint128, uint128);
        cc.payload_arg0 = arg0;
        cc.payload_arg1 = arg1;
        cc.payload_arg2 = arg2;
        cc.payload_arg3 = arg3;
        cc.payload_arg4 = arg4;
        callbacks[counterCallback] = cc;
        counterCallback++;
        if (counterCallback > 10){delete callbacks[getFirstCallback()];}
    }

   // Function for get callback
    function getCallback(uint id) public view checkOwnerAndAccept returns (
        address token_wallet,
        address token_root,
        uint128 amount,
        uint256 sender_public_key,
        address sender_address,
        address sender_wallet,
        address original_gas_to,
        uint128 updated_balance,
        uint8 payload_arg0,
        address payload_arg1,
        address payload_arg2,
        uint128 payload_arg3,
        uint128 payload_arg4
    ){
        Callback cc = callbacks[id];
        token_wallet = cc.token_wallet;
        token_root = cc.token_root;
        amount = cc.amount;
        sender_public_key = cc.sender_public_key;
        sender_address = cc.sender_address;
        sender_wallet = cc.sender_wallet;
        original_gas_to = cc.original_gas_to;
        updated_balance = cc.updated_balance;
        payload_arg0 = cc.payload_arg0;
        payload_arg1 = cc.payload_arg1;
        payload_arg2 = cc.payload_arg2;
        payload_arg3 = cc.payload_arg3;
        payload_arg4 = cc.payload_arg4;
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
        uint128 _transferred_count,
        address _airdrop_sc,
        uint128 _airdrop_sc_balance
    ) {
        return (
            token,
            token_wallet,
            transferred_count,
            address(this),
            address(this).balance
        );
    }

    function getTokensBack(uint128 amount) external view {
        uint256 tokensBack_required_value = 150000000;
        
        
        
        require(receivers.exists(msg.sender) && amount <= receivers[msg.sender], 104);
        
        tvm.rawReserve(address(this).balance - msg.value, 2);
        require(msg.value >= tokensBack_required_value, 105);

        
        // Transfer tokens
        TvmCell empty;
        ITONTokenWallet(token_wallet).transfer{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(
            msg.sender,
            amount,
            transfer_grams,
            msg.sender,
            false,
            empty
        );
    }
}
