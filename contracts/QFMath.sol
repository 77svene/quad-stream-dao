// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title QFMath
 * @dev Library for Quadratic Funding calculations using Babylonian square root.
 */
library QFMath {
    uint256 constant SCALE = 1e18;

    /**
     * @dev Standard Babylonian square root implementation.
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @dev Calculates the square root of a value scaled by 1e18.
     * Result is also scaled by 1e18.
     * sqrt(x * 10^18) * 10^9 = sqrt(x * 10^36)
     */
    function sqrtScaled(uint256 x) internal pure returns (uint256) {
        return sqrt(x * SCALE);
    }

    /**
     * @dev Calculates the QF weight: (sum of sqrt(contributions))^2
     * @param contributions Array of individual contribution amounts (scaled by 1e18)
     * Returns the total weight scaled by 1e18.
     */
    function calculateWeight(uint256[] memory contributions) internal pure returns (uint256) {
        uint256 sumSqrt = 0;
        for (uint256 i = 0; i < contributions.length; i++) {
            sumSqrt += sqrtScaled(contributions[i]);
        }
        // (sumSqrt)^2 / 1e18 to maintain 1e18 scaling
        // sumSqrt is already 1e18, so sumSqrt * sumSqrt is 1e36.
        return (sumSqrt * sumSqrt) / SCALE;
    }
}