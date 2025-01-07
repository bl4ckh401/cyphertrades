// contracts/mocks/MockUniswap.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV2Router {
    address public constant WETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        return (amountTokenDesired, msg.value, msg.value);
    }
}

contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        pair = address(new MockPair());
        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair;
        allPairs.push(pair);
        return pair;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}

contract MockPair {
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
}