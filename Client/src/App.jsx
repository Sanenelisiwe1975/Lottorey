	
// src/App.js
import { useEffect, useState } from 'react';
import { ethers } from "ethers";
import $u from './utils/$u.js';
import web3 from 'web3';
import LottoContract from './contract/lotto.json';

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [lottoBalance, setLottoBalance] = useState("0");
  const [players, setPlayers] = useState([]);
  const [lottoId, setLottoId] = useState(0);
  const [entryAmount, setEntryAmount] = useState("0.01");
  const [winner, setWinner] = useState(null);

  const LOTTO_CONTRACT_ADDRESS = "0x6D5b39bbF465d07246792b66955a654a739A6D0b";

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Metamask to use this app.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const network = await provider.getNetwork();
      if (network.chainId !== 534351) { 
        alert("Please switch to Scroll Sepolia");
        return;
      }

      const ethBalance = await provider.getBalance(address);
      const formattedBalance = $u.moveDecimalLeft(ethBalance.toString(), 18);

      setAccount({
        address,
        balance: formattedBalance,
        chainId: network.chainId
      });

      const Lotto = new ethers.Contract(
        LOTTO_CONTRACT_ADDRESS,
        LottoContract,
        signer
      );

      setContract(Lotto);
      await refreshLottoData(Lotto);
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const refreshLottoData = async (lottoInstance) => {
    try {
      const balance = await lottoInstance.getBalance();
      setLottoBalance($u.moveDecimalLeft(balance.toString(), 18));
      
      const playersList = await lottoInstance.getPlayers();
      setPlayers(playersList);
      
      const currentLottoId = await lottoInstance.lottoId();
      setLottoId(currentLottoId);
      
      if (currentLottoId > 1) {
        const lastWinner = await lottoInstance.getWinnerByLotto(currentLottoId - 1);
        setWinner(lastWinner);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const enterLotto = async () => {
    if (!contract || !account) return;

    try {
      const amountInWei = ethers.utils.parseEther(entryAmount);
      const tx = await contract.enter({ value: amountInWei });
      await tx.wait();
      await refreshLottoData(contract);
      alert("Successfully entered the lotto!");
    } catch (err) {
      console.error("Entry failed:", err);
      alert(`Entry failed: ${err.message}`);
    }
  };

  const pickWinner = async () => {
    if (!contract || !account) return;

    try {
      const tx = await contract.pickWinner();
      await tx.wait();
      await refreshLottoData(contract);
      alert("Winner picked successfully!");
    } catch (err) {
      console.error("Pick winner failed:", err);
      alert(`Pick winner failed: ${err.message}`);
    }
  };

useEffect(()=>{
},[account])

  return (
    <div className="app">
      <h1>Lotto DApp</h1>
      
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <div className="wallet-info">
            <p>Connected: {account.address}</p>
            <p>Balance: {account.balance} ETH</p>
            <p>Network: Scroll Sepolia (ChainID: {account.chainId})</p>
          </div>

          <div className="lotto-info">
            <h2>Lotto #{lottoId.toString()}</h2>
            <p>Prize Pool: {lottoBalance} ETH</p>
            <p>Players: {players.length}</p>
            {winner && <p>Last Winner: {winner}</p>}
          </div>

          <div className="entry-form">
            <input
              type="number"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              min="0.001"
              step="0.001"
              placeholder="ETH amount"
            />
            <button onClick={enterLotto}>Enter Lotto</button>
          </div>

          {contract && account.address === contract.owner() && (
            <div className="admin-actions">
              <button onClick={pickWinner}>Pick Winner</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;