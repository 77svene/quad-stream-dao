// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title StreamVault
 * @dev Holds the matching pool and manages outbound streams to recipients.
 * Rates are per second.
 */
contract StreamVault {
    address public governor;
    address public token; 

    struct Stream {
        uint256 rate; // amount per second
        uint256 lastUpdate;
        uint256 accrued;
    }

    mapping(address => Stream) public streams;
    uint256 public totalStreamingRate;

    event StreamUpdated(address indexed recipient, uint256 rate);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    constructor(address _governor, address _token) {
        require(_governor != address(0), "Invalid governor");
        governor = _governor;
        token = _token;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "Only governor");
        _;
    }

    /**
     * @dev Updates the streaming rate for a recipient. 
     * Called by the Governor when QF weights change.
     */
    function updateStream(address recipient, uint256 newRate) external onlyGovernor {
        Stream storage s = streams[recipient];
        
        // Accrue pending funds before changing rate
        if (s.lastUpdate > 0 && s.rate > 0) {
            uint256 timePassed = block.timestamp - s.lastUpdate;
            s.accrued += timePassed * s.rate;
        }

        totalStreamingRate = (totalStreamingRate - s.rate) + newRate;
        s.rate = newRate;
        s.lastUpdate = block.timestamp;

        emit StreamUpdated(recipient, newRate);
    }

    /**
     * @dev Returns the total claimable amount for a recipient.
     */
    function claimable(address recipient) public view returns (uint256) {
        Stream storage s = streams[recipient];
        uint256 pending = 0;
        if (s.lastUpdate > 0 && s.rate > 0 && block.timestamp > s.lastUpdate) {
            pending = (block.timestamp - s.lastUpdate) * s.rate;
        }
        return s.accrued + pending;
    }

    /**
     * @dev Allows a recipient to withdraw their accrued matching funds.
     */
    function withdraw() external {
        uint256 amount = claimable(msg.sender);
        require(amount > 0, "Nothing to withdraw");

        Stream storage s = streams[msg.sender];
        s.accrued = 0;
        s.lastUpdate = block.timestamp;

        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient vault balance");
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Emergency function for governor to recover tokens if needed.
     */
    function recoverTokens(address _token, uint256 _amount) external onlyGovernor {
        require(IERC20(_token).transfer(governor, _amount), "Recovery failed");
    }
}