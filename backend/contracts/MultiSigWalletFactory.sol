// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {MultiSigWallet} from "./MultiSigWallet.sol";

error InvalidIndex();
error SenderNotAnOwner();

contract MultiSigWalletFactory {
    event Create(address indexed wallet);

    mapping(address => MultiSigWallet[]) internal _ownerToMultiSigWallets;
    mapping(address => uint) public walletsCount;

    modifier validIndex(uint _index) {
        if (_index >= walletsCount[msg.sender]) {
            revert InvalidIndex();
        }

        _;
    }

    function create(address[] memory _owners, uint _required) external {
        MultiSigWallet multiSigWallet = new MultiSigWallet(_owners, _required);
        uint ownersLen = _owners.length;
        bool msgSenderIsAnOwner;

        for (uint i; i < ownersLen; ++i) {
            _ownerToMultiSigWallets[_owners[i]].push(multiSigWallet);
            walletsCount[_owners[i]] += 1;

            if(_owners[i] == msg.sender) {
              msgSenderIsAnOwner = true;
            }
        }

        if (!msgSenderIsAnOwner) {
          revert SenderNotAnOwner();
        }

        emit Create(address(multiSigWallet));
    }

    function getWallet(uint _index) external view validIndex(_index) returns (address) {
        MultiSigWallet[] storage multiSigWallets = _ownerToMultiSigWallets[msg.sender];
        return address(multiSigWallets[_index]);
    }
}
