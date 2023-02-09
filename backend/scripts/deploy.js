const { ethers } = require("hardhat");
const { NFT_CONTRACT_ADDRESS } = require("../constants");
async function main() {
  const fakeNFTMarketplaceContract = await ethers.getContractFactory(
    "FakeNFTMarketplace"
  );

  const deployfakeNFTMarketplace = await fakeNFTMarketplaceContract.deploy();
  await deployfakeNFTMarketplace.deployed();

  console.log(
    `fake NFT Marketplace address ${deployfakeNFTMarketplace.address}`
  );

  const CryptoDevsDAO = await ethers.getContractFactory("CryptoDevsDAO");
  const deployCryptoDevsDAO = await CryptoDevsDAO.deploy(
    deployfakeNFTMarketplace.address,
    NFT_CONTRACT_ADDRESS,
    {
      value: ethers.utils.parseEther("0.01"),
    }
  );
  await deployCryptoDevsDAO.deployed();

  console.log(`cryptoDevsDAO contract address:${deployCryptoDevsDAO.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
