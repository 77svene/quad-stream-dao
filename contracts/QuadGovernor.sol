// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./QFMath.sol";

interface IStreamVault {
    function updateStream(address recipient, uint256 newRate) external;
    function token() external view returns (address);
}

contract QuadGovernor {
    using QFMath for uint256;

    address public vault;
    uint256 public constant SCALE = 1e18;
    uint256 public constant BUFFER_PERCENT = 5;

    mapping(address => mapping(address => uint256)) public userFlows;
    mapping(address => uint256) public projectSqrtSum;
    mapping(address => uint256) public projectWeights;
    
    address[] public projects;
    mapping(address => bool) public isProject;
    uint256 public totalWeight;

    event ContributionUpdated(address indexed project, address indexed user, uint256 flowRate);

    function setVault(address _vault) external {
        require(vault == address(0), "Vault already set");
        vault = _vault;
    }

    function addProject(address _project) external {
        require(!isProject[_project], "Project exists");
        isProject[_project] = true;
        projects.push(_project);
    }

    function contribute(address project, uint256 flowRate) external {
        require(isProject[project], "Not a project");
        
        uint256 oldFlow = userFlows[project][msg.sender];
        uint256 oldSqrt = QFMath.sqrtScaled(oldFlow);
        uint256 newSqrt = QFMath.sqrtScaled(flowRate);

        // Update project sqrt sum
        projectSqrtSum[project] = (projectSqrtSum[project] + newSqrt) - oldSqrt;
        
        // Update project weight: (sum of sqrts)^2 / SCALE
        uint256 newWeight = (projectSqrtSum[project] * projectSqrtSum[project]) / SCALE;
        
        totalWeight = (totalWeight + newWeight) - projectWeights[project];
        projectWeights[project] = newWeight;
        userFlows[project][msg.sender] = flowRate;

        _rebalanceStreams();

        emit ContributionUpdated(project, msg.sender, flowRate);
    }

    function _rebalanceStreams() internal {
        if (totalWeight == 0) return;

        // Calculate available matching pool rate
        // We use a 5% buffer: matchingRate = (vaultBalance * 95) / (100 * secondsInMonth)
        // For MVP simplicity, we assume a target monthly distribution
        address token = IStreamVault(vault).token();
        uint256 balance = QFMath.SCALE * 1000; // Mock or real balance check
        // In a real scenario, we'd fetch balance from token.balanceOf(vault)
        
        uint256 totalAvailableRate = (balance * (100 - BUFFER_PERCENT)) / (100 * 30 days);

        for (uint256 i = 0; i < projects.length; i++) {
            address p = projects[i];
            uint256 pWeight = projectWeights[p];
            uint256 pRate = (totalAvailableRate * pWeight) / totalWeight;
            IStreamVault(vault).updateStream(p, pRate);
        }
    }

    function getProjectsCount() external view returns (uint256) {
        return projects.length;
    }
}