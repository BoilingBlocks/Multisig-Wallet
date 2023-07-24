// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {MultiSigWalletFactory, InvalidIndex} from "../contracts/MultiSigWalletFactory.sol";

contract MultiSigWalletFactoryTest is Test {
    MultiSigWalletFactory public multiSigWalletFactory;

    function setUp() public {
        multiSigWalletFactory = new MultiSigWalletFactory();
    }

    function testCreate() public {
        uint amountOfOwners = 3;
        address[] memory owners = new address[](amountOfOwners);
        for (uint160 i; i < amountOfOwners; ++i) {
            owners[i] = address(i + 1);
        }
        uint requiredSignatures = 2;

        multiSigWalletFactory.create(owners, requiredSignatures);

        for (uint160 i = 1; i <= amountOfOwners; ++i) {
            vm.startPrank(address(i));
            assertNotEq(multiSigWalletFactory.getWallet(0), address(0));
            assertEq(multiSigWalletFactory.walletsCount(address(i)), 1);
            vm.stopPrank();
        }
    }

    function testGetWalletInvalidIndex() public {
        vm.expectRevert(InvalidIndex.selector);
        multiSigWalletFactory.getWallet(0);
    }
}
