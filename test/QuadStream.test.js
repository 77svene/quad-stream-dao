const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuadStream QF Logic", function () {
  let governor, vault, token;
  let owner, alice, bob, charlie, dave, project1, project2;
  const SCALE = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave, project1, project2] = await ethers.getSigners();

    // Deploy Mock Token
    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("DAI", "DAI", ethers.parseEther("1000000"));

    // Deploy Governor
    const Governor = await ethers.getContractFactory("QuadGovernor");
    governor = await Governor.deploy();

    // Deploy Vault
    const Vault = await ethers.getContractFactory("StreamVault");
    vault = await Vault.deploy(await governor.getAddress(), await token.getAddress());

    // Setup
    await governor.setVault(await vault.getAddress());
    await governor.addProject(project1.address);
    await governor.addProject(project2.address);
    
    // Set matching pool rate: 100 tokens per second
    await governor.setTotalMatchingRate(ethers.parseEther("100"));
  });

  it("Case 1: 4 contributors of 1 DAI/sec > 1 contributor of 4 DAI/sec", async function () {
    // Project 1: 4 contributors @ 1 DAI/sec each
    // Sqrt sum = 1+1+1+1 = 4. Weight = 4^2 = 16.
    await governor.connect(alice).updateContribution(project1.address, ethers.parseEther("1"));
    await governor.connect(bob).updateContribution(project1.address, ethers.parseEther("1"));
    await governor.connect(charlie).updateContribution(project1.address, ethers.parseEther("1"));
    await governor.connect(dave).updateContribution(project1.address, ethers.parseEther("1"));

    // Project 2: 1 contributor @ 4 DAI/sec
    // Sqrt sum = sqrt(4) = 2. Weight = 2^2 = 4.
    await governor.connect(owner).updateContribution(project2.address, ethers.parseEther("4"));

    const weight1 = await governor.projectWeights(project1.address);
    const weight2 = await governor.projectWeights(project2.address);

    // 16 vs 4
    expect(weight1).to.equal(ethers.parseEther("16"));
    expect(weight2).to.equal(ethers.parseEther("4"));

    // Check matching rates (Total 100)
    // P1: 100 * (16/20) = 80
    // P2: 100 * (4/20) = 20
    const stream1 = await vault.streams(project1.address);
    const stream2 = await vault.streams(project2.address);

    expect(stream1.rate).to.equal(ethers.parseEther("80"));
    expect(stream2.rate).to.equal(ethers.parseEther("20"));
  });

  it("Case 2: Matching rate drops when a contributor stops", async function () {
    await governor.connect(alice).updateContribution(project1.address, ethers.parseEther("1"));
    await governor.connect(bob).updateContribution(project2.address, ethers.parseEther("1"));
    
    // Equal weights (1 vs 1) -> 50/50 split
    let stream1 = await vault.streams(project1.address);
    expect(stream1.rate).to.equal(ethers.parseEther("50"));

    // Alice stops
    await governor.connect(alice).updateContribution(project1.address, 0);
    
    stream1 = await vault.streams(project1.address);
    let stream2 = await vault.streams(project2.address);
    
    expect(stream1.rate).to.equal(0);
    expect(stream2.rate).to.equal(ethers.parseEther("100")); // Project 2 gets everything
  });

  it("Case 3: Vault accrues funds over time", async function () {
    await governor.connect(alice).updateContribution(project1.address, ethers.parseEther("1"));
    // 100% of matching goes to project1
    
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine");

    const stream = await vault.streams(project1.address);
    // Note: updateStream is called during updateContribution, so it might have accrued 0 initially.
    // We call updateStream again or just check the math.
    // In our contract, updateStream updates 'accrued'.
    await governor.setTotalMatchingRate(ethers.parseEther("100")); // Triggers rebalance/update
    
    const streamAfter = await vault.streams(project1.address);
    expect(streamAfter.accrued).to.be.at.least(ethers.parseEther("1000")); // 100/s * 10s
  });

  it("Case 4: Project withdrawal reduces vault balance", async function () {
    // Fund the vault
    await token.transfer(await vault.getAddress(), ethers.parseEther("5000"));
    
    await governor.connect(alice).updateContribution(project1.address, ethers.parseEther("1"));
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine");
    
    // Trigger accrual
    await governor.setTotalMatchingRate(ethers.parseEther("100"));
    
    const initialBal = await token.balanceOf(project1.address);
    await vault.connect(project1).withdraw();
    const finalBal = await token.balanceOf(project1.address);
    
    expect(finalBal).to.be.gt(initialBal);
  });
});

// Minimal Mock Token for testing
async function deployMock() {
    const [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    return await Token.deploy("DAI", "DAI", ethers.parseEther("1000000"));
}