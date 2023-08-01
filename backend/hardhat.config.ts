import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    // hardhat: {
    //   forking: {
    //     url: "https://eth.llamarpc.com",
    //     // url: "https://ethereum.publicnode.com",
    //     // url: "https://rpc.ankr.com/eth",
    //     blockNumber: 17819554,
    //   },
    // },
  },
};

export default config;
