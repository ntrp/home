import { App } from "cdktf";
import { HostingStack } from "./components/hosting";
import { initBackend } from "./components/utils";
import { CicdStack } from "./components/cicd";

const app = new App();
const hosting = new HostingStack(app, "hosting-p", {env: "p"});
initBackend(hosting, "p")

const cicd = new CicdStack(app, "cicd", {
  bucketName: hosting.bucketName,
  distributionId: hosting.distributionId,
});
initBackend(cicd, "gbl")

app.synth();
