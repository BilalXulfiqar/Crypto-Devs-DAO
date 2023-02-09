//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeMarketplace {
    function purchase(uint256 _tokenId) external payable;

    function getPrice() external view returns (uint256);

    function available(uint256 _tokenId) external view returns (bool);
}

interface ICryptoDevsNFT {
    function balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(
        address owner,
        uint256 index
    ) external view returns (uint256);
}

contract CryptoDevsDAO is Ownable {
    enum Vote {
        YAY,
        NAY
    }

    struct Proposal {
        uint256 nftTokenId; // token Id to buy
        uint256 deadline; // when voting ends
        uint256 yayVotes;
        uint256 nayvotes;
        bool executed; // proposal was executed
        mapping(uint256 => bool) voters; // keep track of list of all voters/tokenIds
    }

    // Proposal ID ==> Proposal
    mapping(uint => Proposal) public proposals;
    uint256 public numProposals;

    IFakeMarketplace nftMarketplace;
    ICryptoDevsNFT cryptoDevsNFT;

    constructor(address _nftMarketplace, address _cryptodevsNft) payable {
        nftMarketplace = IFakeMarketplace(_nftMarketplace);
        cryptoDevsNFT = ICryptoDevsNFT(_cryptodevsNft);
    }

    modifier nftHolderOnly() {
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "Not A DAO MEMBER");
        _;
    }

    modifier activeProposalOnly(uint256 proposalId) {
        require(
            proposals[proposalId].deadline > block.timestamp,
            "PROPOSAL_INACTIVE"
        );
        _;
    }

    // voting inactive
    modifier inActiveProposalOnly(uint256 proposalId) {
        require(
            proposals[proposalId].deadline <= block.timestamp,
            "PROPOSAL_ACTIVE"
        );
        require(proposals[proposalId].executed == false, "Already Executed");
        _;
    }

    //create a proposal -memberonly
    //_nftTokenId refers to NFT you to buy from fake nft marketplace
    // returns Id of the newly created proposal
    function createProposal(
        uint256 _nftTokenId
    ) external nftHolderOnly returns (uint256) {
        require(nftMarketplace.available(_nftTokenId), "NFT NOT FOR SALE");

        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 5 minutes;

        numProposals++;
        return numProposals - 1; // send back new proposal Id to Frontend/Whoever calls this funstion
    }

    // vote on a proposal - member only
    function voteOnProposal(
        uint256 proposalId,
        Vote vote
    ) external nftHolderOnly activeProposalOnly(proposalId) {
        Proposal storage proposal = proposals[proposalId];

        uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender);
        uint256 numVotes;

        for (uint256 i = 0; i < voterNFTBalance; ++i) {
            uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false) {
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }

        require(numVotes > 0, "ALREADY VOTED");
        if (vote == Vote.YAY) {
            proposal.yayVotes += numVotes;
        } else {
            proposal.nayvotes += numVotes;
        }
    }

    // execute the prposal-member only

    function executeProposal(
        uint256 proposalIndex
    ) external nftHolderOnly inActiveProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];
        if (proposal.yayVotes > proposal.nayvotes) {
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance > nftPrice, "NOT ENOUGH FUNDS");
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;
    }

    function withdrawEther() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw; contract balance empty");
        payable(owner()).transfer(amount);
    }

    receive() external payable {}

    fallback() external payable {}
}

// fake NFT Marketplace address 0xB3493a0181BedaF273E4B10daD9ff9511f6669A8
//cryptoDevsDAO contract address:0xB9708cC6c7aDf12Bd068fE59D8bBD3E3A2A20076
