import Head from "next/head";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { formatEther } from "ethers/lib/utils";
import { providers, Contract } from "ethers";
import {
  DAO_CONTRACT_ADDRESS,
  DAO_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  NFT_CONTRACT_ABI,
} from "../constants";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [nftBalance, setNftBalance] = useState(0);
  const [treasuryBalance, setTreasuyBalance] = useState("0");
  const [numProposals, setNumProposals] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [fakeNftTokenId, setFakeNfttokenId] = useState("");
  const [selectedTab, setSelectedTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const web3ModalRef = useRef();

  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(DAO_CONTRACT_ADDRESS);
      setTreasuyBalance(balance.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (err) {
      console.error(err);
    }
  };

  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (err) {
      console.error(err);
    }
  };

  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      console.log(numProposals);
      setLoading(false);
    } catch (err) {
      console.error(error);
      window.alert(error.reason);
    }
  };

  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      console.log(proposals);
      return proposals;
    } catch (err) {
      console.error(err);
    }
  };

  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      let vote = _vote === "YAY" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (err) {
      console.error(err);
      window.alert(error.reason);
    }
  };

  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(signer);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
      getDAOTreasuryBalance();
    } catch (err) {
      console.error(err);
      window.alert(error.reason);
    }
  };

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getDAOOwner = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      const _owner = await daoContract.owner();
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const withdrawDAOEther = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const contract = getDaoContractInstance(signer);
      const txn = await contract.withdrawDAOEther();
      setLoading(true);
      await txn.wait();
      setLoading(false);
      getDAOTreasuryBalance();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper Functions of Provider and Signer

  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);

      const { chainId } = await web3Provider.getNetwork();
      if (chainId !== 5) {
        window.alert("Kindly Connect to Goerli");
        throw new Error("Kindly Connect to Goerli");
      }

      if (needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }
      return web3Provider;
    } catch (err) {
      console.error(err);
    }
  };

  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(
      DAO_CONTRACT_ADDRESS,
      DAO_CONTRACT_ABI,
      providerOrSigner
    );
  };

  const getNFTContractInstance = (providerOrSigner) => {
    return new Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      providerOrSigner
    );
  };

  //Functions on Page Render

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        networks: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
        getDAOOwner();
      });
    }
  }, [walletConnected]);

  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  //Render Functions

  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading.... Waiting for Transaction....
        </div>
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          you donot Own any CryptoDev NFTs. <br />
          <b>You cannot create Proposal</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to purchase</label>
          <input
            placeholder="0"
            type="number"
            onChange={(e) => setFakeNfttokenId(e.target.value)}
          />
          <button className={styles.button} onClick={createProposal}>
            Create Proposal
          </button>
        </div>
      );
    }
  }

  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for Transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p> Proposal Id : {p.proposalId}</p>
              <p> Fake NFT to purchase : {p.nftTokenId}</p>
              <p> Deadline : {p.deadline.toLocaleString()}</p>
              <p> Yay Votes : {p.yayVotes}</p>
              <p>Nay Votes : {p.nayVotes}</p>
              <p>Executed : {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.buton}
                    onClick={() => voteOnProposal(p.proposalId, "YAY")}
                  >
                    Vote Yay
                  </button>
                  <button
                    className={styles.buton}
                    onClick={() => voteOnProposal(p.proposalId, "NAY")}
                  >
                    Vote Nay
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    ExeCute Proposal
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>CRYPTO DEVS DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
      </Head>
      <div className={styles.main}>
        <h1 className={styles.title}>Welcome To Crypto Devs</h1>
        <div className={styles.description}>Welcome To Dao!</div>
        <div className={styles.description}>
          Your Crypto Devs NFT Balance: {nftBalance}
          <br />
          Treasury Balance : {formatEther(treasuryBalance)} ETH
          <br />
          Total Number of Proposals : {numProposals}
        </div>
        <div className={styles.flex}>
          <button
            className={styles.button}
            onClick={() => setSelectedTab("Create Proposal")}
          >
            Create Proposal
          </button>
          <button
            className={styles.button}
            onClick={() => setSelectedTab("View Proposals")}
          >
            View Proposals
          </button>
        </div>
        {renderTabs()}
        {isOwner ? (
          <div>
            {loading ? (
              <button className={styles.button}>Loading...</button>
            ) : (
              <button className={styles.button} onClick={withdrawDAOEther}>
                Withdraw DAO ETH
              </button>
            )}
          </div>
        ) : (
          ""
        )}
      </div>
      <footer className={styles.footer}>Made with &#10084; Crypto Devs</footer>
    </div>
  );
}
