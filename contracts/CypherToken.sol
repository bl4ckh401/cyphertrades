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
    uint256 public constant TOTAL_SUPPLY = 50_000_000_000 * 1e18; // 50B tokens with 18 decimals
    uint256 public constant INITIAL_VIRTUAL_TOKEN_RESERVE = 1.06e27; // 1.06 * 10^27
    uint256 public constant INITIAL_VIRTUAL_ETH_RESERVE = 1.6e18; // 1.6 ETH
    uint256 public constant MIGRATION_THRESHOLD = 799_538_871 * 1e18; // ~80% of total supply
    uint256 public constant MIGRATION_FEE = 0.15 ether; // Fee for migration
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
        address _admin
    ) ERC20("CypherPups", "CPHP") {
        require(_router != address(0), InvalidAddress());
        require(_factory != address(0), InvalidAddress());
        require(_admin != address(0), InvalidAddress());

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
        require(!migrated, AlreadyMigrated());
        _;
    }

    modifier withinPriceImpact(uint256 priceImpact) {
        require(priceImpact <= PRICE_IMPACT_LIMIT, ExceedsPriceImpact());
        _;
    }

    modifier rateLimit(address user) {
        require(
            block.timestamp - lastActionTime[user] >= RATE_LIMIT_INTERVAL ||
                actionCounter[user] < MAX_ACTIONS_IN_INTERVAL,
            ExceededRateLimit()
        );

        if (block.timestamp - lastActionTime[user] >= RATE_LIMIT_INTERVAL) {
            actionCounter[user] = 1;
        } else {
            actionCounter[user] = actionCounter[user] + 1;
        }

        lastActionTime[user] = block.timestamp;
        _;
    }

    /**
     * @notice Buy tokens with ETH
     * @dev Implements bonding curve purchase mechanism
     */
    function buy()
        external
        payable
        nonReentrant
        whenNotPaused
        whenNotMigrated
        rateLimit(msg.sender)
    {
        require(msg.value >= MIN_PURCHASE, InvalidAmount());
        require(msg.value <= MAX_PURCHASE, InvalidAmount());
        uint256 tokenAmount = calculatePurchaseReturn(msg.value);
        require(tokenAmount > 0, InvalidAmount());
        require(totalSupply() + tokenAmount <= TOTAL_SUPPLY, InvalidAmount());
        uint256 priceImpact = calculatePriceImpact(
            msg.value,
            virtualEthReserve
        );
        require(priceImpact <= PRICE_IMPACT_LIMIT, ExceedsPriceImpact());

        virtualEthReserve = virtualEthReserve + msg.value;
        virtualTokenReserve = virtualTokenReserve - tokenAmount;
        totalCollectedETH = totalCollectedETH + msg.value;

        bool shouldMigrate = totalSupply() + tokenAmount >= MIGRATION_THRESHOLD;

        _mint(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
        emit VirtualReservesUpdated(virtualTokenReserve, virtualEthReserve);

        if (shouldMigrate) {
            migrateToUniswap();
        }
    }

    /**
     * @notice Sell tokens back to the contract
     * @param tokenAmount Amount of tokens to sell
     */
    function sell(
        uint256 tokenAmount
    )
        external
        nonReentrant
        whenNotPaused
        whenNotMigrated
        rateLimit(msg.sender)
    {
        require(tokenAmount > 0, InvalidAmount());
        require(balanceOf(msg.sender) >= tokenAmount, InsufficientBalance());

        uint256 ethAmount = calculateSaleReturn(tokenAmount);
        require(ethAmount > 0, InvalidAmount());
        require(address(this).balance >= ethAmount, InsufficientBalance());

        uint256 priceImpact = calculatePriceImpact(
            ethAmount,
            virtualEthReserve
        );
        require(priceImpact <= PRICE_IMPACT_LIMIT, ExceedsPriceImpact());

        _burn(msg.sender, tokenAmount);   

        // Correct math operations:
        virtualTokenReserve = virtualTokenReserve + tokenAmount; // Correct: Adding tokens
        virtualEthReserve = virtualEthReserve - ethAmount; // Fixed: Subtracting ETH
        totalCollectedETH = totalCollectedETH - ethAmount;

        _queueWithdrawal(msg.sender, ethAmount);

        emit TokensSold(msg.sender, tokenAmount, ethAmount);
        emit VirtualReservesUpdated(virtualTokenReserve, virtualEthReserve);
    }

    function _queueWithdrawal(address payee, uint256 amount) private {
        require(payee != address(0), InvalidAddress());
        _pendingWithdrawals[payee] = _pendingWithdrawals[payee] + amount;
        emit WithdrawalQueued(payee, amount);
    }

    function withdrawPendingPayments() external nonReentrant {
        uint256 amount = _pendingWithdrawals[msg.sender];
        require(amount > 0, NoPendingPayments());
        require(
            address(this).balance >= amount,
            "Insufficient contract balance"
        );

        // Clear pending withdrawal before transfer to prevent reentrancy
        _pendingWithdrawals[msg.sender] = 0;

        // Transfer ETH to user
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function pendingWithdrawals(address payee) external view returns (uint256) {
        return _pendingWithdrawals[payee];
    }

    /**
     * @notice Calculate price impact of a trade
     * @param tradeSize Size of the trade in ETH
     * @param currentReserve Current ETH reserve
     * @return Price impact percentage
     */
    function calculatePriceImpact(
        uint256 tradeSize,
        uint256 currentReserve
    ) public pure returns (uint256) {
        return tradeSize * (100 / currentReserve);
    }

    /**
     * @notice Calculate tokens received for ETH input
     * @param ethAmount Amount of ETH to spend
     * @return Token amount to receive
     */
    function calculatePurchaseReturn(
        uint256 ethAmount
    ) public view returns (uint256) {
        uint256 k = virtualTokenReserve * virtualEthReserve;
        uint256 newVirtualEthReserve = virtualEthReserve + ethAmount;
        uint256 newVirtualTokenReserve = k / newVirtualEthReserve;
        return virtualTokenReserve - newVirtualTokenReserve;
    }

    /**
     * @notice Calculate ETH received for token input
     * @param tokenAmount Amount of tokens to sell
     * @return ETH amount to receive
     */
    function calculateSaleReturn(
        uint256 tokenAmount
    ) public view returns (uint256) {
        uint256 k = virtualTokenReserve * virtualEthReserve;
        uint256 newVirtualTokenReserve = virtualTokenReserve + (tokenAmount * 5) / 100;
        uint256 newVirtualEthReserve = k / newVirtualTokenReserve;
        return virtualEthReserve - newVirtualEthReserve;
    }

    /**
     * @notice Migrate remaining tokens and ETH to Uniswap
     * @dev Can only be called once when migration threshold is met
     */
    function migrateToUniswap() internal {
        require(!migrated, "AlreadyMigrated()");
        require(
            totalSupply() >= MIGRATION_THRESHOLD,
            "MigrationThreshHoldNotMet()"
        );
        require(virtualTokenReserve > 0, "Zero token reserve");

        migrated = true;

        uint256 ethForPool = address(this).balance - MIGRATION_FEE;

        // Safely calculate current price with scaling factor to prevent precision loss
        uint256 SCALE = 1e18;
        uint256 currentPrice = (virtualEthReserve * SCALE) /
            virtualTokenReserve;
        require(currentPrice > 0, "Invalid price");

        // Calculate tokens to migrate with proper scaling
        uint256 tokensToMigrate = (ethForPool * SCALE) / currentPrice;
        require(tokensToMigrate > 0, "Invalid migration amount");

        uint256 tokensToBurn = TOTAL_SUPPLY - totalSupply() - tokensToMigrate;

        // Mint and burn tokens before external calls
        _mint(address(this), tokensToMigrate);
        _burn(address(this), tokensToBurn);

        // Approve before external calls
        _approve(address(this), address(uniswapRouter), tokensToMigrate);

        // Cache token amount to verify after external call
        uint256 preCallTokenBalance = IERC20(address(this)).balanceOf(
            address(this)
        );

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
            // Verify state wasn't manipulated during external call
            require(
                IERC20(address(this)).balanceOf(address(this)) <=
                    preCallTokenBalance,
                "Token balance manipulated"
            );

            address pair = uniswapFactory.getPair(
                address(this),
                uniswapRouter.WETH()
            );
            uniswapPair = pair;
            emit MigrationExecuted(ethAmount, tokenAmount, pair);
        } catch {
            // Even if migration fails, we don't want to allow retrying as state has been modified
            revert("Migration failed");
        }
    }

    /**
     * @notice Emergency withdrawal in case of critical issues
     * @dev Only callable by admin in emergency mode
     */
    function emergencyWithdraw() external nonReentrant onlyRole(ADMIN_ROLE) {
        require(emergencyMode, "Emergency mode not active");

        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        // Update state first
        uint256 amountToWithdraw = balance;
        totalCollectedETH = totalCollectedETH - amountToWithdraw;

        // External call last
        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        require(success, TransferFailed());

        emit EmergencyWithdraw(msg.sender, amountToWithdraw);
    }

    /**
     * @notice Set emergency mode
     * @param _emergencyMode New emergency mode state
     */
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

    /**
     * @notice Withdraw accumulated fees post-migration
     * @dev Only callable by admin after migration
     */
    function withdrawFees() external nonReentrant onlyRole(ADMIN_ROLE) {
        require(migrated, NotMigrated());
        require(address(this).balance >= MIGRATION_FEE, InsufficientBalance());

        (bool success, ) = msg.sender.call{value: MIGRATION_FEE}("");
        require(success, TransferFailed());
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._update(from, to, amount);
    }

    // Receive function
    receive() external payable {
        require(
            msg.sender == address(uniswapRouter),
            "Only router can send ETH"
        );
    }
}
