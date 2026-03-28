const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuadStream QF Logic", function () {
  let governor, vault, token;
  let owner, alice, bob, charlie, dave, projectA, projectB;
  const SCALE = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave, projectA, projectB] = await ethers.getSigners();

    // Deploy Mock Token
    const Token = await ethers.getContractFactory("contracts/StreamVault.sol:IERC20");
    // Note: In a real test we'd deploy a real ERC20, but for logic testing 
    // we just need the addresses. We'll mock the vault's dependency.
    
    const QFMath = await ethers.getContractFactory("QFMath");
    const qfMath = await QFMath.deploy();

    const QuadGovernor = await ethers.getContractFactory("QuadGovernor", {
      libraries: { QFMath: await qfMath.getAddress() }
    });
    governor = await QuadGovernor.deploy();

    const StreamVault = await ethers.getContractFactory("StreamVault");
    vault = await StreamVault.deploy(await governor.getAddress(), owner.address); // owner as dummy token
    
    await governor.setVault(await vault.getAddress());
    await governor.setTotalMatchingRate(ethers.parseEther("10")); // 10 tokens/sec matching pool

    await governor.addProject(projectA.address);
    await governor.addProject(projectB.address);
  });

  it("Should verify 4 contributors of 1 DAI/sec > 1 contributor of 4 DAI/sec", async function () {
    // Project A: 4 contributors @ 1 unit each
    // Sqrt sum = 1+1+1+1 = 4. Weight = 4^2 = 16.
    await governor.connect(alice).updateContribution(projectA.address, ethers.parseEther("1"));
    await governor.connect(bob).updateContribution(projectA.address, ethers.parseEther("1"));
    await governor.connect(charlie).updateContribution(projectA.address, ethers.parseEther("1"));
    await governor.connect(dave).updateContribution(projectA.address, ethers.parseEther("1"));

    // Project B: 1 contributor @ 4 units
    // Sqrt sum = sqrt(4) = 2. Weight = 2^2 = 4.
    await governor.connect(alice).updateContribution(projectB.address, ethers.parseEther("4"));

    const weightA = await governor.projectWeights(projectA.address);
    const weightB = await governor.projectWeights(projectB.address);

    // 16 vs 4
    expect(weightA).to.equal(ethers.parseEther("16"));
    expect(weightB).to.equal(ethers.parseEther("4"));
    
    // Check matching rates (Total 10)
    // A gets 16/20 * 10 = 8
    // B gets 4/20 * 10 = 2
    const streamA = await vault.streams(projectA.address);
    const streamB = await vault.streams(projectB.address);

    expect(streamA.rate).to.equal(ethers.parseEther("8"));
    expect(streamB.rate).to.equal(ethers.parseEther("2"));
  });

  it("Should drop matching rate to 0 if all contributors stop", async function () {
    await governor.connect(alice).updateContribution(projectA.address, ethers.parseEther("1"));
    let stream = await vault.streams(projectA.address);
    expect(stream.rate).to.be.gt(0);

    await governor.connect(alice).updateContribution(projectA.address, 0);
    stream = await vault.streams(projectA.address);
    expect(stream.rate).to.equal(0);
  });

  it("Should rebalance when total matching pool changes", async function () {
    await governor.connect(alice).updateContribution(projectA.address, ethers.parseEther("1"));
    const initialStream = (await vault.streams(projectA.address)).rate;

    await governor.setTotalMatchingRate(ethers.parseEther("20"));
    const newStream = (await vault.streams(projectA.address)).rate;

    expect(newStream).to.equal(initialStream * 2n);
  });

  it("Should handle multiple projects with different weights", async function () {
    await governor.connect(alice).updateContribution(projectA.address, ethers.parseEther("1")); // weight 1
    await governor.connect(bob).updateContribution(projectB.address, ethers.parseEther("9"));   // weight 9
    
    const totalWeight = await governor.totalWeight();
    expect(totalWeight).to.equal(ethers.parseEther("10"));
    
    const streamA = await vault.streams(projectA.address);
    const streamB = await vault.streams(projectB.address);
    
    // Total matching is 10. A gets 1/10 * 10 = 1. B gets 9/10 * 10 = 9.
    expect(streamA.rate).to.equal(ethers.parseEther("1"));
    expect(streamB.rate).to.equal(ethers.parseEther("9"));
  });
});