const GOVERNOR_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const VAULT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const GOVERNOR_ABI = [
    "function projects(uint256) view returns (address)",
    "function getProjectsCount() view returns (uint256)",
    "function projectWeights(address) view returns (uint256)",
    "function projectSqrtSum(address) view returns (uint256)",
    "function totalWeight() view returns (uint256)",
    "function totalMatchingRate() view returns (uint256)",
    "function userFlows(address, address) view returns (uint256)",
    "function updateContribution(address project, uint256 flowRate) external"
];

const VAULT_ABI = [
    "function streams(address) view returns (uint256 rate, uint256 lastUpdate, uint256 accrued)",
    "function token() view returns (address)"
];

let provider, signer, governor, vault;
const SCALE = BigInt(10) ** BigInt(18);

async function init() {
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.BrowserProvider(window.ethereum);
        try {
            const accounts = await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            governor = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, signer);
            vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
            await refreshData();
        } catch (err) {
            console.error("Connection failed", err);
        }
    } else {
        alert("Please install MetaMask");
    }
}

async function refreshData() {
    const count = await governor.getProjectsCount();
    const totalWeight = await governor.totalWeight();
    const totalMatch = await governor.totalMatchingRate();
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const addr = await governor.projects(i);
        const weight = await governor.projectWeights(addr);
        const sqrtSum = await governor.projectSqrtSum(addr);
        const stream = await vault.streams(addr);
        
        const matchRate = totalWeight > 0n ? (totalMatch * weight) / totalWeight : 0n;
        
        const div = document.createElement('div');
        div.className = 'project-card';
        div.innerHTML = `
            <h3>Project: ${addr.substring(0, 6)}...${addr.substring(38)}</h3>
            <p>Matching Rate: ${ethers.formatEther(matchRate)} tokens/sec</p>
            <p>Current Weight: ${ethers.formatUnits(weight, 18)}</p>
            <div class="controls">
                <input type="number" id="rate-${addr}" placeholder="New Rate (ETH/sec)">
                <button onclick="updateStream('${addr}')">Update Stream</button>
                <button onclick="simulateImpact('${addr}')">Simulate Impact</button>
            </div>
            <div id="sim-${addr}" class="sim-result"></div>
        `;
        projectList.appendChild(div);
    }
}

async function updateStream(project) {
    const rateInput = document.getElementById(`rate-${project}`).value;
    const rateWei = ethers.parseEther(rateInput);
    try {
        const tx = await governor.updateContribution(project, rateWei);
        await tx.wait();
        await refreshData();
    } catch (err) {
        console.error("Update failed", err);
    }
}

async function simulateImpact(project) {
    const rateInput = document.getElementById(`rate-${project}`).value;
    if (!rateInput) return;
    
    const newRate = ethers.parseEther(rateInput);
    const user = await signer.getAddress();
    const currentFlow = await governor.userFlows(project, user);
    const currentSqrtSum = await governor.projectSqrtSum(project);
    const totalWeight = await governor.totalWeight();
    const totalMatch = await governor.totalMatchingRate();

    // Math: newSqrtSum = currentSqrtSum - sqrt(currentFlow) + sqrt(newRate)
    const curSqrt = BigInt(Math.floor(Math.sqrt(Number(currentFlow) * 1e18)));
    const newSqrt = BigInt(Math.floor(Math.sqrt(Number(newRate) * 1e18)));
    const estimatedSqrtSum = currentSqrtSum - curSqrt + newSqrt;
    const estimatedWeight = (estimatedSqrtSum * estimatedSqrtSum) / SCALE;
    
    const newTotalWeight = totalWeight - (currentSqrtSum * currentSqrtSum / SCALE) + estimatedWeight;
    const estimatedMatch = newTotalWeight > 0n ? (totalMatch * estimatedWeight) / newTotalWeight : 0n;

    document.getElementById(`sim-${project}`).innerText = 
        `Estimated Match: ${ethers.formatEther(estimatedMatch)} tokens/sec (+${((Number(estimatedMatch) / Number(totalMatch)) * 100).toFixed(2)}% of pool)`;
}

window.addEventListener('load', init);