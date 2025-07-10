import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";
// import { getDataset } from "./functions/getDataset/resource";

export const backend = defineBackend({
    auth,
    addThing,
});