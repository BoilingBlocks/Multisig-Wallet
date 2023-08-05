// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {MultiSigWallet, NoOwners, OwnersNotUnique, Unauthorized, InvalidRequiredOwners, InvalidAddressZeroOwner, InvalidTxId, AlreadyApproved, AlreadyNotApproved, AlreadyExecuted, NotEnoughApprovals, TxFailed} from "../contracts/MultiSigWallet.sol";

contract MultiSigWalletTest is Test {
    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId);

    MultiSigWallet public multiSigWallet;

    function setUp() public {
        multiSigWallet = MultiSigWallet(payable(address(0)));
    }

    function testRequired() public {
        uint requiredSigs = 2;

        _createMultiSigWallet(3, requiredSigs);

        assertEq(multiSigWallet.required(), requiredSigs);
    }

    function testIsOwner() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);

        for (uint160 i; i < amountOfOwners; ++i) {
            assertTrue(multiSigWallet.isOwner(address(i + 1)));
        }
    }

    function testOwnersArr() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);

        for (uint160 i; i < amountOfOwners; ++i) {
            assertEq(multiSigWallet.owners(i), address(i + 1));
        }
    }

    function testZeroOwnersIsInvalid() public {
        uint amountOfOwners = 0;

        vm.expectRevert(NoOwners.selector);
        _createMultiSigWallet(amountOfOwners, 2);
    }

    function testInvalidRequiredSignatures() public {
        uint amountOfOwners = 3;
        uint zeroRequired = 0;

        vm.expectRevert(InvalidRequiredOwners.selector);
        _createMultiSigWallet(amountOfOwners, zeroRequired);

        vm.expectRevert(InvalidRequiredOwners.selector);
        _createMultiSigWallet(amountOfOwners, amountOfOwners + 1);
    }

    function testNotUniqueOwners() public {
        uint amountOfOwners = 3;
        address[] memory owners = new address[](amountOfOwners);
        for (uint160 i; i < amountOfOwners; ++i) {
            owners[i] = address(1);
        }

        vm.expectRevert(OwnersNotUnique.selector);
        _createMultiSigWallet(owners, 2);
    }

    function testTransactionsInitEmpty() public {
        uint amountOfOwners = 3;

        _createMultiSigWallet(amountOfOwners, 2);

        vm.expectRevert();
        multiSigWallet.transactions(0);
    }

    function testDepositEmitsEvent() public {
        address sender = address(this);
        uint sendAmount = 1 ether;
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);

        vm.expectEmit(true, true, false, true);
        emit Deposit(sender, sendAmount);
        (bool ok, ) = address(multiSigWallet).call{value: sendAmount}("");

        assert(ok);
    }

    function testSubmitEmitsEvent() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        uint txId = 0;
        address owner = address(1);

        vm.expectEmit(true, false, false, true);
        emit Submit(txId);
        vm.prank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
    }

    function testSubmitFailsIfNotOwner() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);

        vm.expectRevert(Unauthorized.selector);
        multiSigWallet.submit(address(4), 1 ether, "");
    }

    function testSubmitSuccessPushesTransactionToArray() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address to = address(4);
        uint value = 1 ether;
        bytes memory data = "";

        vm.prank(address(1));
        multiSigWallet.submit(to, value, data);
        (address _to, uint _value, bytes memory _data, bool executed, uint approvedCount) = multiSigWallet.transactions(
            0
        );

        assertEq(to, _to);
        assertEq(value, _value);
        assertEq(data, _data);
        assertFalse(executed);
        assertEq(approvedCount, 0);
    }

    function testApproveSuccessEmitsApproveEvent() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address owner = address(1);

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        uint txId = 0;

        vm.expectEmit(true, true, false, true);
        emit Approve(owner, txId);
        multiSigWallet.approve(txId);
        vm.stopPrank();
    }

    function testApproveSuccessUpdatesApprovedMapping() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        assertFalse(multiSigWallet.approved(txId, owner));

        multiSigWallet.approve(txId);
        assertTrue(multiSigWallet.approved(txId, owner));
        vm.stopPrank();
    }

    function testApproveSuccessUpdatesApprovedCount() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        (, , , , uint approvedCount) = multiSigWallet.transactions(txId);
        assertEq(approvedCount, 0);

        multiSigWallet.approve(txId);
        (, , , , uint approvedCount2) = multiSigWallet.transactions(txId);
        assertEq(approvedCount2, 1);
    }

    function testApproveFailsIfNotOwner() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address owner = address(1);
        uint txId = 0;

        vm.prank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");

        vm.expectRevert(Unauthorized.selector);
        multiSigWallet.approve(txId);
    }

    function testApproveFailsIfInvalidTxId() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address owner = address(1);
        uint invalidTxId = 0;

        vm.startPrank(owner);
        vm.expectRevert(InvalidTxId.selector);
        multiSigWallet.approve(invalidTxId);
        vm.stopPrank();
    }

    function testApproveFailsIfAlreadyApproved() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 2);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);

        vm.expectRevert(AlreadyApproved.selector);
        multiSigWallet.approve(txId);
        vm.stopPrank();
    }

    function testApproveFailsIfAlreadyExecuted() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner1 = address(1);
        address owner2 = address(2);
        uint txId = 0;

        vm.deal(address(multiSigWallet), 100 ether);
        vm.startPrank(owner1);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);
        multiSigWallet.execute(txId);
        vm.stopPrank();

        vm.prank(owner2);
        vm.expectRevert(AlreadyExecuted.selector);
        multiSigWallet.approve(txId);
    }

    function testExecuteSuccessEmitsExecuteEvent() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint txId = 0;

        vm.deal(address(multiSigWallet), 100 ether);
        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);

        vm.expectEmit(true, false, false, true);
        emit Execute(txId);
        multiSigWallet.execute(txId);
        vm.stopPrank();
    }

    function testExecuteFailsIfNotEnoughApprovals() public {
        uint amountOfOwners = 3;
        uint requiredSigs = 1;
        _createMultiSigWallet(amountOfOwners, requiredSigs);
        address owner = address(1);
        uint txId = 0;

        vm.deal(address(multiSigWallet), 100 ether);
        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");

        vm.expectRevert(NotEnoughApprovals.selector);
        multiSigWallet.execute(txId);
        vm.stopPrank();
    }

    function testExecuteThrowsTxFailedErrorIfTransferFails() public {
        uint amountOfOwners = 3;
        uint requiredSigs = 1;
        _createMultiSigWallet(amountOfOwners, requiredSigs);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);

        vm.expectRevert(TxFailed.selector); // not enough ETH in multi-sig wallet
        multiSigWallet.execute(txId);
        vm.stopPrank();
    }

    function testExecuteSuccessUpdatesBalances() public {
        uint amountOfOwners = 3;
        uint requiredSigs = 1;
        _createMultiSigWallet(amountOfOwners, requiredSigs);
        address owner = address(1);
        address recipient = address(4);
        uint txId = 0;
        uint sendAmount = 1 ether;
        uint walletStartingBalance = 100 ether;
        assertEq(recipient.balance, 0);

        vm.deal(address(multiSigWallet), walletStartingBalance);
        vm.startPrank(owner);
        multiSigWallet.submit(recipient, sendAmount, "");
        multiSigWallet.approve(txId);
        multiSigWallet.execute(txId);

        assertEq(recipient.balance, sendAmount);
        assertEq(address(multiSigWallet).balance, walletStartingBalance - sendAmount);
        vm.stopPrank();
    }

    function testExecuteFailsIfInvalidTxId() public {
        uint amountOfOwners = 3;
        uint requiredSigs = 1;
        _createMultiSigWallet(amountOfOwners, requiredSigs);
        address owner = address(1);
        uint invalidTxId = 0;

        vm.prank(owner);
        vm.expectRevert(InvalidTxId.selector);
        multiSigWallet.execute(invalidTxId);
    }

    function testExecuteFailsIfAlreadyExecuted() public {
        uint amountOfOwners = 3;
        uint requiredSigs = 1;
        _createMultiSigWallet(amountOfOwners, requiredSigs);
        address owner = address(1);
        uint txId = 0;

        vm.deal(address(multiSigWallet), 100 ether);
        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);
        multiSigWallet.execute(txId);

        vm.expectRevert(AlreadyExecuted.selector);
        multiSigWallet.execute(txId);
        vm.stopPrank();
    }

    function testRevokeSuccessEmitsRevokeEvent() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);

        vm.expectEmit(true, true, false, true);
        emit Revoke(owner, txId);
        multiSigWallet.revoke(txId);
        vm.stopPrank();
    }

    function testRevokeSuccessUpdatesApprovedMapping() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);
        assertTrue(multiSigWallet.approved(txId, owner));

        multiSigWallet.revoke(txId);
        assertFalse(multiSigWallet.approved(txId, owner));
        vm.stopPrank();
    }

    function testRevokeSuccessUpdatesApprovedCountMapping() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);
        (, , , , uint approvedCount) = multiSigWallet.transactions(txId);
        assertEq(approvedCount, 1);

        multiSigWallet.revoke(txId);
        (, , , , uint approvedCount2) = multiSigWallet.transactions(txId);
        assertEq(approvedCount2, 0);
        vm.stopPrank();
    }

    function testRevokeFailsIfInvalidTxId() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint invalidTxId = 0;

        vm.prank(owner);
        vm.expectRevert(InvalidTxId.selector);
        multiSigWallet.revoke(invalidTxId);
    }

    function testRevokeFailsIfTxAlreadyExecuted() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint txId = 0;

        vm.deal(address(multiSigWallet), 100 ether);
        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");
        multiSigWallet.approve(txId);
        multiSigWallet.execute(txId);

        vm.expectRevert(AlreadyExecuted.selector);
        multiSigWallet.revoke(txId);
        vm.stopPrank();
    }

    function testRevokeFailsIfNotCurrentlyApproved() public {
        uint amountOfOwners = 3;
        _createMultiSigWallet(amountOfOwners, 1);
        address owner = address(1);
        uint txId = 0;

        vm.startPrank(owner);
        multiSigWallet.submit(address(4), 1 ether, "");

        vm.expectRevert(AlreadyNotApproved.selector);
        multiSigWallet.revoke(txId);
        vm.stopPrank();
    }

    function _createMultiSigWallet(uint _amountOfOwners, uint _requiredSignatures) internal {
        address[] memory owners = new address[](_amountOfOwners);
        for (uint160 i; i < _amountOfOwners; ++i) {
            owners[i] = address(i + 1);
        }
        multiSigWallet = new MultiSigWallet(owners, _requiredSignatures);
    }

    function _createMultiSigWallet(address[] memory _owners, uint _requiredSignatures) internal {
        multiSigWallet = new MultiSigWallet(_owners, _requiredSignatures);
    }

    receive() external payable {}
}
