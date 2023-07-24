// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {MultiSigWallet} from "./MultiSigWallet.sol";

error InvalidIndex();

contract MultiSigWalletFactory {
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

        for (uint i; i < ownersLen; ++i) {
            _ownerToMultiSigWallets[_owners[i]].push(multiSigWallet);
            walletsCount[_owners[i]] += 1;
        }
    }

    function getWallet(uint _index) external view validIndex(_index) returns (address) {
        MultiSigWallet[] storage multiSigWallets = _ownerToMultiSigWallets[msg.sender];
        return address(multiSigWallets[_index]);
    }
}
