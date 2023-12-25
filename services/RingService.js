const consistentHash = require("consistent-hash");
const grpcConfig = require("../config/grpc");

const createAxiosInstance = require("../config/axios");

const serviceRegistryUrl = `https://www.localhost:9000`;

const registryAxios = createAxiosInstance({
  baseURL: serviceRegistryUrl,
  timeout: 4000,
});

class RingService {
  constructor(config, grpcConfig) {
    this.ringAlgo = config;
    this.grpc = grpcConfig;
  }

  async getServiceRegistryNodes() {
    //This function will get the current service registry for all nodes participating in managing the cellId range from K8s

    //TODO : Check local store for last updated and if more than 5s, update

    const nodes = await registryAxios.get("/services");

    const nodesArray = Array.from(nodes);

    return nodesArray;
  }

  async getServerResponsibleForCell(cell) {
    //TODO : Set this up to check every 5s instead of repeatedly

    const nodesArray = await this.getServiceRegistryNodes();

    //Hash the nodes into a hashring

    const hashring = new this.ringAlgo({
      nodes: nodesArray,
      distribution: "uniform",
    });

    const nodeForCell = hashring.get(cell);

    return nodeForCell;
  }

  async sendCellToServerGRPC(cellData, nodeForCell) {}

  async handleOrForward() {}
}

module.exports = new RingService(consistentHash, grpcConfig);
