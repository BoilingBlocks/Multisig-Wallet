import { ethers, network } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("MultiSigWalletFactory");

  process.stdout.write("Deploying... ");
  const contract = await factory.deploy();
  process.stdout.write("Done!\n\n");

  if (network.config.chainId === 11155111) {
    process.stdout.write("Awaiting block confirmations... ");
    await contract.deployTransaction.wait(6);
    process.stdout.write("Done!\n\n");
  }

  console.log(`Contract Address: ${contract.address}`);
  console.log(`Deployer Address: ${await contract.signer.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
