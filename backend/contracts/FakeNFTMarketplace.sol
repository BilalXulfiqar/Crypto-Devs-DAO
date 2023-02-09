//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FakeNFTMarketplace {
    // purchase function that takes some Eth and marks
    // msg.sender as the owner of someNFT

    // maps token Ids to owners
    mapping(uint256 => address) public tokens;

    uint256 nftPrice = 0.001 ether;

    function purchase(uint256 _tokenId) external payable {
        require(msg.value == nftPrice, "Not enough Eth");
        //require(tokens[_tokenId]) == address(0), "Not for Sale");

        tokens[_tokenId] = msg.sender;
    }

    function getPrice() external view returns (uint256) {
        return nftPrice;
    }

    function available(uint256 _tokenId) external view returns (bool) {
        if (tokens[_tokenId] == address(0)) {
            return true;
        }

        return false;
    }
}
