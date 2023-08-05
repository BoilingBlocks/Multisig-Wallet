// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

error NoOwners();
error OwnersNotUnique();
error Unauthorized();
error InvalidRequiredOwners();
error InvalidAddressZeroOwner();
error InvalidTxId();
error AlreadyApproved();
error AlreadyNotApproved();
error AlreadyExecuted();
error NotEnoughApprovals();
error TxFailed();

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId);

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint approvedCount;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public required;

    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public approved;

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) {
            revert Unauthorized();
        }

        _;
    }

    modifier txExists(uint _txId) {
        if (_txId >= transactions.length) {
            revert InvalidTxId();
        }

        _;
    }

    modifier notApproved(uint _txId) {
        if (approved[_txId][msg.sender]) {
            revert AlreadyApproved();
        }

        _;
    }

    modifier isApproved(uint _txId) {
        if (!approved[_txId][msg.sender]) {
            revert AlreadyNotApproved();
        }

        _;
    }

    modifier notExecuted(uint _txId) {
        if (transactions[_txId].executed) {
            revert AlreadyExecuted();
        }

        _;
    }

    constructor(address[] memory _owners, uint _required) {
        uint ownersLen = _owners.length;

        if (ownersLen == 0) {
            revert NoOwners();
        }

        if (_required < 1 || _required > ownersLen) {
            revert InvalidRequiredOwners();
        }

        for (uint i; i < ownersLen; ++i) {
            address owner = _owners[i];

            if (owner == address(0)) {
                revert InvalidAddressZeroOwner();
            }

            if (isOwner[owner]) {
                revert OwnersNotUnique();
            }

            owners.push(owner);
            isOwner[owner] = true;
        }

        required = _required;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submit(address _to, uint _value, bytes calldata _data) external onlyOwner {
        transactions.push(Transaction({to: _to, value: _value, data: _data, executed: false, approvedCount: 0}));

        emit Submit(transactions.length - 1);
    }

    function approve(uint _txId) external onlyOwner txExists(_txId) notApproved(_txId) notExecuted(_txId) {
        approved[_txId][msg.sender] = true;
        transactions[_txId].approvedCount += 1;

        emit Approve(msg.sender, _txId);
    }

    function execute(uint _txId) external txExists(_txId) notExecuted(_txId) {
        Transaction storage transaction = transactions[_txId];

        if (transaction.approvedCount < required) {
            revert NotEnoughApprovals();
        }

        transaction.executed = true;
        (bool ok, ) = transaction.to.call{value: transaction.value}(transaction.data);

        if (!ok) {
            revert TxFailed();
        }

        emit Execute(_txId);
    }

    function revoke(uint _txId) external txExists(_txId) notExecuted(_txId) isApproved(_txId) {
        approved[_txId][msg.sender] = false;
        transactions[_txId].approvedCount -= 1;

        emit Revoke(msg.sender, _txId);
    }

    function transactionsCount() external view returns (uint) {
        return transactions.length;
    }

    function ownersCount() external view returns (uint) {
        return owners.length;
    }
}
