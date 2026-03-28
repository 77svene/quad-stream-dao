const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuadStream QF Logic", function () {
  let governor, vault, token;
  let owner, alice, bob, charlie, dave, projA, projB;
  const SCALE = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave, projA, projB] = await ethers.getSigners();

    // Deploy Mock Token
    const Token = await ethers.getContractFactory("contracts/StreamVault.sol:IERC20");
    // Note: In a real test we'd deploy a real ERC20, but for logic testing 
    // we just need the addresses to exist for the Governor.
    token = owner.address; 

    // Deploy Governor
    const Governor = await ethers.getContractFactory("QuadGovernor");
    governor = await Governor.deploy();

    // Deploy Vault
    const Vault = await ethers.getContractFactory("StreamVault");
    vault = await Vault.deploy(await governor.getAddress(), token);

    await governor.setVault(await vault.getAddress());
    await governor.setTotalMatchingRate(ethers.parseEther("10")); // 10 tokens/sec matching pool

    await governor.addProject(projA.address);
    await governor.addProject(projB.address);
  });

  it("Should verify 4 contributors of 1 DAI/sec > 1 contributor of 4 DAI/sec", async function () {
    // Project A: 4 contributors @ 1 unit/sec each
    // sqrt(1)+sqrt(1)+sqrt(1)+sqrt(1) = 4. 4^2 = 16.
    await governor.connect(alice).updateContribution(projA.address, ethers.parseEther("1"));
    await governor.connect(bob).updateContribution(projA.address, ethers.parseEther("1"));
    await governor.connect(charlie).updateContribution(projA.address, ethers.parseEther("1"));
    await governor.connect(dave).updateContribution(projA.address, ethers.parseEther("1"));

    // Project B: 1 contributor @ 4 units/sec
    // sqrt(4) = 2. 2^2 = 4.
    await governor.connect(alice).updateContribution(projB.address, ethers.parseEther("4"));

    const weightA = await governor.projectWeights(projA.address);
    const weightB = await governor.projectWeights(projB.address);

    // Weight A (16) should be 4x Weight B (4)
    expect(weightA).to.be.gt(weightB);
    
    // Check actual stream rates in vault
    const streamA = await vault.streams(projA.address);
    const streamB = await vault.streams(projB.address);

    // Total matching is 10. Total weight is 16 + 4 = 20.
    // A gets 16/20 * 10 = 8
    // B gets 4/20 * 10 = 2
    expect(streamA.rate).to.equal(ethers.parseEther("8"));
    expect(streamB.rate).to.equal(ethers.parseEther("2"));
  });

  it("Should drop matching rate to 0 if all contributors stop", async function () {
    await governor.connect(alice).updateContribution(projA.address, ethers.parseEther("1"));
    let stream = await vault.streams(projA.address);
    expect(stream.rate).to.be.gt(0);

    await governor.connect(alice).updateContribution(projA.address, 0);
    stream = await vault.streams(projA.address);
    expect(stream.rate).to.equal(0);
  });

  it("Should rebalance when total matching rate changes", async function () {
    await governor.connect(alice).updateContribution(projA.address, ethers.parseEther("1"));
    const initialStream = (await vault.streams(projA.address)).rate;

    await governor.setTotalMatchingRate(ethers.parseEther("20"));
    const newStream = (await vault.streams(projA.address)).rate;

    expect(newStream).to.equal(initialStream * 2n);
  });

  it("Should prevent non-governor from updating vault streams", async function () {
    await expect(
      vault.connect(alice).updateStream(projA.address, 100)
    ).to.be.revertedWith("Only governor");
  });
});