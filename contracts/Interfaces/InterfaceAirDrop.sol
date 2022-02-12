
pragma ton-solidity >= 0.35.0;
pragma AbiHeader expire;

// This is class that describes you smart contract.
interface InterfaseAirDrop {
    function checkAirDrop (address clientAddress, uint256 value, address [] arrayAddresses, uint256 [] arrayValues) external; 

    function AirDrop(address clientAddress, address[] arrayAddresses, uint256 [] arrayValues) public returns (bool);
    
}