// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/**
 * @title CypherPupsToken
 * @notice Implementation of a bonding curve token with Uniswap migration capability
 * @dev Implements secure token mechanics with bonding curve pricing and migration to Uniswap
 */
contract CypherPupsToken is ERC20, ReentrancyGuard, Pausable, AccessControl {
    using Math for uint256;
    using Address for address;

    error NotMigrated();
    error AlreadyMigrated();
    error InvalidAmount();
    error ExceedsPriceImpact();
    error InsufficientBalance();
    error NotAuthorized();
    error InvalidAddress();
    error ExceededRateLimit();
    error ExceedsTotalSupply();
    error NoPendingPayments();
    error MigrationThreshHoldNotMet();
    error TransferFailed();

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Events
    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    event TokensSold(
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    event MigrationExecuted(
        uint256 ethAmount,
        uint256 tokenAmount,
        address uniswapPair
    );
    event VirtualReservesUpdated(
        uint256 virtualTokenReserve,
        uint256 virtualEthReserve
    );
    event EmergencyWithdraw(address indexed caller, uint256 ethAmount);
    event WithdrawalQueued(address indexed payee, uint256 amount);
    event Withdrawn(address indexed payee, uint256 amount);

    // Constants
    uint256 public constant TOTAL_SUPPLY = 1000000000 * 1e18; // 1B tokens
    uint256 public constant INITIAL_VIRTUAL_TOKEN_RESERVE = 1000000000 * 10**18; // 1B tokens
    uint256 public constant INITIAL_VIRTUAL_ETH_RESERVE = 2e18; // 1.6 ETH
    uint256 public constant MIGRATION_THRESHOLD = 799_538_871 * 1e18; // 79.95% of total supply
    uint256 public constant MIGRATION_FEE = 0.015 ether; // Fee for migration
    uint256 public constant MIN_PURCHASE = 0.01 ether; // Minimum purchase amount
    uint256 public constant MAX_PURCHASE = 50 ether; // Maximum purchase amount
    uint256 public constant PRICE_IMPACT_LIMIT = 10; // 10% max price impact

    mapping(address => uint256) private _pendingWithdrawals;

    // State variables
    uint256 public virtualTokenReserve;
    uint256 public virtualEthReserve;
    uint256 public totalCollectedETH;

    bool public migrated;
    bool public emergencyMode;

    uint256 public lastActionTimestamp;
    uint256 public constant RATE_LIMIT_INTERVAL = 1 minutes;
    uint256 public constant MAX_ACTIONS_IN_INTERVAL = 3;
    mapping(address => uint256) public actionCounter;
    mapping(address => uint256) public lastActionTime;

    // Uniswap integration
    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Factory public immutable uniswapFactory;
    address public uniswapPair;

    /**
     * @notice Contract constructor
     * @param _router Address of Uniswap V2 Router
     * @param _factory Address of Uniswap V2 Factory
     * @param _admin Address of the admin
     */
    constructor(
        address _router,
        address _factory,
        address _admin,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        if (_router == address(0)) revert InvalidAddress();
        if (_factory == address(0)) revert InvalidAddress();
        if (_admin == address(0)) revert InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        

        virtualTokenReserve = INITIAL_VIRTUAL_TOKEN_RESERVE;
        virtualEthReserve = INITIAL_VIRTUAL_ETH_RESERVE;

        uniswapRouter = IUniswapV2Router02(_router);
        uniswapFactory = IUniswapV2Factory(_factory);

        lastActionTimestamp = block.timestamp;
    }

    // Modifiers
    modifier whenNotMigrated() {
        if (migrated) revert AlreadyMigrated();
        _;
    }

    modifier withinPriceImpact(uint256 priceImpact) {
        if (priceImpact > PRICE_IMPACT_LIMIT) revert ExceedsPriceImpact();
        _;
    }

    modifier rateLimit(address user) {
        if (
            block.timestamp - lastActionTime[user] < RATE_LIMIT_INTERVAL &&
            actionCounter[user] >= MAX_ACTIONS_IN_INTERVAL
        ) revert ExceededRateLimit();

        if (block.timestamp - lastActionTime[user] >= RATE_LIMIT_INTERVAL) {
            actionCounter[user] = 1;
        } else {
            actionCounter[user] += 1;
        }

        lastActionTime[user] = block.timestamp;
        _;
    }

    function buy()
        external
        payable
        nonReentrant
        whenNotPaused
        whenNotMigrated
        rateLimit(msg.sender)
        withinPriceImpact(
            calculatePriceImpact(msg.value, virtualEthReserve)
        )
    {
        if (msg.value < MIN_PURCHASE) revert InvalidAmount();
        if (msg.value > MAX_PURCHASE) revert InvalidAmount();

        uint256 tokenAmount = calculatePurchaseReturn(msg.value);
        if (tokenAmount == 0) revert InvalidAmount();
        if (totalSupply() + tokenAmount > TOTAL_SUPPLY)
            revert ExceedsTotalSupply();

        // uint256 priceImpact = calculatePriceImpact(
        //     msg.value,
        //     virtualEthReserve
        // );
        // if (priceImpact > PRICE_IMPACT_LIMIT) revert ExceedsPriceImpact();

        virtualEthReserve += msg.value;
        virtualTokenReserve -= tokenAmount;
        totalCollectedETH += msg.value;

        bool shouldMigrate = totalSupply() + tokenAmount >= MIGRATION_THRESHOLD;

        _mint(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
        emit VirtualReservesUpdated(virtualTokenReserve, virtualEthReserve);

        if (shouldMigrate) {
            migrateToUniswap();
        }
    }

    function sell(
        uint256 tokenAmount
    )
        external
        nonReentrant
        whenNotPaused
        whenNotMigrated
        rateLimit(msg.sender)
    {
        if (tokenAmount == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < tokenAmount) revert InsufficientBalance();

        uint256 ethAmount = calculateSaleReturn(tokenAmount);
        if (ethAmount == 0) revert InvalidAmount();

        if (address(this).balance < ethAmount) revert InsufficientBalance();

        _burn(msg.sender, tokenAmount);

        virtualTokenReserve += tokenAmount;
        virtualEthReserve -= ethAmount;
        totalCollectedETH -= ethAmount;

        _queueWithdrawal(msg.sender, ethAmount);

        emit TokensSold(msg.sender, tokenAmount, ethAmount);
        emit VirtualReservesUpdated(virtualTokenReserve, virtualEthReserve);
    }

    function _queueWithdrawal(address payee, uint256 amount) private {
        if (payee == address(0)) revert InvalidAddress();
        _pendingWithdrawals[payee] += amount;
        emit WithdrawalQueued(payee, amount);
    }

    function pendingWithdrawals(address payee) external view returns (uint256) {
        return _pendingWithdrawals[payee];
    }

    function withdrawPendingPayments() external nonReentrant {
        uint256 amount = _pendingWithdrawals[msg.sender];
        if (amount == 0) revert NoPendingPayments();
        if (address(this).balance < amount) revert InsufficientBalance();

        _pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    function calculatePriceImpact(
        uint256 tradeSize,
        uint256 currentReserve
    ) public pure returns (uint256) {
        return ( tradeSize * 100  ) / currentReserve;
    }


    function calculatePurchaseReturn(
        uint256 ethAmount
    ) public view returns (uint256) {
        uint256 k = virtualTokenReserve * virtualEthReserve;
        uint256 newVirtualEthReserve = virtualEthReserve + ethAmount;
        uint256 newVirtualTokenReserve = k / newVirtualEthReserve;
        return virtualTokenReserve - newVirtualTokenReserve;
    }

    function calculateSaleReturn(
        uint256 tokenAmount
    ) public view returns (uint256) {
        uint256 k = virtualTokenReserve * virtualEthReserve;
        uint256 newVirtualTokenReserve = virtualTokenReserve +
            (tokenAmount * 5) /
            100;
        uint256 newVirtualEthReserve = k / newVirtualTokenReserve;
        return virtualEthReserve - newVirtualEthReserve;
    }

    function migrateToUniswap() internal {
        if (migrated) revert AlreadyMigrated();
        if (totalSupply() < MIGRATION_THRESHOLD)
            revert MigrationThreshHoldNotMet();
        if (virtualTokenReserve == 0) revert InvalidAmount();

        migrated = true;

        uint256 ethForPool = address(this).balance - MIGRATION_FEE;

        uint256 SCALE = 1e18;
        uint256 currentPrice = (virtualEthReserve * SCALE) /
            virtualTokenReserve;
        if (currentPrice == 0) revert InvalidAmount();

        uint256 tokensToMigrate = (ethForPool * SCALE) / currentPrice;
        if (tokensToMigrate == 0) revert InvalidAmount();

        uint256 tokensToBurn = TOTAL_SUPPLY - totalSupply() - tokensToMigrate;

        _mint(address(this), tokensToMigrate);
        _burn(address(this), tokensToBurn);

        _approve(address(this), address(uniswapRouter), tokensToMigrate);

        uint256 preCallTokenBalance = balanceOf(address(this));

        try
            uniswapRouter.addLiquidityETH{value: ethForPool}(
                address(this),
                tokensToMigrate,
                tokensToMigrate,
                ethForPool,
                msg.sender,
                block.timestamp
            )
        returns (uint256 tokenAmount, uint256 ethAmount, uint256 liquidity) {
            if (balanceOf(address(this)) > preCallTokenBalance)
                revert TransferFailed();

            address pair = uniswapFactory.getPair(
                address(this),
                uniswapRouter.WETH()
            );
            uniswapPair = pair;
            emit MigrationExecuted(ethAmount, tokenAmount, pair);
        } catch {
            revert("Migration failed");
        }
    }

    function emergencyWithdraw() external nonReentrant onlyRole(ADMIN_ROLE) {
        if (!emergencyMode) revert NotAuthorized();

        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidAmount();

        uint256 amountToWithdraw = balance;
        totalCollectedETH -= amountToWithdraw;

        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        if (!success) revert TransferFailed();

        emit EmergencyWithdraw(msg.sender, amountToWithdraw);
    }

    function setEmergencyMode(
        bool _emergencyMode
    ) external onlyRole(ADMIN_ROLE) {
        emergencyMode = _emergencyMode;
        if (_emergencyMode) {
            _pause();
        } else {
            _unpause();
        }
    }

    function withdrawFees() external nonReentrant onlyRole(ADMIN_ROLE) {
        if (!migrated) revert NotMigrated();
        if (address(this).balance < MIGRATION_FEE) revert InsufficientBalance();

        (bool success, ) = msg.sender.call{value: MIGRATION_FEE}("");
        if (!success) revert TransferFailed();
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._update(from, to, amount);
    }

    receive() external payable {
        if (msg.sender != address(uniswapRouter)) revert NotAuthorized();
    }
}
