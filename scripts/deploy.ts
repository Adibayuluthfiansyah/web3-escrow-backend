import {ethers} from "hardhat";

async function main() {
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();

  await escrow.waitForDeployment();
  console.log(`Wait for deployed ${await escrow.getAddress()}`);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
