// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./QFMath.sol";

interface IStreamVault {
    function updateStream(address recipient, uint256 newRate) external;
    function token() external view returns (address);
    function totalStreamingRate() external view returns (uint256);
}

contract QuadGovernor {
    using QFMath for uint256;

    address public vault;
    uint256 public constant SCALE = 1e18;
    uint256 public totalMatchingRate; 

    mapping(address => mapping(address => uint256)) public userFlows;
    mapping(address => uint256) public projectSqrtSum;
    mapping(address => uint256) public projectWeights;
    
    address[] public projects;
    mapping(address => bool) public isProject;
    uint256 public totalWeight;

    event ContributionUpdated(address indexed project, address indexed user, uint256 flowRate);
    event ProjectAdded(address indexed project);

    function setVault(address _vault) external {
        require(vault == address(0), "Vault already set");
        vault = _vault;
    }

    function setTotalMatchingRate(uint256 _rate) external {
        totalMatchingRate = _rate;
        _rebalanceAll();
    }

    function addProject(address _project) external {
        require(!isProject[_project], "Already project");
        isProject[_project] = true;
        projects.push(_project);
        emit ProjectAdded(_project);
    }

    function updateContribution(address _project, uint256 _newFlowRate) external {
        require(isProject[_project], "Not a project");
        
        uint256 oldFlow = userFlows[_project][msg.sender];
        userFlows[_project][msg.sender] = _newFlowRate;

        uint256 oldSqrt = QFMath.sqrtScaled(oldFlow);
        uint256 newSqrt = QFMath.sqrtScaled(_newFlowRate);

        uint256 currentSqrtSum = projectSqrtSum[_project];
        // Update sqrt sum: subtract old, add new
        projectSqrtSum[_project] = (currentSqrtSum + newSqrt) - oldSqrt;

        // Update project weight: (sum of sqrts)^2
        uint256 oldWeight = projectWeights[_project];
        uint256 newWeight = (projectSqrtSum[_project] * projectSqrtSum[_project]) / SCALE;
        projectWeights[_project] = newWeight;

        totalWeight = (totalWeight + newWeight) - oldWeight;

        _rebalanceAll();
        emit ContributionUpdated(_project, msg.sender, _newFlowRate);
    }

    function _rebalanceAll() internal {
        if (totalWeight == 0 || vault == address(0)) return;

        for (uint256 i = 0; i < projects.length; i++) {
            address project = projects[i];
            uint256 share = (projectWeights[project] * totalMatchingRate) / totalWeight;
            IStreamVault(vault).updateStream(project, share);
        }
    }

    function getProjectsCount() external view returns (uint256) {
        return projects.length;
    }
}