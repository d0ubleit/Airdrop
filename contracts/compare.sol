pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "Interfaces/IRootTokenContract.sol";
import "Interfaces/ITONTokenWallet.sol";
import "Libraries/MsgFlag.sol";

// part of main Airdrop SC (edit what you need)
contract Airdrop {
    address token;
    address token_wallet;

    // example value
    uint128 constant tokensBack_required_value = 2 ton;
    uint128 constant deploy_wallet_grams = 0.2 ton;
    uint128 constant transfer_grams = 0.5 ton;
    

    mapping(address => uint128) public receivers;

    uint128 transferred_count = 0;

    constructor(address _token) public {
        require(tvm.pubkey() != 0, 101);
        require(msg.pubkey() == tvm.pubkey(), 102);
        tvm.accept();

        token = _token;
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