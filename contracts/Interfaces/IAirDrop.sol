
pragma ton-solidity >= 0.35.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

interface IAirDrop {

    function AirDrop(
        address clientWalletAddress, 
        address[] arrayAddresses,
        uint256[] arrayValues
    ) external;

    function getTokensBack(
        address clientWalletAddress,
        uint128 amount
        ) external;
    
}