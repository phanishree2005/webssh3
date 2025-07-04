const { ethers } = window.ethers;

let demoMode = false;
let lastMintedRoomId = null;

const walletModeBtn = document.getElementById('walletModeBtn');
const demoModeBtn = document.getElementById('demoModeBtn');
const walletSection = document.getElementById('walletSection');
const demoSection = document.getElementById('demoSection');
const walletAddress = document.getElementById('walletAddress');

walletModeBtn.onclick = () => {
  demoMode = false;
  walletModeBtn.classList.add('active');
  demoModeBtn.classList.remove('active');
  walletSection.style.display = 'block';
  demoSection.style.display = 'none';
};

demoModeBtn.onclick = () => {
  demoMode = true;
  demoModeBtn.classList.add('active');
  walletModeBtn.classList.remove('active');
  walletSection.style.display = 'none';
  demoSection.style.display = 'block';
  walletAddress.innerText = '';
};

const connectBtn = document.getElementById('connectBtn');
connectBtn.onclick = async () => {
  if (typeof window.ethereum === 'undefined') {
    walletAddress.innerText = "MetaMask not found!";
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    walletAddress.innerText = "Connected: " + accounts[0];
  } catch (err) {
    console.error(err);
    walletAddress.innerText = "Connection failed";
  }
};

const mintBtn = document.getElementById('mintBtn');
const mintStatus = document.getElementById('mintStatus');
const copyRoomIdBtn = document.getElementById('copyRoomIdBtn');

const contractAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // Replace with your contract
const abi = [
  "function mint() public returns (uint256)",
  "function requestJoin(uint256 roomId) public",
  "function approveJoin(uint256 roomId, address user) public",
  "function rejectJoin(uint256 roomId, address user) public",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

mintBtn.onclick = async () => {
  if (!window.ethereum) {
    mintStatus.innerText = "MetaMask not found!";
    return;
  }

  try {
    mintStatus.innerText = "Requesting signature...";
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    const tx = await contract.mint();
    mintStatus.innerText = "Transaction sent: " + tx.hash;

    const receipt = await tx.wait();
    let roomId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog.name === "Transfer") {
          roomId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch {}
    }

    if (roomId) {
      lastMintedRoomId = roomId;
      mintStatus.innerHTML = `NFT minted successfully!<br/>Room ID: <strong>${roomId}</strong> 🎉`;
      copyRoomIdBtn.style.display = 'inline-block';
    } else {
      mintStatus.innerText = "NFT minted, but Room ID not found in logs.";
    }
  } catch (err) {
    console.error(err);
    mintStatus.innerText = "Mint failed: " + (err.reason || err.message || err);
  }
};

copyRoomIdBtn.onclick = () => {
  if (lastMintedRoomId) {
    navigator.clipboard.writeText(lastMintedRoomId);
    copyRoomIdBtn.innerText = "Copied!";
    setTimeout(() => copyRoomIdBtn.innerText = "Copy Room ID", 1500);
  }
};

const joinBtn = document.getElementById('joinBtn');
const joinRoomIdInput = document.getElementById('joinRoomId');
const joinStatus = document.getElementById('joinStatus');

joinBtn.onclick = async () => {
  if (!window.ethereum) {
    joinStatus.innerText = "MetaMask not found!";
    return;
  }

  const rawInput = joinRoomIdInput.value.trim();
  const roomId = rawInput.match(/\d+/)?.[0];
  if (!roomId) {
    joinStatus.innerText = "Invalid Room ID format.";
    return;
  }

  try {
    joinStatus.innerText = "Sending join request...";
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    const tx = await contract.requestJoin(BigInt(roomId));
    await tx.wait();
    joinStatus.innerText = `Join request sent for Room ID: ${roomId}`;
  } catch (err) {
    console.error(err);
    joinStatus.innerText = "Join failed: " + (err.reason || err.message || err);
  }
};

const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');
const approveRoomIdInput = document.getElementById('approveRoomId');
const approveUserInput = document.getElementById('approveUser');
const approveStatus = document.getElementById('approveStatus');

approveBtn.onclick = async () => await handleApproval(true);
rejectBtn.onclick = async () => await handleApproval(false);

async function handleApproval(isApprove) {
  if (!window.ethereum) {
    approveStatus.innerText = "MetaMask not found!";
    return;
  }

  const roomId = approveRoomIdInput.value.trim();
  const user = approveUserInput.value.trim();

  if (!roomId || !ethers.isAddress(user)) {
    approveStatus.innerText = "Invalid Room ID or user address.";
    return;
  }

  try {
    approveStatus.innerText = isApprove ? "Approving..." : "Rejecting...";
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    const tx = isApprove
      ? await contract.approveJoin(BigInt(roomId), user)
      : await contract.rejectJoin(BigInt(roomId), user);

    await tx.wait();
    approveStatus.innerText = isApprove
      ? `✅ Approved ${user} for Room ${roomId}`
      : `❌ Rejected ${user} for Room ${roomId}`;
  } catch (err) {
    console.error(err);
    approveStatus.innerText = "Action failed: " + (err.reason || err.message || err);
  }
}
