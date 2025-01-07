// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


/**
 * @title CypherPupsTimelock
 * @notice Timelock contract for admin functions
 */
contract CypherPupsTimelock {

    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    event CancelTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    uint256 public constant GRACE_PERIOD = 14 days;
    uint256 public constant MINIMUM_DELAY = 2 days;
    uint256 public constant MAXIMUM_DELAY = 30 days;

    address public admin;
    uint256 public delay;

    mapping(bytes32 => bool) public queuedTransactions;

    constructor(address admin_, uint256 delay_) {
        require(delay_ >= MINIMUM_DELAY, "Delay must exceed minimum delay");
        require(delay_ <= MAXIMUM_DELAY, "Delay must not exceed maximum delay");
        require(admin_ != address(0), "Invalid admin address");

        admin = admin_;
        delay = delay_;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller must be admin");
        _;
    }

    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) public onlyAdmin returns (bytes32) {
        // Checks first
        require(eta >= getBlockTimestamp()+delay, "Must wait for delay");

        // Cache values
        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, eta)
        );

        // State changes
        queuedTransactions[txHash] = true;

        // Events last (no external calls in this function)
        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }

    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) public payable onlyAdmin returns (bytes memory) {
        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, eta)
        );
        require(queuedTransactions[txHash], "Transaction not queued");
        require(
            getBlockTimestamp() >= eta,
            "Transaction hasn't surpassed delay"
        );
        require(
            getBlockTimestamp() <= eta+GRACE_PERIOD,
            "Transaction is stale"
        );

        queuedTransactions[txHash] = false;
        bytes32 storedHash = txHash;

        bytes memory storedCallData;
        if (bytes(signature).length == 0) {
            storedCallData = data;
        } else {
            storedCallData = abi.encodePacked(
                bytes4(keccak256(bytes(signature))),
                data
            );
        }

        (bool success, bytes memory returnData) = target.call{value: value}(storedCallData);
        require(success, "Transaction execution reverted");
        
        emit ExecuteTransaction(storedHash, target, value, signature, data, eta);
        return returnData;
    }

    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) public onlyAdmin {
        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, eta)
        );
        queuedTransactions[txHash] = false;

        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
}
