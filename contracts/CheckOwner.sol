pragma ton-solidity >= 0.39.0;



contract checkOwner {
    modifier checkOwnerAndAccept {
        require(msg.pubkey() == tvm.pubkey() || isInternalOwner(msg.sender), 102);
        tvm.accept();
        _;
    }

    modifier checkOwner {
        require(msg.pubkey() == tvm.pubkey(), 107);
        _;
    }

