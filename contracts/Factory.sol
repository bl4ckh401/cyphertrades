// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import {CypherPupsToken} from  "./CypherToken.sol";

/**
 * @title CypherPupsFactory
 * @notice Factory contract for deploying new CypherPups tokens
 */
contract CypherPupsFactory is AccessControl {
    error InvalidAddress();
    error EmptyString();
    using Address for address;

    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");

    event CypherPupsDeployed(
        address indexed tokenAddress,
        address indexed owner
    );

    address public immutable uniswapRouter;
    address public immutable uniswapFactory;

    mapping(address => bool) public isValidCypherPups;

    constructor(address _router, address _factory) {
        if (_router == address(0) || _factory == address(0)) revert InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPLOYER_ROLE, msg.sender);

        uniswapRouter = _router;
        uniswapFactory = _factory;
    }

    /**
     * @notice Deploy a new CypherPups token
     * @param admin Address of the token admin
     * @return Address of the deployed token
     */
    function createCypherPups(
        address admin,
        string calldata name,
        string calldata symbol
    ) external onlyRole(DEPLOYER_ROLE) returns (address) {
        if (admin == address(0)) revert InvalidAddress();
        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert EmptyString();


        CypherPupsToken token = new CypherPupsToken(
            uniswapRouter,
            uniswapFactory,
            admin
        );

        isValidCypherPups[address(token)] = true;
        emit CypherPupsDeployed(address(token), admin);

        return address(token);
    }

    /**
     * @notice Check if an address is a valid CypherPups token
     * @param tokenAddress Address to check
     * @return bool indicating if the address is a valid CypherPups token
     */
    function isValidCypherPupsToken(address tokenAddress)
        external
        view
        returns (bool)
    {
        return isValidCypherPups[tokenAddress];
    }
}